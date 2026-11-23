"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { media } from "@/lib/media";

export type ShowcaseBuilding = {
  code: "b12a" | "b12b" | "b16";
  floors: number;
  entrances: number;
  total: number;
  free: number;
  priceFrom: string | null;
  images: string[];
};

export function BuildingShowcase({ buildings }: { buildings: ShowcaseBuilding[] }) {
  const t = useTranslations("building");
  const th = useTranslations("home");
  const [bi, setBi] = useState(0);
  const [ii, setIi] = useState(0);
  const b = buildings[bi];

  return (
    <div className="on-dark">
      <div role="tablist" aria-label={th("buildingsTitle")} className="mb-8 flex flex-wrap gap-1.5">
        {buildings.map((x, i) => (
          <button
            key={x.code}
            role="tab"
            id={`tab-${x.code}`}
            aria-selected={i === bi}
            aria-controls={`panel-${x.code}`}
            className="chip"
            onClick={() => {
              setBi(i);
              setIi(0);
            }}
          >
            {t(`${x.code}.tab`)}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${b.code}`}
        aria-labelledby={`tab-${b.code}`}
        className="grid items-start gap-[clamp(24px,4vw,56px)] lg:grid-cols-[1.45fr_1fr]"
      >
        <div>
          <div className="relative aspect-[4/3] overflow-hidden bg-ink-2">
            <Image
              key={b.images[ii]}
              src={media(`img/${b.images[ii]}.webp`)}
              alt={t(`${b.code}.name`)}
              fill
              sizes="(max-width: 1024px) 100vw, 760px"
              className="object-cover [animation:fade-up_.5s_ease]"
            />
          </div>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {b.images.map((img, n) => (
              <button
                key={img}
                type="button"
                aria-label={`${t(`${b.code}.name`)} — ${n + 1}`}
                aria-current={n === ii}
                onClick={() => setIi(n)}
                className={`relative aspect-square overflow-hidden transition-opacity ${n === ii ? "opacity-100" : "opacity-55 hover:opacity-100"}`}
              >
                <Image src={media(`img/${img}.webp`)} alt="" fill sizes="150px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="eyebrow !text-bronze-l">{t(`${b.code}.tag`)}</div>
          <h3 className="mt-3.5 mb-4 text-[clamp(30px,3vw,44px)] leading-[1.05]">{t(`${b.code}.name`)}</h3>
          <p className="mt-0 mb-6 text-[#b9b3a9]">{t(`${b.code}.text`)}</p>
          <dl className="m-0 mb-7 grid grid-cols-[auto_1fr] border-t border-line-d">
            {[
              [t("floors"), b.floors],
              [t("entrances"), b.entrances],
              [t("apartments"), b.total],
              [t("onSale"), b.free],
            ].map(([k, v]) => (
              <div key={String(k)} className="contents">
                <dt className="border-b border-line-d py-3.5 pr-6 text-[14.5px] text-muted-d">{k}</dt>
                <dd className="m-0 border-b border-line-d py-3.5 text-right font-mono text-[13.5px]">{v}</dd>
              </div>
            ))}
          </dl>
          {b.priceFrom && <p className="mono-label mb-5 text-bronze-l">{th("priceFrom", { price: b.priceFrom })}</p>}
          <Link href={{ pathname: "/xonadonlar", query: { bino: b.code } }} className="btn btn-fill">
            {th("pickInBuilding")} →
          </Link>
        </div>
      </div>
    </div>
  );
}
