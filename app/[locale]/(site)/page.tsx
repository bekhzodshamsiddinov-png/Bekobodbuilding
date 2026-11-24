import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Calculator } from "@/components/site/apartment/Calculator";
import { BuildingShowcase, type ShowcaseBuilding } from "@/components/site/BuildingShowcase";
import { ContactSection } from "@/components/site/ContactSection";
import { HeroVideo } from "@/components/site/HeroVideo";
import { Features } from "@/components/site/home/Features";
import { Gallery } from "@/components/site/home/Gallery";
import { InfraVideos, type InfraCard } from "@/components/site/home/InfraVideos";
import { PlansTabs, type PlanType } from "@/components/site/home/PlansTabs";
import { ScrollFilm } from "@/components/site/home/ScrollFilm";
import { SectionHead } from "@/components/site/home/SectionHead";
import { LeadForm } from "@/components/site/LeadForm";
import { SampleNotice } from "@/components/site/SampleNotice";
import { Link } from "@/i18n/navigation";
import { countByStatus, getInventory } from "@/lib/data/inventory";
import { formatUZS } from "@/lib/format";
import { media, MEDIA_URL } from "@/lib/media";
import { site } from "@/lib/site";

export const revalidate = 60;

const IMAGES: Record<string, string[]> = {
  b12a: ["b12a-front", "b12a-lawn", "b12a-side", "b12a-back"],
  b12b: ["b12b-wide", "b12b-corner", "b12b-yard", "b12b-court"],
  b16: ["b16-hero", "b16-tower", "b16-street", "b16-far", "b16-pano"],
};
const GALLERY = [
  "b16-pano", "b12a-front", "b12b-court", "b16-hero", "b12a-lawn", "b12b-wide", "b16-tower",
  "b12a-back", "b12b-yard", "b16-street", "b12a-side", "b12b-corner", "b16-far",
] as const;

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tg = await getTranslations("gallery");
  const tp = await getTranslations("plan");
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
      return { code: b.code, floors: b.floors, entrances: b.entrances, total: list.length, free: free.length, priceFrom: min ? formatUZS(min) : null, images: IMAGES[b.code] };
    });

  // Layout catalogue straight from the inventory: every distinct (rooms, area) pair.
  const planMap = new Map<string, PlanType>();
  for (const a of inv.apartments) {
    const k = `${a.rooms}-${a.area_m2}`;
    const p = planMap.get(k) ?? { rooms: a.rooms, area: a.area_m2, free: 0, minPrice: null };
    if (a.status === "free") {
      p.free += 1;
      p.minPrice = p.minPrice === null ? a.price_uzs : Math.min(p.minPrice, a.price_uzs);
    }
    planMap.set(k, p);
  }
  const plans = [...planMap.values()].sort((x, y) => x.rooms - y.rooms || x.area - y.area);

  const twoRoom = inv.apartments.filter((a) => a.rooms === 2);
  const avgTwoRoom = twoRoom.length ? Math.round(twoRoom.reduce((s, a) => s + a.price_uzs, 0) / twoRoom.length / 1e6) * 1e6 : 0;

  const infra: InfraCard[] = [
    { id: "yard", wide: true, eyebrow: t("s3"), title: t("i1"), text: t("i1t") },
    { id: "play", wide: false, eyebrow: t("s3"), title: t("i2"), text: t("i2t") },
    { id: "shops", wide: false, eyebrow: t("s3"), title: t("i3"), text: t("i3t") },
    { id: "street", wide: true, eyebrow: t("s3"), title: t("i4"), text: t("i4t") },
    { id: "arch", wide: true, eyebrow: t("s3"), title: t("i5"), text: t("i5t") },
    { id: "back", wide: false, eyebrow: t("s3"), title: t("i6"), text: t("i6t") },
  ];

  const steps = [
    ["01", t("step1"), t("step1t")],
    ["02", t("step2"), t("step2t")],
    ["03", t("step3"), t("step3t")],
  ];
  const roomNames = {
    living: tp("living"), bedroom: tp("bedroom"), kids: tp("kids"), kitchen: tp("kitchen"),
    bath: tp("bath"), wc: tp("wc"), hall: tp("hall"), balcony: tp("balcony"),
  };

  return (
    <>
      {/* HERO */}
      <section className="relative h-svh min-h-[600px] overflow-hidden bg-ink-2 text-white">
        <Image src={media(hero.poster)} alt="" fill priority sizes="100vw" className="object-cover" />
        <HeroVideo src={media(hero.video)} poster={media(hero.poster)} />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg,rgba(15,16,18,.5) 0%,rgba(15,16,18,0) 28%,rgba(15,16,18,0) 42%,rgba(15,16,18,.84) 100%)" }}
        />
        <div className="wrap absolute inset-x-0 bottom-0 z-[2] pb-[calc(48px+env(safe-area-inset-bottom,0px))]">
          <div className="eyebrow !text-bronze-l">{t("eyebrow")}</div>
          <h1 className="mt-[18px] mb-[22px] text-[clamp(52px,10.5vw,168px)] leading-[.92] tracking-[.005em]">{inv.project.name}</h1>
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

      {/* KEY NUMBERS */}
      <section aria-label={t("s1")} className="bg-ink-1 text-paper">
        <dl className="wrap m-0 grid grid-cols-2 lg:grid-cols-4">
          {[
            [inv.apartments.length, t("statsApartments")],
            [counts.free, t("statsFree")],
            [inv.buildings.length, t("statsBuildings")],
            [`${minFloors}–${maxFloors}`, t("statsFloors")],
          ].map(([v, k], i) => (
            <div key={String(k)} className={`flex flex-col-reverse py-[clamp(28px,4vw,48px)] ${i % 2 ? "pl-6 lg:pl-8" : "lg:pl-8"} ${i ? "lg:border-l lg:border-line-d" : ""} ${i % 2 ? "border-l border-line-d" : ""}`}>
              <dt className="mt-2 font-mono text-[11px] tracking-[0.18em] text-muted-d uppercase">{k}</dt>
              <dd className="m-0 font-display text-[clamp(44px,5.4vw,80px)] leading-none text-bronze-l">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* FILM 1 — aerial into the courtyard */}
      <ScrollFilm
        base={`${MEDIA_URL}/seq/aerial/`}
        count={121}
        heightVh={380}
        label={t("film1Title")}
        meter={t("s3").toUpperCase()}
        captions={[
          { from: 0, to: 0.34, eyebrow: t("film1Eyebrow"), title: t("film1Title"), text: t("film1Text") },
          { from: 0.34, to: 0.68, eyebrow: t("film2Eyebrow"), title: t("film2Title"), text: t("film2Text") },
          { from: 0.68, to: 1.01, eyebrow: t("film3Eyebrow"), title: t("film3Title"), text: t("film3Text") },
        ]}
      />

      {/* 01 ABOUT + HOW IT WORKS */}
      <section className="py-[clamp(84px,11vw,150px)]">
        <div className="wrap">
          <SectionHead n={1} label={t("s1")} />
          <div className="grid items-end gap-[clamp(32px,6vw,96px)] md:grid-cols-[1.15fr_1fr]">
            <div className="rv">
              <h2 className="text-[clamp(34px,4.6vw,66px)] leading-[1.04]">{t("aboutTitle")}</h2>
            </div>
            <div className="rv text-[17px] text-muted">
              <p className="mt-0 mb-[18px] max-w-[52ch]">{t("aboutP1")}</p>
              <p className="m-0 max-w-[52ch]">{t("aboutP2")}</p>
            </div>
          </div>
          <ol className="rv m-0 mt-14 grid list-none gap-px border border-line bg-line p-0 md:grid-cols-3">
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

      {/* 02 HIGHLIGHTS */}
      <div className="bg-paper-2">
        <Features n={2} />
      </div>

      {/* 03 AMENITIES (videos) */}
      <section className="py-[clamp(84px,11vw,150px)]">
        <div className="wrap">
          <SectionHead n={3} label={t("s3")} />
          <h2 className="rv mb-10 text-[clamp(34px,4.6vw,66px)] leading-[1.04]">{t("infraTitle")}</h2>
          <InfraVideos cards={infra} mediaUrl={MEDIA_URL} />
        </div>
      </section>

      {/* 04 FLOOR PLANS */}
      <section id="rejalar" className="scroll-mt-16 bg-paper-3 py-[clamp(84px,11vw,150px)]">
        <div className="wrap">
          <SectionHead n={4} label={t("s4")} />
          <div className="rv mb-10 text-center">
            <h2 className="text-[clamp(34px,4.6vw,66px)] leading-[1.04]">{t("plansTitle")}</h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-muted">{t("plansLead")}</p>
          </div>
          <PlansTabs plans={plans} salesPhone={site.phone} roomNames={roomNames} />
        </div>
      </section>

      {/* CTA BAND with inline form */}
      <section className="grid bg-paper-2 lg:grid-cols-2">
        <div className="flex items-center px-[var(--gut)] py-[clamp(64px,8vw,120px)] lg:pl-[max(var(--gut),calc((100vw-1320px)/2+20px))]">
          <div className="rv w-full max-w-[480px]">
            <h2 className="text-[clamp(32px,3.6vw,52px)] leading-[1.05]">{t("ctaTitle")}</h2>
            <p className="mt-4 mb-8 text-muted">{t("ctaText")}</p>
            <LeadForm intent="call" salesPhone={site.phone} />
          </div>
        </div>
        <div className="relative min-h-[360px]">
          <Image src={media("img/b12a-back.webp")} alt="" fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
        </div>
      </section>

      {/* 05 BUILDINGS */}
      <section id="uylar" className="scroll-mt-16 bg-ink-1 py-[clamp(84px,11vw,150px)] text-paper">
        <div className="wrap">
          <SectionHead n={5} label={t("s5")} dark />
          <h2 className="mb-10 text-[clamp(36px,4.6vw,66px)] leading-[1.04]">{t("buildingsTitle")}</h2>
          <BuildingShowcase buildings={showcase} />
        </div>
      </section>

      {/* FILM 2 — facade tilt-up */}
      <ScrollFilm
        base={`${MEDIA_URL}/seq/facade/`}
        count={101}
        heightVh={300}
        label={t("film5Title")}
        meter={t("film5Eyebrow").toUpperCase()}
        captions={[
          { from: 0, to: 0.45, eyebrow: t("film4Eyebrow"), title: t("film4Title"), text: t("film4Text") },
          { from: 0.45, to: 1.01, eyebrow: t("film5Eyebrow"), title: t("film5Title"), text: t("film5Text") },
        ]}
      />

      {/* 06 PAYMENT */}
      {avgTwoRoom > 0 && (
        <section className="py-[clamp(84px,11vw,150px)]">
          <div className="wrap">
            <SectionHead n={6} label={t("s6")} />
            <div className="grid items-start gap-[clamp(32px,6vw,96px)] lg:grid-cols-[1fr_minmax(320px,480px)]">
              <div className="rv">
                <h2 className="text-[clamp(34px,4.6vw,66px)] leading-[1.04]">{t("payTitle")}</h2>
                <p className="mt-5 max-w-[48ch] text-[17px] text-muted">{t("payLead")}</p>
                <p className="mono-label mt-6 text-bronze">
                  {t("payAvg")}: {formatUZS(avgTwoRoom)}
                </p>
              </div>
              <div className="rv">
                <Calculator price={avgTwoRoom} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 07 GALLERY */}
      <section className="bg-paper-3 py-[clamp(84px,11vw,150px)]">
        <div className="wrap">
          <SectionHead n={7} label={t("s7")} />
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <h2 className="rv text-[clamp(34px,4.6vw,66px)] leading-[1.04]">{t("galTitle")}</h2>
            <p className="m-0 max-w-[38ch] text-muted">{t("galHint")}</p>
          </div>
          <Gallery items={GALLERY.map((k) => ({ key: k, caption: tg(k) }))} mediaUrl={MEDIA_URL} />
        </div>
      </section>

      {/* 08 TOUR TEASER */}
      <section className="py-[clamp(84px,11vw,150px)]">
        <div className="wrap">
          <SectionHead n={8} label={t("s8")} />
          <Link href="/sayohat" className="rv group grid min-h-[440px] overflow-hidden bg-ink-2 text-white no-underline md:grid-cols-2">
            <div className="flex flex-col justify-center gap-[18px] p-[clamp(32px,5vw,72px)]">
              <div className="eyebrow !text-bronze-l">{t("tourEyebrow")}</div>
              <h2 className="text-[clamp(34px,4vw,58px)] leading-[1.04]">{t("tourTitle")}</h2>
              <p className="m-0 max-w-[44ch] text-[#c9c3b9]">{t("tourText")}</p>
              <span className="btn mt-2 self-start group-hover:bg-paper group-hover:text-ink-1">{t("tourCta")} →</span>
            </div>
            <div className="relative min-h-[300px]">
              <Image src={media("scn/yard.webp")} alt="" fill sizes="(max-width: 768px) 100vw, 640px" className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]" />
            </div>
          </Link>
        </div>
      </section>

      <ContactSection />
    </>
  );
}
