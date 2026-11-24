import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sendTelegram } from "@/lib/telegram";

// Telegram bot webhook. Register it once with
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
// Telegram then sends the secret in X-Telegram-Bot-Api-Secret-Token on every call.

function validSecret(header: string | null): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface Update {
  message?: { chat?: { id?: number; type?: string }; text?: string };
}

export async function POST(req: NextRequest) {
  if (!validSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return new NextResponse(null, { status: 401 });
  }
  const update = (await req.json().catch(() => ({}))) as Update;
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";

  if (chatId && (text === "/start" || text === "/id")) {
    // Helps the sales team find the chat id to put into TELEGRAM_CHAT_ID.
    await sendTelegram(
      `Assalomu alaykum! Bu Sadaf Residence savdo boti.\nChat ID: <code>${chatId}</code>`,
      String(chatId),
    ).catch(() => false);
  }
  // Always 200 so Telegram does not retry.
  return NextResponse.json({ ok: true });
}
