"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { PlanSchematic, type RoomKey } from "@/components/site/apartment/PlanSchematic";
import { LeadDialogButton } from "@/components/site/LeadDialog";
import { Link } from "@/i18n/navigation";
import { formatArea, formatUZS } from "@/lib/format";

export type PlanType = { rooms: number; area: number; free: number; minPrice: number | null };

/** Layout catalogue: tabs by room count, one card per layout with live availability. */
export function PlansTabs({ plans, salesPhone, roomNames }: { plans: PlanType[]; salesPhone: string; roomNames: Record<RoomKey, string> }) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  // 0 = all layouts (default, so the grid is always full)
  const roomsList = [0, ...[...new Set(plans.map((p) => p.rooms))].sort()];
  const [rooms, setRooms] = useState(0);
  const shown = rooms ? plans.filter((p) => p.rooms === rooms) : plans;

  return (
    <div>
      <div role="tablist" aria-label={t("plansTitle")} className="mx-auto mb-10 grid max-w-[860px] grid-cols-2 border border-ink-1 sm:grid-cols-4">
        {roomsList.map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={r === rooms}
            onClick={() => setRooms(r)}
            className={`min-h-14 font-display text-[clamp(16px,1.8vw,22px)] uppercase transition-colors ${
              r === rooms ? "bg-ink-1 text-paper" : "hover:bg-paper-2"
            }`}
          >
            {r ? tc("rooms", { n: r }) : tc("all")}
          </button>
        ))}
      </div>
      <ul className="m-0 grid list-none gap-1.5 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {shown.map((p) => (
          <li key={`${p.rooms}-${p.area}`} className="flex flex-col bg-ink-1 p-3.5 text-paper [animation:fade-up_.45s_ease]">
            <div className="bg-paper-3 p-3">
              <PlanSchematic rooms={p.rooms} label={`${tc("rooms", { n: p.rooms })}, ${formatArea(p.area)}`} names={roomNames} />
            </div>
            <div className="flex flex-1 flex-col items-center px-3 pt-5 pb-2 text-center">
              <h3 className="text-[22px] uppercase">{tc("rooms", { n: p.rooms })}</h3>
              <p className="mt-1 mb-1 font-display text-[28px] leading-tight">{formatArea(p.area)}</p>
              <p className={`mono-label mb-4 ${p.free ? "text-[#8fcf9d]" : "text-muted-d"}`}>
                {p.free ? t("planFree", { n: p.free }) : t("planNone")}
              </p>
              {p.minPrice && <p className="mb-5 font-mono text-[13px] text-bronze-l">{t("planFrom", { price: formatUZS(p.minPrice) })}</p>}
              <div className="on-dark mt-auto grid w-full gap-2">
                {p.free > 0 && (
                  <Link href={{ pathname: "/xonadonlar", query: { xona: Math.min(p.rooms, 3) } }} className="btn btn-fill w-full !min-h-11 !text-[12px]">
                    {t("planSee")} →
                  </Link>
                )}
                <LeadDialogButton
                  intent="ask"
                  label={t("planAsk")}
                  summary={`${tc("rooms", { n: p.rooms })}, ${formatArea(p.area)}`}
                  salesPhone={salesPhone}
                  className="btn btn-ghost w-full !min-h-11 !text-[12px]"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
