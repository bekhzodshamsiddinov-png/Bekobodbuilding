# CLAUDE.md — Premium qurilish kompaniyasi sayti + CRM

> Bu fayl loyiha ildizida turadi. Claude Code har sessiyada uni o'qiydi. Qarorlar o'zgarsa, shu yerda yangilang.

## Loyiha nima

Qurilish (real estate) kompaniyasi uchun premium sotuv sayti va o'zimizning CRM. Ikkalasi **bitta bazadan** ishlaydi:
narx yoki holat CRM'da bir marta o'zgaradi va sayt, shourum ekrani, Telegram bot — hamma joyda darhol yangilanadi.

- Asos: `Webuy` (Sadaf Residence) namunasi — https://github.com/bekhzodshamsiddinov-png/Webuy
  - `index.html` — video hero, scroll filmlari, qavat tanlash, galereya, forma
  - `sayohat.html` — 9 sahnali kinematik sayohat (hotspotlar, o'tish videolari, bino kartochkalari)
  - `tour.html` — three.js namunaviy 3D sayohat
- Uslubni **saqlaymiz**: to'q fon `#111214`, qog'oz `#eeebe5`, bronza `#a8834f` / `#c9a46b`,
  shriftlar Marcellus (sarlavha), Manrope (matn), IBM Plex Mono (kichik yozuvlar), shisha (glass) panellar.
- Andozalar: Olive Ridge (kvartira tanlash + CRM), Sobha One (360° + filtrlar), ERA / Springs (kinematik uslub),
  Belle Oaks (onlayn bron), Emaar (mijoz kabineti).
- To'liq tahlil va taklif: https://claude.ai/artifact/3rPRyYcB9jRW3d65KZNtYw

## Mijoz yo'li (asosiy oqim)

majmua → bino → podyezd/qavat → xonadon → xona ichida 360° → bron yoki ariza → CRM

Har qadamda bitta asosiy tugma. Har xonadonning o'z URL'i bor: `/[locale]/xonadon/[slug]` (masalan `b16-p3-0704`).

## Texnologiyalar

| Qatlam | Tanlov |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict), React Server Components |
| Stil | Tailwind CSS, dizayn tokenlari `app/globals.css` dagi CSS o'zgaruvchilarda |
| Animatsiya / 3D | GSAP + ScrollTrigger, three.js / React Three Fiber, 360° uchun Marzipano yoki Pannellum |
| Baza / Auth / Fayl | Supabase (PostgreSQL, Auth, Storage, Realtime), RLS majburiy |
| Til (i18n) | next-intl: `uz` (lotin, asosiy), `ru`, `en` |
| Formalar | react-hook-form + zod (server tomonida ham zod bilan tekshiriladi) |
| Hosting | Vercel (sayt + CRM), Cloudflare R2/Stream (video va katta rasmlar) |
| Xabarlar | Telegram Bot API, Eskiz.uz SMS |
| To'lov | Payme, Click (keyingi bosqich) |
| Analitika | GA4, Meta Pixel, Yandex Metrika — `lib/analytics.ts` orqali bitta `track()` funksiyasi |

## Papka tuzilmasi (maqsad)

```
app/
  [locale]/(site)/            # ommaviy sayt
    page.tsx                  # bosh sahifa
    sayohat/page.tsx          # kinematik sayohat
    xonadonlar/page.tsx       # kvartira tanlash (fasad + jadval)
    xonadon/[slug]/page.tsx   # xonadon sahifasi
    aloqa/page.tsx
  crm/                        # CRM panel (faqat xodimlar, auth bilan)
    shaxmatka/ lidlar/ mijozlar/ bronlar/ tolovlar/ hisobotlar/ sozlamalar/
  api/
    leads/route.ts            # saytdan ariza → baza → Telegram
    telegram/webhook/route.ts
components/
  site/  crm/  ui/  three/
lib/
  supabase/ (server.ts, client.ts, types.ts)  analytics.ts  format.ts (so'm/$, m²)
supabase/
  migrations/  seed.sql
messages/ uz.json ru.json en.json
public/assets/ (faqat kichik fayllar; video va katta renderlar CDN'da)
```

## Ma'lumotlar bazasi (birinchi versiya)

```
projects        id, slug, name, city, address, status, hero_media
buildings       id, project_id, code (b12a/b12b/b16), name, floors, entrances, facade_image, floor_bands(jsonb)
apartments      id, building_id, entrance, floor, number, slug, rooms, area_m2, price_uzs, price_usd,
                status (free|reserved|sold|hidden), orientation (yard|street), has_balcony,
                plan_2d_url, plan_3d_url, tour_id, finish_options(jsonb), updated_at
tours           id, kind (panorama|matterport), scenes(jsonb: xonalar, hotspotlar)
leads           id, apartment_id?, name, phone, source, utm(jsonb), stage, manager_id, notes, created_at
clients         id, full_name, phone, email, telegram_id, passport_doc_path (Storage, faqat yurist/rahbar)
reservations    id, apartment_id, client_id, manager_id, expires_at, status
deals           id, apartment_id, client_id, price_final, contract_no, contract_pdf_path, signed_at
payment_plans   id, deal_id, schedule(jsonb), down_payment
payments        id, deal_id, amount, method (cash|payme|click|bank), paid_at
profiles        id (auth.users), full_name, role (owner|sales_head|manager|accountant|lawyer|admin)
audit_log       id, actor_id, table_name, row_id, change(jsonb), created_at
```

Qoidalar:
- Ommaviy sayt `apartments`, `buildings`, `projects`, `tours`ni faqat o'qiydi (anon RLS: `status <> 'hidden'`).
- `leads` ga anon faqat `insert` (server route orqali, rate limit bilan).
- Bron muddati tugasa xonadon avtomatik `free` ga qaytadi (Supabase cron yoki edge function).
- Narx yoki holat o'zgarishi `audit_log` ga yoziladi.

## Ish tartibi va qoidalar

- Interfeys matnlari o'zbek tilida (lotin), `messages/*.json` orqali; kodda o'zbekcha matn qattiq yozilmaydi.
- Narx formati: `1 250 000 000 so'm`, `$ 98 500`; maydon `64,5 m²`.
- Telefon: `+998 XX XXX-XX-XX`, server tomonida 12 raqam tekshiriladi.
- Kalitlar (Supabase service key, Telegram token, Payme) faqat `.env.local` / Vercel env'da, hech qachon kodda va gitda emas.
- Har bir sahifa mobil birinchi: 375 px kenglikda tekshiriladi. LCP < 2,5 s maqsad.
- `prefers-reduced-motion` hurmat qilinadi; barcha tugmalar klaviatura bilan ishlaydi.
- Kichik commitlar, tushunarli xabar. `main` ga to'g'ridan-to'g'ri emas — branch + PR.
- Har bosqich oxirida: `pnpm build` xatosiz, `pnpm lint`, asosiy oqim qo'lda tekshiriladi.

## Bosqichlar

1. **Asos** — Next.js loyiha, dizayn tokenlari, i18n, Supabase ulash, migratsiyalar + seed (Sadaf: 3 bino), Vercel deploy.
2. **Sotuvchi sayt MVP** — bosh sahifa va sayohatni Webuy'dan ko'chirish, kvartira tanlash (3 bino), xonadon sahifasi,
   ariza → `leads` → Telegram, analitika.
3. **CRM yadrosi** — auth + rollar, shaxmatka (narx/holat tahriri, ommaviy narx o'zgartirish), lidlar kanbani,
   mijoz kartasi, bron, rahbar paneli.
4. **Premium tajriba** — 360° interyer, derazadan ko'rinish, pardoz + to'lov kalkulyatori, solishtirish, PDF varaqa,
   shourum ekrani rejimi (`/showroom`), ingliz tili.
5. **Pul va mijoz** — shartnoma shablonlari, bo'lib to'lash grafigi, Payme/Click, SMS, mijoz kabineti.
6. **O'sish** — AI yordamchi (sayt + Telegram), reklama analitikasi, SEO sahifalari.

Hozirgi bosqich: **1 — Asos tayyor, 2 — Sotuvchi sayt MVP asosan tayyor** (bosh sahifa, sayohat, xonadon tanlash,
xonadon sahifasi, ariza → baza → Telegram). Keyingisi: Supabase loyihasini ulash, keyin 3 — CRM yadrosi.

## Qabul qilingan texnik qarorlar (2026-11-23)

- **Next.js 16.4**: `middleware` → `proxy.ts` (next-intl). `cacheComponents` o'chiq — next-intl bilan barqaror
  ishlash uchun; ma'lumot `unstable_cache` + `inventory` tegi bilan keshlanadi (60 s), CRM o'zgartirganda
  `revalidateTag('inventory')` chaqiradi. Yangi API'lardan oldin `node_modules/next/dist/docs/` ni o'qing.
- **Namuna rejimi**: Supabase env bo'lmasa sayt `lib/demo/sadaf.ts` dagi namunaviy ma'lumot bilan ishlaydi va
  "namunaviy ma'lumot" belgisini ko'rsatadi. Env bor-u baza xato bersa — xato sahifasi (xaridorga noto'g'ri holat ko'rsatilmaydi).
  `supabase/seed.sql` shu fayldan `pnpm seed:gen` bilan yasaladi — qo'lda tahrirlanmaydi.
- **Media**: `NEXT_PUBLIC_MEDIA_URL` (hozircha Webuy GitHub Pages; keyin Cloudflare R2). Gitda katta fayl yo'q.
- **Arizalar**: anon `leads` jadvaliga to'g'ridan-to'g'ri yoza olmaydi; faqat `submit_lead()` RPC (SECURITY DEFINER:
  validatsiya + telefon/umumiy rate limit). API qo'shimcha: Origin tekshiruvi, IP limit, honeypot, 4 KB limit.
- **Rollar**: yangi foydalanuvchi `role = NULL` (hech narsa ko'rmaydi) — owner/admin tasdiqlaydi. Menejer narxni
  o'zgartira olmaydi (trigger), faqat holatni. Faqat owner boshqa owner tayinlaydi.
- `sayohat` to'liq ekranli bo'lgani uchun `app/[locale]/(immersive)/sayohat` da (sayt header/footer'isiz).

## Buyruqlar

```bash
pnpm dev            # lokal
pnpm check          # typecheck + lint + unit test + build
pnpm test:db        # migratsiya + seed + RLS testlari (lokal PostgreSQL)
pnpm test:e2e       # build'dan keyin: brauzer smoke + xavfsizlik testlari
pnpm seed:gen       # lib/demo/sadaf.ts → supabase/seed.sql
```

## MCP'lar

- Ulangan: Vercel, Figma, Magic Patterns, GitHub (repo: bekhzodshamsiddinov-png/Bekobodbuilding).
- Ulash kerak: **Supabase** (eng muhimi), Cloudflare; ixtiyoriy Sentry.
- UI/UX maketlari (Magic Patterns): https://www.magicpatterns.com/os/2i3hu4rmp4NfmULA8NDc4V —
  bosh sahifa, xonadonlar, xonadon sahifasi, CRM shaxmatka, CRM lidlar kanbani (desktop + 390 px).
- Jonli sayt (Vercel): https://bekobodbuilding.vercel.app

## Ochiq savollar (buyurtmachidan)

- Kompaniya nomi, loyiha(lar), shahar; bitta loyihami yoki bir nechta?
- Xonadonlar ro'yxati (Excel: bino, podyezd, qavat, raqam, xona, m², narx, holat).
- Bino 3D modeli (GLB/FBX/Revit) va har xonadon turiga 360° render panoramalar (8K).
- Bo'lib to'lash shartlari, hamkor banklar, telefon, manzil, ish vaqti, logotip.

Javob kelguncha Sadaf Residence namunaviy ma'lumotlari bilan ishlanadi (`supabase/seed.sql`).
