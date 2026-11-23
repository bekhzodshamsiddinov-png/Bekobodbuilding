"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { formatUZS, monthlyPayment } from "@/lib/format";

const MONTHS = [12, 24, 36, 48];

export function Calculator({ price }: { price: number }) {
  const t = useTranslations("apartment");
  const id = useId();
  const [down, setDown] = useState(30);
  const [months, setMonths] = useState(24);
  const downSum = Math.round((price * down) / 100);
  const monthly = monthlyPayment(price, down, months);

  return (
    <section aria-labelledby={`${id}-h`} className="border border-line bg-paper-3 p-6">
      <h2 id={`${id}-h`} className="mb-5 text-[26px]">
        {t("calc")}
      </h2>
      <label htmlFor={`${id}-down`} className="field">
        <span className="flex justify-between">
          <span>{t("calcDown")}</span>
          <output htmlFor={`${id}-down`} className="font-mono text-ink-1 normal-case">
            {down}% · {formatUZS(downSum)}
          </output>
        </span>
        <input
          id={`${id}-down`}
          type="range"
          min={20}
          max={90}
          step={5}
          value={down}
          onChange={(e) => setDown(Number(e.target.value))}
          className="h-10 w-full accent-[var(--bronze)]"
        />
      </label>
      <fieldset className="mt-4 border-0 p-0">
        <legend className="field mb-2">{t("calcMonths")}</legend>
        <div className="grid grid-cols-4 gap-1.5">
          {MONTHS.map((m) => (
            <button key={m} type="button" className="chip justify-center !px-2" aria-pressed={m === months} onClick={() => setMonths(m)}>
              {t("calcMonthsValue", { n: m })}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 border-t border-line pt-4">
        <span className="mono-label text-muted">{t("calcMonthly")}</span>
        <p className="m-0 mt-1 font-display text-[34px] leading-tight" aria-live="polite">
          {formatUZS(monthly)}
        </p>
        <p className="mt-2 mb-0 text-[12.5px] text-muted">{t("calcNote")}</p>
      </div>
    </section>
  );
}
