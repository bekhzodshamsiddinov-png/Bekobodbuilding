import { setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { RevealObserver } from "@/components/site/RevealObserver";

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
    </>
  );
}
