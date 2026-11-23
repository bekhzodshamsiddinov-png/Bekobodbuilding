# Xavfsizlik modeli

## Qatlamlar

| Qatlam | Himoya |
|---|---|
| HTTP | CSP (`frame-ancestors 'none'`, `object-src 'none'`, `form-action 'self'`), HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, COOP; `X-Powered-By` o'chirilgan; `/api/*` → `Cache-Control: no-store` |
| `/api/leads` | Faqat `application/json`, ≤ 4 KB, boshqa domendan (Origin) kelgan so'rov → 403, IP bo'yicha 5 ta / 10 daqiqa, honeypot maydon, zod validatsiya (ism, `+998` + 9 raqam, UUID, ruxsat etilgan UTM kalitlari) |
| Baza | Hamma jadvalda RLS. Anon faqat katalogni o'qiydi (`hidden` xonadonlarsiz). Arizalar faqat `submit_lead()` orqali: qayta validatsiya, telefon bo'yicha 3 ta / 10 daqiqa, umumiy 300 ta / 10 daqiqa |
| Rollar | Yangi foydalanuvchi rolsiz (hech narsa ko'rmaydi). O'zini ko'tarish taqiqlangan (trigger). Owner rolini faqat owner beradi. Menejer narxni o'zgartira olmaydi. `audit_log` ni API orqali yozib/o'chirib bo'lmaydi |
| Telegram | Webhook `X-Telegram-Bot-Api-Secret-Token` bilan (timing-safe taqqoslash); foydalanuvchi matni HTML-escape qilinadi; token hech qachon log qilinmaydi |
| Kalitlar | Faqat `.env.local` / Vercel env. Brauzerga faqat Supabase URL va publishable (anon) key chiqadi |
| Fayllar | Pasport skanlari xususiy `passports` bucket'da, faqat owner va lawyer |

## Rol matritsasi

| Jadval | owner | sales_head | manager | accountant | lawyer | admin | rolsiz / anon |
|---|---|---|---|---|---|---|---|
| projects, buildings, tours | RW | RW | R | R | R | RW | R |
| apartments | RW | RW | R + holat | R | R | RW | R (hidden'siz) |
| leads | RW | RW | o'ziniki + biriktirilmagan | — | — | RW | faqat `submit_lead()` |
| clients | RW | RW | RW | R | RW | RW | — |
| reservations | RW | RW | o'ziniki | R | R | RW | — |
| deals, payment_plans | RW | RW | R | R / plans RW | RW / plans R | RW | — |
| payments | RW | R | — | RW | — | RW | — |
| audit_log | R | R | — | — | — | R | — |

## Tekshirish

- `pnpm test:db` — 10 ta RLS / biznes qoida testi lokal PostgreSQL'da (`supabase/tests/10_rls.test.sql`).
- `pnpm test:e2e` — headerlar, 404, API validatsiya, Origin, body limit, honeypot, rate limit, webhook secret.

## Ma'lum cheklovlar

- CSP `script-src 'unsafe-inline'` — Next.js inline skriptlari uchun; nonce yoqilsa butun sayt dinamik bo'lib qoladi.
- IP rate limit har server instansida alohida (xotirada). Haqiqiy limit bazada. Trafik oshsa — Upstash/Vercel KV.
- Pasport skanlari uchun jadval darajasida `passport_doc_path` ustuni barcha xodimlarga ko'rinadi (fayl emas, faqat yo'l).
