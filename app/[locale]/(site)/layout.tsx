import { setRequestLocale } from "next-intl/server";
import { FloatingContact } from "@/components/site/FloatingContact";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { RevealObserver } from "@/components/site/RevealObserver";
import { site } from "@/lib/site";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Layouts render in parallel with pages, so each one sets the locale for static rendering.
  setRequestLocale((await params).locale);
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <RevealObserver />
      <FloatingContact phoneHref={site.phoneHref} telegram={site.telegram} salesPhone={site.phone} />
    </>
  );
}
