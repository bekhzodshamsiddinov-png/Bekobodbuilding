import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BuildingShowcase, type ShowcaseBuilding } from "@/components/site/BuildingShowcase";
import { ContactSection } from "@/components/site/ContactSection";
import { HeroVideo } from "@/components/site/HeroVideo";
import { SampleNotice } from "@/components/site/SampleNotice";
import { Link } from "@/i18n/navigation";
import { countByStatus, getInventory } from "@/lib/data/inventory";
import { formatUZS } from "@/lib/format";
import { media } from "@/lib/media";

export const revalidate = 60;

const IMAGES: Record<string, string[]> = {
  b12a: ["b12a-front", "b12a-lawn", "b12a-side", "b12a-back"],
  b12b: ["b12b-wide", "b12b-corner", "b12b-yard", "b12b-court"],
  b16: ["b16-hero", "b16-tower", "b16-street", "b16-far", "b16-pano"],
};

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const inv = await getInventory();
  const counts = countByStatus(inv.apartments);
  const hero = inv.project.hero_media ?? { poster: "vid/hero.jpg", video: "vid/hero.mp4" };
  const maxFloors = Math.max(...inv.buildings.map((b) => b.floors));
  const minFloors = Math.min(...inv.buildings.map((b) => b.floors));

  const showcase: ShowcaseBuilding[] = inv.buildings
    .filter((b): b is typeof b & { code: ShowcaseBuilding["code"] } => b.code in IMAGES)
    .map((b) => {
      const list = inv.apartments.filter((a) => a.building_id === b.id);
      const free = list.filter((a) => a.status === "free");
      const min = free.length ? Math.min(...free.map((a) => a.price_uzs)) : null;
      return {
        code: b.code,
        floors: b.floors,
        entrances: b.entrances,
        total: list.length,
        free: free.length,
        priceFrom: min ? formatUZS(min) : null,
        images: IMAGES[b.code],
      };
    });

  const steps = [
    ["01", t("step1"), t("step1t")],
    ["02", t("step2"), t("step2t")],
    ["03", t("step3"), t("step3t")],
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative h-svh min-h-[600px] overflow-hidden bg-ink-2 text-white">
        <Image src={media(hero.poster)} alt="" fill priority sizes="100vw" className="object-cover" />
        <HeroVideo src={media(hero.video)} poster={media(hero.poster)} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg,rgba(15,16,18,.5) 0%,rgba(15,16,18,0) 28%,rgba(15,16,18,0) 42%,rgba(15,16,18,.84) 100%)",
          }}
        />
        <div className="wrap absolute inset-x-0 bottom-0 z-[2] pb-[calc(48px+env(safe-area-inset-bottom,0px))]">
          <div className="eyebrow !text-bronze-l">{t("eyebrow")}</div>
          <h1 className="mt-[18px] mb-[22px] text-[clamp(52px,10.5vw,168px)] leading-[.92] tracking-[.005em]">
            {inv.project.name}
          </h1>
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-[46ch]">
              <p className="m-0 text-[17px] font-light opacity-90">{t("lead")}</p>
              <p className="mt-5 mb-0 flex items-center gap-2.5 font-mono text-[12px] tracking-[0.14em] uppercase">
                <span className="dot bg-[#7fc48f] shadow-[0_0_0_4px_rgba(127,196,143,.18)]" aria-hidden="true" />
                <span data-testid="free-count">{t("onSale", { n: counts.free })}</span>
              </p>
              <div className="on-dark mt-6 flex flex-wrap gap-2.5">
                <Link href="/xonadonlar" className="btn btn-fill">
                  {t("pick")} →
                </Link>
                <Link href="/sayohat" className="btn btn-ghost !border-white/60">
                  {t("tour")}
                </Link>
              </div>
            </div>
            <dl className="m-0 flex flex-wrap gap-[clamp(22px,4vw,40px)]">
              {[
                [inv.buildings.length, t("factBuildings")],
                [`${minFloors}–${maxFloors}`, t("factFloors")],
                [t("yardValue"), t("factYard")],
              ].map(([v, k]) => (
                <div key={String(k)} className="flex flex-col-reverse border-l border-white/35 pl-4">
                  <dt className="mono-label opacity-80">{k}</dt>
                  <dd className="m-0 font-display text-[clamp(26px,3vw,34px)] leading-[1.1]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute top-1/2 right-[var(--gut-r)] z-[2] hidden items-center gap-3.5 font-mono text-[10px] tracking-[0.3em] uppercase opacity-80 [writing-mode:vertical-rl] md:flex"
        >
          {t("scroll")}
          <i className="block h-[60px] w-px bg-gradient-to-b from-white to-transparent [animation:drip_2.4s_infinite]" />
        </div>
      </section>

      {/* STEPS — what to do here, in plain words */}
      <section className="py-[clamp(72px,9vw,120px)]">
        <div className="wrap">
          <div className="rv">
            <div className="eyebrow">{t("stepsEyebrow")}</div>
            <h2 className="mt-5 text-[clamp(34px,4.2vw,58px)] leading-[1.05]">{t("stepsTitle")}</h2>
          </div>
          <ol className="rv m-0 mt-12 grid list-none gap-px border border-line bg-line p-0 md:grid-cols-3">
            {steps.map(([n, title, text]) => (
              <li key={n} className="bg-paper p-7">
                <span className="font-mono text-[12px] tracking-[0.2em] text-bronze">{n}</span>
                <h3 className="mt-4 mb-2 text-[26px] leading-[1.15]">{title}</h3>
                <p className="m-0 text-[15px] text-muted">{text}</p>
              </li>
            ))}
          </ol>
          <div className="rv mt-8 flex flex-wrap items-center gap-5">
            <Link href="/xonadonlar" className="btn btn-fill">
              {t("pick")} →
            </Link>
            {inv.sample && <SampleNotice className="max-w-[60ch]" />}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="pb-[clamp(84px,11vw,150px)]">
        <div className="wrap grid items-end gap-[clamp(32px,6vw,96px)] md:grid-cols-[1.15fr_1fr]">
          <div className="rv">
            <div className="eyebrow">{t("aboutEyebrow")}</div>
            <h2 className="mt-[22px] text-[clamp(34px,4.6vw,66px)] leading-[1.04]">{t("aboutTitle")}</h2>
          </div>
          <div className="rv text-[17px] text-muted">
            <p className="mt-0 mb-[18px] max-w-[52ch]">{t("aboutP1")}</p>
            <p className="m-0 max-w-[52ch]">{t("aboutP2")}</p>
          </div>
        </div>
      </section>

      {/* BUILDINGS */}
      <section id="uylar" className="scroll-mt-16 bg-ink-1 py-[clamp(84px,11vw,150px)] text-paper">
        <div className="wrap">
          <div className="mb-10">
            <div className="eyebrow">{t("buildingsEyebrow")}</div>
            <h2 className="mt-[18px] text-[clamp(36px,4.6vw,66px)] leading-[1.04]">{t("buildingsTitle")}</h2>
          </div>
          <BuildingShowcase buildings={showcase} />
        </div>
      </section>

      {/* TOUR TEASER */}
      <section className="py-[clamp(84px,11vw,150px)]">
        <div className="wrap">
          <Link
            href="/sayohat"
            className="rv group grid min-h-[440px] overflow-hidden bg-ink-2 text-white no-underline md:grid-cols-2"
          >
            <div className="flex flex-col justify-center gap-[18px] p-[clamp(32px,5vw,72px)]">
              <div className="eyebrow !text-bronze-l">{t("tourEyebrow")}</div>
              <h2 className="text-[clamp(34px,4vw,58px)] leading-[1.04]">{t("tourTitle")}</h2>
              <p className="m-0 max-w-[44ch] text-[#c9c3b9]">{t("tourText")}</p>
              <span className="btn mt-2 self-start group-hover:bg-paper group-hover:text-ink-1">{t("tourCta")} →</span>
            </div>
            <div className="relative min-h-[300px]">
              <Image
                src={media("img/b12b-court.webp")}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 640px"
                className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]"
              />
            </div>
          </Link>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
