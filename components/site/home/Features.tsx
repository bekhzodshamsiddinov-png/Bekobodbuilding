import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { media } from "@/lib/media";
import { SectionHead } from "./SectionHead";

const ICONS: Record<string, React.ReactNode> = {
  f1: <path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6M2 20h20" />,
  f2: <path d="M5 21V8m14 13V8M3 8h18M8 8V4h8v4M9 21v-6l3-3 3 3v6" />,
  f3: <path d="M3 9l2-5h14l2 5M3 9v11h18V9M3 9h18M8 20v-6h4v6M15 13h3" />,
  f4: <path d="M5 17h14M6 17l1.5-6h9L18 17M7 17v2M17 17v2M8.5 14h.01M15.5 14h.01M4 11h16" />,
  f5: <path d="M4 21V3h16v18M4 14h16M8 14v7M12 14v7M16 14v7M8 6h8v5H8z" />,
  f6: <path d="M3 21h18M5 21V10h14v11M5 14h14M5 17h14M9 10v4M15 10v4M12 14v3M8 3h8l3 7H5z" />,
};

export async function Features({ n }: { n: number }) {
  const t = await getTranslations("home");
  const keys = ["f1", "f2", "f3", "f4", "f5", "f6"] as const;
  return (
    <section className="py-[clamp(84px,11vw,150px)]">
      <div className="wrap">
        <SectionHead n={n} label={t("s2")} />
        <div className="grid items-stretch gap-1.5 lg:grid-cols-[1fr_1.15fr_1fr]">
          <div className="relative hidden min-h-[520px] overflow-hidden lg:block">
            <Image src={media("img/b12b-court.webp")} alt="" fill sizes="33vw" className="object-cover" />
          </div>
          <div className="on-dark bg-ink-1 p-[clamp(28px,4vw,56px)] text-paper">
            <h2 className="text-[clamp(30px,3.2vw,46px)] leading-[1.05]">{t("featTitle")}</h2>
            <p className="mt-4 mb-9 text-[15px] text-muted-d">{t("featLead")}</p>
            <ul className="m-0 grid list-none gap-x-6 gap-y-7 p-0 sm:grid-cols-2">
              {keys.map((k) => (
                <li key={k} className="rv">
                  <span className="mb-3.5 grid h-12 w-12 place-items-center rounded-full border border-bronze-l/60 text-bronze-l">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                      {ICONS[k]}
                    </svg>
                  </span>
                  <b className="block text-[15px] font-medium">{t(k)}</b>
                  <span className="mt-1 block text-[13.5px] leading-snug text-muted-d">{t(`${k}t`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-1.5">
            <div className="relative min-h-[260px] overflow-hidden">
              <Image src={media("img/b16-street.webp")} alt="" fill sizes="(max-width:1024px) 100vw, 33vw" className="object-cover" />
            </div>
            <div className="relative min-h-[260px] overflow-hidden">
              <Image src={media("img/b12a-lawn.webp")} alt="" fill sizes="(max-width:1024px) 100vw, 33vw" className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
