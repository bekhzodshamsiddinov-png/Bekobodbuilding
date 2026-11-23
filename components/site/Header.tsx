"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { LogoMark, LogoText } from "@/components/ui/Logo";

/**
 * Fixed site header. Over a full-bleed hero (`overlay`) it starts transparent
 * and turns solid after scrolling; on other pages it is solid from the start.
 */
export function Header() {
  const t = useTranslations("nav");
  const tc = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const overlay = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  // Close the mobile menu after navigating.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const solid = !overlay || scrolled || open;
  const links = [
    { href: "/xonadonlar", label: t("apartments") },
    { href: "/sayohat", label: t("tour") },
    { href: "/#uylar", label: t("buildings") },
    { href: "/aloqa", label: t("contact") },
  ] as const;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-5 transition-[background,color,padding,box-shadow] duration-300 ${
        solid
          ? "bg-[rgba(238,235,229,.94)] py-2.5 text-ink-1 shadow-[0_1px_0_var(--line)] backdrop-blur-md"
          : "py-4 text-white"
      }`}
      style={{ paddingLeft: "var(--gut)", paddingRight: "var(--gut-r)" }}
    >
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-paper focus:p-3 focus:text-ink-1">
        {t("skip")}
      </a>
      <Link href="/" className="flex items-center gap-3 no-underline" aria-label={t("home")}>
        <LogoMark />
        <LogoText short="SADAF" sub={tc("residence")} />
      </Link>

      <nav aria-label={t("menu")} className="hidden lg:block">
        <ul className="m-0 flex list-none gap-8 p-0 text-[13.5px] tracking-[0.04em]">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className={`no-underline opacity-85 hover:opacity-100 ${solid ? "hover:text-bronze" : "hover:text-bronze-l"}`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex items-center gap-2">
        <LocaleSwitch current={locale} solid={solid} label={t("language")} />
        <Link
          href="/xonadonlar"
          className={`btn hidden !min-h-0 !px-[18px] !py-[11px] lg:inline-flex ${
            solid ? "hover:!border-ink-1 hover:!bg-ink-1 hover:!text-paper" : "!border-white/60 hover:!bg-white hover:!text-ink-1"
          }`}
        >
          {t("cta")}
        </Link>
        <button
          type="button"
          className="grid h-11 w-11 place-items-center lg:hidden"
          aria-label={open ? t("close") : t("menu")}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[26px] w-[26px]" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-full bg-paper pb-6 text-ink-1 shadow-[0_12px_24px_rgba(0,0,0,.12)] lg:hidden">
          <ul className="wrap m-0 list-none py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block border-b border-line py-3.5 text-[17px] no-underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="wrap pt-4">
            <Link href="/xonadonlar" className="btn btn-fill w-full">
              {t("cta")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function LocaleSwitch({ current, solid, label }: { current: string; solid: boolean; label: string }) {
  const pathname = usePathname();
  return (
    <div role="group" aria-label={label} className="flex font-mono text-[11px] tracking-[0.14em] uppercase">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={pathname}
          locale={l}
          aria-current={l === current ? "true" : undefined}
          className={`grid h-9 min-w-9 place-items-center px-1.5 no-underline transition-opacity ${
            l === current ? (solid ? "text-bronze" : "text-bronze-l") : "opacity-60 hover:opacity-100"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
