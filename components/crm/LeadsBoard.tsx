"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { claimLead, moveLead, type ActionResult } from "@/app/crm/actions";
import { formatArea, formatDateTime, formatPhone } from "@/lib/format";
import type { CrmLead } from "@/lib/demo/leads";
import { LEAD_STAGES, type LeadStage } from "@/lib/types";

const TOP: Record<LeadStage, string> = {
  new: "border-t-bronze",
  contacted: "border-t-[#5b7fa6]",
  meeting: "border-t-[#7d6aa6]",
  reserved: "border-t-reserved",
  contract: "border-t-free",
  lost: "border-t-sold",
};

/** Kanban of leads. Cards move one stage at a time with buttons (keyboard friendly). */
export function LeadsBoard({ leads: initial, me, seeAll }: { leads: CrmLead[]; me: string; seeAll: boolean }) {
  const t = useTranslations("crm");
  const [leads, setLeads] = useState(initial);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const apply = (r: ActionResult, change: () => void) => {
    if (r.ok) change();
    else setToast(t(`errors.${r.error}`));
  };

  const move = (l: CrmLead, dir: -1 | 1) => {
    const stage = LEAD_STAGES[LEAD_STAGES.indexOf(l.stage) + dir];
    if (!stage) return;
    start(async () => {
      const r = await moveLead({ id: l.id, stage });
      apply(r, () => setLeads((ls) => ls.map((x) => (x.id === l.id ? { ...x, stage, manager_id: seeAll ? x.manager_id : me } : x))));
    });
  };
  const claim = (l: CrmLead) =>
    start(async () => {
      const r = await claimLead({ id: l.id });
      apply(r, () => setLeads((ls) => ls.map((x) => (x.id === l.id ? { ...x, manager_id: me } : x))));
    });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[clamp(28px,3vw,40px)]">{t("leads.title")}</h1>
        <p className="mono-label m-0 text-muted">{t("leads.total", { n: leads.length })}</p>
      </div>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-4" aria-busy={pending}>
        {LEAD_STAGES.map((stage, si) => {
          const col = leads.filter((l) => l.stage === stage);
          return (
            <section key={stage} aria-label={t(`leads.stages.${stage}`)} className={`w-[280px] flex-none snap-start border border-t-4 border-line bg-paper-2/60 ${TOP[stage]}`}>
              <h2 className="flex items-center justify-between px-4 py-3 font-sans text-[14px] font-semibold">
                {t(`leads.stages.${stage}`)}
                <span className="font-mono text-[12px] font-normal text-muted">{col.length}</span>
              </h2>
              <ul className="m-0 grid list-none gap-2 p-2 pt-0">
                {col.length === 0 && <li className="px-2 py-6 text-center text-[13px] text-muted">{t("leads.empty")}</li>}
                {col.map((l) => (
                  <li key={l.id} className="border border-line bg-white p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <b className="text-[15px] font-semibold">{l.name}</b>
                      <span className="mono-label text-muted">{t(`leads.sources.${l.source === "telegram" ? "telegram" : "site"}`)}</span>
                    </div>
                    <a href={`tel:${l.phone}`} className="mt-1 block font-mono text-[13px] text-bronze no-underline">
                      {formatPhone(l.phone)}
                    </a>
                    {l.apartment && (
                      <a href={`/xonadon/${l.apartment.slug}`} target="_blank" rel="noopener" className="mt-2 block text-[12.5px] text-muted underline underline-offset-2">
                        {t("leads.apartment")} №{l.apartment.number} · {l.apartment.rooms}x · {formatArea(l.apartment.area_m2)}
                      </a>
                    )}
                    <p className="m-0 mt-2 font-mono text-[11px] text-muted">
                      {formatDateTime(l.created_at)}
                      {" · "}
                      {l.manager_id === null ? t("leads.unassigned") : l.manager_id === me ? t("leads.mine") : ""}
                    </p>
                    <div className="mt-3 flex gap-1.5">
                      <button type="button" className="chip !min-h-9 flex-1 justify-center !px-2" disabled={si === 0 || pending} onClick={() => move(l, -1)} aria-label={t("leads.back")}>
                        ←
                      </button>
                      {l.manager_id === null && (
                        <button type="button" className="chip !min-h-9 flex-[2] justify-center !px-2 !text-[12px]" disabled={pending} onClick={() => claim(l)}>
                          {t("leads.claim")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="chip !min-h-9 flex-1 justify-center !px-2"
                        disabled={si === LEAD_STAGES.length - 1 || pending}
                        onClick={() => move(l, 1)}
                        aria-label={t("leads.next")}
                      >
                        →
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex justify-center lg:left-[264px]">
        {toast && <p className="m-0 bg-danger px-4 py-3 text-[14px] text-white shadow-lg">{toast}</p>}
      </div>
    </div>
  );
}
