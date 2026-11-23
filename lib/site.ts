// Sales-office contact details. Set them in Vercel env once the client confirms;
// placeholders keep the layout intact meanwhile.
export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://bekobodbuilding.vercel.app",
  phone: process.env.NEXT_PUBLIC_SALES_PHONE ?? "+998 (__) ___-__-__",
  phoneHref: process.env.NEXT_PUBLIC_SALES_PHONE
    ? `tel:+${process.env.NEXT_PUBLIC_SALES_PHONE.replace(/\D/g, "")}`
    : null,
  address: process.env.NEXT_PUBLIC_SALES_ADDRESS ?? "Bekobod shahri",
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? null,
  short: "SADAF",
};
