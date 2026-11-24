"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { signOut } from "@/app/crm/actions";
import { LogoMark } from "@/components/ui/Logo";
import type { StaffRole } from "@/lib/types";

const NAV = [
  { key: "shaxmatka", href: "/crm/shaxmatka", d: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" },
  { key: "lidlar", href: "/crm/lidlar", d: "M4 5h4v14H4zM10 5h4v9h-4zM16 5h4v6h-4z" },
  { key: "mijozlar", href: null, d: "M8 11a4 4 0 100-8 4 4 0 000 8zM2 21a6 6 0 0112 0M16 3a4 4 0 010 8M18 21a6 6 0 00-3-5" },
  { key: "bronlar", href: null, d: "M7 3v4M17 3v4M3 9h18M4 5h16v16H4z" },
  { key: "tolovlar", href: null, d: "M3 6h18v12H3zM3 10h18M7 15h4" },
  { key: "hisobotlar", href: null, d: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { key: "sozlamalar", href: null, d: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .2-1.5-1.5.2-2-3-1-1 2h-2l-1-2-3 1 .2 2L6.4 7.2 4.4 7 3.4 10l2 1v2l-2 1 1 3 2-.2 1.5 1.5-.2 2 3 1 1-2h2l1 2 3-1-.2-2 1.5-1.5 2 .2 1-3-2-1z" },
] as const;

export function CrmShell({ name, role, demo, children }: { name: string; role: StaffRole; demo: boolean; children: React.ReactNode }) {
  const t = useTranslations("crm");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav aria-label={t("nav.menu")} className="flex flex-1 flex-col gap-1 px-3">
      {NAV.map((n) => {
        const active = n.href && pathname.startsWith(n.href);
        const icon = (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 flex-none" aria-hidden="true">
            <path d={n.d} />
          </svg>
        );
        return n.href ? (
          <Link
            key={n.key}
            href={n.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 px-3 text-[14px] no-underline transition-colors ${
              active ? "bg-bronze text-white" : "text-[#cfc9bf] hover:bg-white/5"
            }`}
          >
            {icon}
            {t(`nav.${n.key}`)}
          </Link>
        ) : (
          <span key={n.key} aria-disabled="true" className="flex min-h-11 items-center gap-3 px-3 text-[14px] text-white/30">
            {icon}
            {t(`nav.${n.key}`)}
            <small className="ml-auto font-mono text-[9px] tracking-[0.12em] uppercase">{t("nav.soon")}</small>
          </span>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col bg-ink py-5 text-paper transition-transform lg:sticky lg:top-0 lg:h-svh lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center gap-3 px-6">
          <LogoMark className="h-7 w-7" />
          <span className="font-display text-[18px] tracking-[0.2em]">SADAF CRM</span>
        </div>
        {nav}
        <div className="mx-3 mt-4 border-t border-line-d px-3 pt-4">
          <p className="m-0 truncate text-[14px]">{name}</p>
          <p className="mono-label mt-1 mb-4 text-bronze-l">{t(`roles.${role}`)}</p>
          <div className="flex gap-2">
            <a href="/" target="_blank" rel="noopener" className="btn on-dark btn-ghost !min-h-9 flex-1 !px-2 !text-[11px]">
              {t("nav.site")}
            </a>
            {!demo && (
              <form action={signOut} className="flex-1">
                <button className="btn on-dark btn-ghost !min-h-9 w-full !px-2 !text-[11px]">{t("nav.logout")}</button>
              </form>
            )}
          </div>
        </div>
      </aside>
      {open && <button aria-label={t("drawer.close")} className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-paper-3/95 px-4 py-3 backdrop-blur lg:hidden">
          <button aria-label={t("nav.menu")} aria-expanded={open} onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6" aria-hidden="true">
              <path d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </button>
          <span className="font-display text-[18px] tracking-[0.16em]">SADAF CRM</span>
        </header>
        {demo && (
          <p role="note" className="m-0 border-b border-bronze/40 bg-[rgba(168,131,79,.12)] px-5 py-2.5 text-[13px] text-ink-1">
            ⓘ {t("demo")}
          </p>
        )}
        <main className="p-[clamp(16px,3vw,36px)]">{children}</main>
      </div>
    </div>
  );
}
