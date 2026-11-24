import "../globals.css";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { fontVars } from "../fonts";

// Staff panel root layout. Always Uzbek; never indexed.
export const metadata: Metadata = {
  title: "Sadaf CRM",
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};

export default function CrmRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={fontVars}>
      <body className="bg-paper-3">
        <NextIntlClientProvider locale="uz">{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
