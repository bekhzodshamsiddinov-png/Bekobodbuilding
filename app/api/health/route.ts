import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isTelegramConfigured } from "@/lib/telegram";

// Integration status for uptime checks. Reports only booleans — never values.
export function GET() {
  return NextResponse.json({
    ok: true,
    integrations: {
      supabase: isSupabaseConfigured(),
      telegram: isTelegramConfigured(),
      telegramWebhook: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
    },
  });
}
