import { NextResponse, type NextRequest } from "next/server";
import { formatArea, formatUZS } from "@/lib/format";
import { getInventory } from "@/lib/data/inventory";
import { createRateLimiter } from "@/lib/rate-limit";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/server";
import { escapeHtml, isTelegramConfigured, sendTelegram } from "@/lib/telegram";
import { leadSchema, type Lead } from "@/lib/validation/lead";

// Site form → validation → database (submit_lead RPC) → Telegram notification.

const MAX_BODY = 4096;
const perIp = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 });

type Code = "ok" | "invalid" | "rate_limited" | "not_configured" | "forbidden" | "error";
const reply = (code: Code, status: number, extra?: Record<string, unknown>) =>
  NextResponse.json({ ok: code === "ok", code, ...extra }, { status });

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Browsers always send Origin on cross-site POSTs; reject foreign ones. */
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; still rate-limited and validated
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return reply("forbidden", 403);
  if (!req.headers.get("content-type")?.includes("application/json")) return reply("invalid", 415);

  const ip = clientIp(req);
  const limit = perIp(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return reply("invalid", 413);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return reply("invalid", 400);
  }

  const parsed = leadSchema.safeParse(json);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    return reply("invalid", 400, { fields });
  }
  const lead = parsed.data;

  // Honeypot filled → pretend success, store nothing.
  if (lead.website) return reply("ok", 200);

  const db = isSupabaseConfigured();
  const tg = isTelegramConfigured();
  if (!db && !tg) return reply("not_configured", 503);

  let leadId: string | null = null;
  if (db) {
    const { data, error } = await createPublicClient().rpc("submit_lead", {
      p_name: lead.name,
      p_phone: lead.phone,
      p_apartment_id: lead.apartmentId ?? null,
      p_source: lead.source,
      p_utm: lead.utm ?? null,
      p_notes: lead.intent === "book" ? "Saytdan bron so'rovi" : null,
    });
    if (error) {
      if (error.message.includes("rate_limited")) return reply("rate_limited", 429);
      if (error.message.startsWith("invalid_")) return reply("invalid", 400, { fields: [error.message.slice(8)] });
      console.error("leads: submit_lead failed", error.code, error.message);
      return reply("error", 500);
    }
    leadId = data;
  }

  if (tg) {
    try {
      const ok = await sendTelegram(await leadMessage(lead, leadId));
      if (!ok && !db) return reply("error", 502);
    } catch (e) {
      console.error("leads: telegram error", (e as Error).name);
      if (!db) return reply("error", 502);
    }
  }

  return reply("ok", 200);
}

async function leadMessage(lead: Lead, id: string | null): Promise<string> {
  const title = { book: "🔑 Bron so'rovi", ask: "📝 Yangi ariza", call: "📞 Qo'ng'iroq so'rovi" }[lead.intent];
  const lines = [`<b>${title}</b>`, `👤 ${escapeHtml(lead.name)}`, `📱 ${escapeHtml(lead.phone)}`];
  if (lead.apartmentId) {
    const inv = await getInventory().catch(() => null);
    const a = inv?.apartments.find((x) => x.id === lead.apartmentId);
    if (a) {
      const b = inv!.buildings.find((x) => x.id === a.building_id);
      lines.push(
        `🏢 ${escapeHtml(b?.name ?? a.building_code)} · ${a.entrance}-podyezd · ${a.floor}-qavat · №${escapeHtml(a.number)}`,
        `📐 ${a.rooms} xona · ${formatArea(a.area_m2)} · ${formatUZS(a.price_uzs)}`,
        `🔗 /xonadon/${escapeHtml(a.slug)}`,
      );
    }
  }
  if (lead.utm) {
    lines.push(`📊 ${escapeHtml(Object.entries(lead.utm).map(([k, v]) => `${k}=${v}`).join(" "))}`);
  }
  if (id) lines.push(`<code>${id}</code>`);
  return lines.join("\n");
}
