"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVENTORY_TAG } from "@/lib/data/inventory";
import { can } from "@/lib/crm/roles";
import { getStaff } from "@/lib/crm/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { APARTMENT_STATUSES, LEAD_STAGES } from "@/lib/types";

// Every action re-checks the session and role; the database (RLS + triggers)
// enforces the same rules again, so a forged request cannot do more.

export type ActionResult = { ok: true; demo?: boolean; count?: number } | { ok: false; error: "auth" | "forbidden" | "invalid" | "failed" };

async function staffOr(check: (r: Parameters<typeof can.editPrice>[0]) => boolean) {
  const staff = await getStaff();
  if (!staff) return { error: "auth" as const };
  if (!check(staff.role)) return { error: "forbidden" as const };
  return { staff };
}

function dbError(e: { code?: string; message: string }): ActionResult {
  if (e.code === "42501" || /forbidden|row-level security/i.test(e.message)) return { ok: false, error: "forbidden" };
  if (e.code === "22023" || e.code === "23514") return { ok: false, error: "invalid" };
  console.error("crm action failed", e.code, e.message);
  return { ok: false, error: "failed" };
}

/* ---------------------------------------------------------------- auth */
const loginSchema = z.object({ email: z.email().max(200), password: z.string().min(6).max(200) });

export async function signIn(_prev: { error?: string } | null, form: FormData): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) redirect("/crm/shaxmatka");
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "invalid" };
  const db = await createClient();
  const { error } = await db.auth.signInWithPassword(parsed.data);
  // Same message for unknown email and wrong password (no account enumeration).
  if (error) return { error: "credentials" };
  redirect("/crm/shaxmatka");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const db = await createClient();
    await db.auth.signOut();
  }
  redirect("/crm/login");
}

/* ---------------------------------------------------------------- apartments */
const updateSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(APARTMENT_STATUSES).optional(),
    price_uzs: z.number().int().min(0).max(1e13).optional(),
    price_usd: z.number().min(0).max(1e9).optional(),
  })
  .refine((v) => v.status !== undefined || v.price_uzs !== undefined || v.price_usd !== undefined);

export async function updateApartment(input: z.input<typeof updateSchema>): Promise<ActionResult> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const changesPrice = parsed.data.price_uzs !== undefined || parsed.data.price_usd !== undefined;
  const s = await staffOr(changesPrice ? can.editPrice : can.editStatus);
  if ("error" in s) return { ok: false, error: s.error! };
  if (s.staff.demo) return { ok: true, demo: true };

  const { id, ...patch } = parsed.data;
  const db = await createClient();
  const { error, count } = await db.from("apartments").update(patch, { count: "exact" }).eq("id", id);
  if (error) return dbError(error);
  if (!count) return { ok: false, error: "forbidden" };
  updateTag(INVENTORY_TAG);
  return { ok: true, count };
}

const bulkSchema = z.object({
  buildingId: z.uuid(),
  percent: z.number().min(-50).max(50).refine((n) => n !== 0),
  onlyFree: z.boolean(),
  rooms: z.number().int().min(1).max(10).nullable(),
});

export async function bulkReprice(input: z.input<typeof bulkSchema>): Promise<ActionResult> {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const s = await staffOr(can.editPrice);
  if ("error" in s) return { ok: false, error: s.error! };
  if (s.staff.demo) return { ok: true, demo: true };
  const db = await createClient();
  const { data, error } = await db.rpc("bulk_reprice", {
    p_building_id: parsed.data.buildingId,
    p_percent: parsed.data.percent,
    p_only_free: parsed.data.onlyFree,
    p_rooms: parsed.data.rooms,
  });
  if (error) return dbError(error);
  updateTag(INVENTORY_TAG);
  return { ok: true, count: data ?? 0 };
}

/* ---------------------------------------------------------------- leads */
const moveSchema = z.object({ id: z.uuid(), stage: z.enum(LEAD_STAGES) });

export async function moveLead(input: z.input<typeof moveSchema>): Promise<ActionResult> {
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const s = await staffOr(can.seeLeads);
  if ("error" in s) return { ok: false, error: s.error! };
  if (s.staff.demo) return { ok: true, demo: true };
  const db = await createClient();
  // A manager moving an unassigned lead takes ownership of it.
  const patch = can.seeAllLeads(s.staff.role) ? { stage: parsed.data.stage } : { stage: parsed.data.stage, manager_id: s.staff.id };
  const { error, count } = await db.from("leads").update(patch, { count: "exact" }).eq("id", parsed.data.id);
  if (error) return dbError(error);
  return count ? { ok: true } : { ok: false, error: "forbidden" };
}

export async function claimLead(input: { id: string }): Promise<ActionResult> {
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const s = await staffOr(can.seeLeads);
  if ("error" in s) return { ok: false, error: s.error! };
  if (s.staff.demo) return { ok: true, demo: true };
  const db = await createClient();
  const { error, count } = await db
    .from("leads")
    .update({ manager_id: s.staff.id }, { count: "exact" })
    .eq("id", parsed.data.id)
    .is("manager_id", null);
  if (error) return dbError(error);
  return count ? { ok: true } : { ok: false, error: "forbidden" };
}
