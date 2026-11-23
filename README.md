# Bekobod Building — Sadaf Residence sayti + CRM

Premium sotuv sayti va CRM, bitta Supabase bazasidan. Uslub va media — [Webuy](https://github.com/bekhzodshamsiddinov-png/Webuy) namunasidan.

**Mijoz yo'li:** majmua → bino → podyezd/qavat → xonadon → 360° → bron yoki ariza → CRM.

## Nima tayyor

| Sahifa | Yo'l |
|---|---|
| Bosh sahifa: video hero, jonli "Sotuvda N ta xonadon", 3 qadam, binolar, sayohat, forma | `/` |
| Xonadon tanlash: fasad (qavat bandlari), sxematik fasad (ko'p podyezdli uylar), shaxmatka, ro'yxat, filtrlar | `/xonadonlar?bino=b16` |
| Xonadon sahifasi: reja, xususiyatlar, narx (so'm/$), bo'lib to'lash kalkulyatori, Bron / Ariza, o'xshashlar | `/xonadon/b16-p3-0704` |
| 9 sahnali kinematik sayohat (hotspotlar, o'tish videolari, bino kartalari, `#yard` havolalari) | `/sayohat` |
| Aloqa | `/aloqa` |
| Tillar | `/` (uz), `/ru`, `/en` |
| API | `POST /api/leads`, `POST /api/telegram/webhook`, `GET /api/health` |

## Ishga tushirish

```bash
pnpm install
cp .env.example .env.local   # Supabase/Telegram bo'lmasa sayt namunaviy ma'lumot bilan ishlaydi
pnpm dev
```

## Supabase ulash

1. supabase.com da loyiha yarating (region: Frankfurt / `eu-central-1`).
2. SQL Editor'da tartib bilan: `supabase/migrations/*.sql`, keyin `supabase/seed.sql`.
   (Yoki: `supabase link --project-ref <id> && supabase db push`.)
3. Database → Extensions → `pg_cron` ni yoqing (bron muddati tugaganda xonadon avtomatik bo'shaydi).
4. Authentication → Sign-ups: ochiq ro'yxatdan o'tishni o'chiring; xodimlarni taklif orqali qo'shing,
   so'ng `profiles.role` ni belgilang (birinchi owner'ni SQL Editor'da: `update profiles set role='owner' where id='…'`).
5. Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Telegram

1. @BotFather → yangi bot → `TELEGRAM_BOT_TOKEN`.
2. `TELEGRAM_WEBHOOK_SECRET` — tasodifiy satr. Webhook:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SAYT>/api/telegram/webhook&secret_token=<SECRET>`
3. Botni savdo guruhiga qo'shing, guruhda `/id` yozing → `TELEGRAM_CHAT_ID`.

## Tekshiruvlar

```bash
pnpm check      # typecheck + lint + 22 unit test + build
pnpm test:db    # 10 ta RLS/biznes qoida testi (lokal PostgreSQL 16)
pnpm build && pnpm test:e2e   # 13 ta brauzer + xavfsizlik testi, 375px va 1440px skrinshotlar
```

Xavfsizlik modeli: [docs/SECURITY.md](docs/SECURITY.md). Loyiha qoidalari va qarorlar: [CLAUDE.md](CLAUDE.md).
