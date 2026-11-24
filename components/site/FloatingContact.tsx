"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { LeadDialogButton } from "./LeadDialog";

/**
 * Always-reachable contact button (bottom right). Expands to call / Telegram /
 * "call me back". Hidden on apartment pages, which have their own sticky bar.
 */
export function FloatingContact({ phoneHref, telegram, salesPhone }: { phoneHref: string | null; telegram: string | null; salesPhone: string }) {
  const t = useTranslations("home");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/xonadon/")) return null;

  return (
    <div
      className={`fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[calc(16px+env(safe-area-inset-bottom,0px))] z-40 flex flex-col items-end gap-2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      {open && (
        <div id="contact-menu" className="flex flex-col items-end gap-2 [animation:fade-up_.25s_ease]">
          {phoneHref && (
            <a href={phoneHref} className="btn btn-fill !min-h-11 shadow-lg">
              {t("call")}
            </a>
          )}
          {telegram && (
            <a href={telegram} target="_blank" rel="noopener noreferrer" className="btn !min-h-11 border-[#2aabee] bg-[#2aabee] text-white shadow-lg">
              {t("telegram")}
            </a>
          )}
          <LeadDialogButton intent="call" label={t("callMe")} salesPhone={salesPhone} className="btn !min-h-11 bg-paper text-ink-1 shadow-lg" />
        </div>
      )}
      <button
        type="button"
        aria-label={t("contactUs")}
        aria-expanded={open}
        aria-controls="contact-menu"
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-[60px] w-[60px] place-items-center rounded-full bg-ink-1 text-paper shadow-[0_10px_30px_rgba(0,0,0,.25)] transition-transform hover:scale-105"
      >
        {!open && <span className="absolute inset-0 rounded-full [animation:ping-soft_2.4s_infinite]" aria-hidden="true" />}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2" />
          )}
        </svg>
      </button>
    </div>
  );
}
