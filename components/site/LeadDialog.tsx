"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { LeadForm } from "./LeadForm";

type Intent = "book" | "ask" | "call";

/** A button that opens the lead form in a native <dialog> (focus trap + Esc for free). */
export function LeadDialogButton({
  intent,
  apartmentId,
  label,
  summary,
  salesPhone,
  className = "btn btn-fill",
}: {
  intent: Intent;
  apartmentId?: string;
  label: string;
  summary?: string;
  salesPhone: string;
  className?: string;
}) {
  const t = useTranslations("lead");
  const tn = useTranslations("nav");
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const title = intent === "book" ? t("titleBook") : intent === "ask" ? t("titleAsk") : t("titleCall");

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          track("lead_open", { intent });
          setOpen(true);
        }}
      >
        {label}
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        aria-labelledby={`lead-title-${intent}`}
        className="m-auto w-[min(480px,calc(100%-24px))] max-w-none border border-line bg-paper-3 p-0 text-ink-1 backdrop:bg-[rgba(14,15,16,.72)] backdrop:backdrop-blur-sm"
      >
        {open && (
          <div className="p-6 sm:p-9">
            <div className="flex items-start justify-between gap-4">
              <h2 id={`lead-title-${intent}`} className="text-[30px] leading-[1.05]">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={tn("close")}
                className="-mt-1 -mr-2 grid h-11 w-11 flex-none place-items-center text-[26px] leading-none hover:text-bronze"
              >
                ×
              </button>
            </div>
            {summary && (
              <p className="mono-label mt-3 mb-0 text-bronze">
                {t("apartment")}: {summary}
              </p>
            )}
            <p className="mt-3 mb-6 text-[15px] text-muted">{t("text")}</p>
            <LeadForm intent={intent} apartmentId={apartmentId} salesPhone={salesPhone} autoFocus />
          </div>
        )}
      </dialog>
    </>
  );
}
