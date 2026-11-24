import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Calculator } from "@/components/site/apartment/Calculator";
import { PlanSchematic } from "@/components/site/apartment/PlanSchematic";
import { LeadDialogButton } from "@/components/site/LeadDialog";
import { SampleNotice } from "@/components/site/SampleNotice";
import { Link } from "@/i18n/navigation";
import { getApartmentBySlug } from "@/lib/data/inventory";
import { formatArea, formatUSD, formatUZS } from "@/lib/format";
import { site } from "@/lib/site";

type Props = { params: Promise<{ locale: string; slug: string }> };

// Rendered on first request, then cached and refreshed every minute.
export const revalidate = 60;
export function generateStaticParams() {
  return [];
}

const SLUG = /^[a-z0-9-]{3,64}$/;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!SLUG.test(slug)) return {};
  const data = await getApartmentBySlug(slug);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "apartment" });
  const tc = await getTranslations({ locale, namespace: "common" });
  const a = data.apartment;
  return {
    title: t("metaTitle", { rooms: tc("rooms", { n: a.rooms }), area: formatArea(a.area_m2), building: data.building.name }),
    description: `${tc("floor", { n: a.floor })} · ${formatUZS(a.price_uzs)}`,
    alternates: { canonical: `/xonadon/${a.slug}` },
  };
}

export default async function ApartmentPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!SLUG.test(slug)) notFound();
  const data = await getApartmentBySlug(slug);
  if (!data) notFound();

  const t = await getTranslations("apartment");
  const tc = await getTranslations("common");
  const ts = await getTranslations("status");
  const to = await getTranslations("orientation");
  const tn = await getTranslations("nav");
  const tp = await getTranslations("plan");
  const tb = await getTranslations("building");
  const { apartment: a, building: b, apartments } = data;
  const free = a.status === "free";
  const roomsLabel = tc("rooms", { n: a.rooms });
  const summary = `${b.name} · ${tc("entrance", { n: a.entrance })} · ${tc("floor", { n: a.floor })} · ${tc("apartmentNo", { n: a.number })}`;

  const similar = apartments
    .filter((x) => x.id !== a.id && x.status === "free" && x.rooms === a.rooms)
    .sort((x, y) => Math.abs(x.floor - a.floor) - Math.abs(y.floor - a.floor) || (x.building_id === a.building_id ? -1 : 1))
    .slice(0, 4);

  const specs: [string, string][] = [
    [t("building"), `${b.name} — ${tb(`${b.code}.name` as "b12a.name")}`],
    [t("entrance"), String(a.entrance)],
    [t("floor"), `${a.floor} / ${b.floors}`],
    [t("rooms"), roomsLabel],
    [t("area"), formatArea(a.area_m2)],
    [t("side"), to(a.orientation)],
    [t("balcony"), a.has_balcony ? t("yes") : t("no")],
    [t("pricePerM2"), formatUZS(Math.round(a.price_uzs / a.area_m2))],
  ];

  return (
    <article className="pt-[calc(96px+env(safe-area-inset-top,0px))] pb-[calc(140px+env(safe-area-inset-bottom,0px))] lg:pb-[clamp(72px,9vw,120px)]">
      <div className="wrap">
        <nav aria-label={t("breadcrumbs")} className="mono-label mb-6 text-muted">
          <ol className="m-0 flex list-none flex-wrap gap-2 p-0">
            <li>
              <Link href="/" className="hover:text-bronze">
                {tn("home")}
              </Link>{" "}
              /
            </li>
            <li>
              <Link href={{ pathname: "/xonadonlar", query: { bino: b.code } }} className="hover:text-bronze">
                {tn("apartments")}
              </Link>{" "}
              /
            </li>
            <li aria-current="page" className="text-ink-1">
              {tc("apartmentNo", { n: a.number })}
            </li>
          </ol>
        </nav>

        <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="eyebrow">{summary}</div>
            <h1 className="mt-4 text-[clamp(40px,5.6vw,84px)] leading-[1]">
              {roomsLabel}, {formatArea(a.area_m2)}
            </h1>
          </div>
          <span className={`mono-label inline-flex items-center gap-2 border px-3 py-2 ${free ? "border-free text-free" : "border-line text-muted"}`}>
            <span className={`dot ${free ? "bg-free" : a.status === "reserved" ? "bg-reserved" : "bg-sold"}`} aria-hidden="true" />
            {ts(a.status)}
          </span>
        </header>

        <div className="grid items-start gap-[clamp(28px,5vw,72px)] lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
          <div className="grid gap-8">
            <section aria-labelledby="plan-h">
              <h2 id="plan-h" className="mb-4 text-[28px]">
                {t("plan")}
              </h2>
              <div className="border border-line p-4">
                <PlanSchematic
                  rooms={a.rooms}
                  label={`${t("plan")}: ${roomsLabel}`}
                  names={{
                    living: tp("living"),
                    bedroom: tp("bedroom"),
                    kids: tp("kids"),
                    kitchen: tp("kitchen"),
                    bath: tp("bath"),
                    wc: tp("wc"),
                    hall: tp("hall"),
                    balcony: tp("balcony"),
                  }}
                />
              </div>
              <p className="mt-2 mb-0 text-[13px] text-muted">{t("planNote")}</p>
            </section>

            <section aria-labelledby="tour-h" className="on-dark bg-ink-2 p-7 text-paper">
              <h2 id="tour-h" className="mb-3 text-[28px]">
                {t("tour360")}
              </h2>
              <p className="mt-0 mb-5 max-w-[52ch] text-[#c9c3b9]">{t("tourSoon")}</p>
              <Link href="/sayohat" className="btn btn-ghost">
                {t("tourOpen")} →
              </Link>
            </section>

            <section aria-labelledby="spec-h">
              <h2 id="spec-h" className="mb-4 text-[28px]">
                {t("specs")}
              </h2>
              <dl className="m-0 grid grid-cols-[auto_1fr] border-t border-line">
                {specs.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="border-b border-line py-3.5 pr-6 text-[14.5px] text-muted">{k}</dt>
                    <dd className="m-0 border-b border-line py-3.5 text-right font-mono text-[13.5px]">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <aside className="grid gap-6 lg:sticky lg:top-24">
            <div className="border border-line bg-paper-3 p-6">
              <span className="mono-label text-muted">{t("price")}</span>
              <p className="m-0 mt-1 font-display text-[clamp(32px,3.4vw,44px)] leading-tight" data-testid="price">
                {formatUZS(a.price_uzs)}
              </p>
              <p className="m-0 font-mono text-[14px] text-muted">{formatUSD(a.price_usd)}</p>
              {free ? (
                <div className="mt-6 hidden gap-2.5 lg:grid">
                  <LeadDialogButton intent="book" apartmentId={a.id} label={t("book")} summary={summary} salesPhone={site.phone} className="btn btn-fill w-full" />
                  <LeadDialogButton intent="ask" apartmentId={a.id} label={t("ask")} summary={summary} salesPhone={site.phone} className="btn btn-ghost w-full" />
                </div>
              ) : (
                <p className="mt-5 mb-0 text-[14.5px] text-muted">{t("unavailable")}</p>
              )}
            </div>
            {free && <Calculator price={a.price_uzs} />}
            {data.sample && <SampleNotice />}
          </aside>
        </div>

        {similar.length > 0 && (
          <section aria-labelledby="sim-h" className="mt-[clamp(56px,7vw,96px)]">
            <h2 id="sim-h" className="mb-5 text-[clamp(28px,3vw,40px)]">
              {t("similar")}
            </h2>
            <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 md:grid-cols-4">
              {similar.map((s) => (
                <li key={s.id}>
                  <Link href={`/xonadon/${s.slug}`} className="flex h-full flex-col gap-1 border border-line bg-paper-3 p-4 no-underline hover:border-bronze">
                    <b className="font-display text-[22px] font-normal">{formatArea(s.area_m2)}</b>
                    <span className="text-[13px] text-muted">
                      {data.buildings.find((x) => x.id === s.building_id)?.name} · {tc("floor", { n: s.floor })}
                    </span>
                    <span className="font-mono text-[12.5px]">{formatUZS(s.price_uzs)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Mobile: one primary action always within thumb reach. */}
      {free && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap gap-2 border-t border-line bg-[rgba(238,235,229,.96)] px-[var(--gut)] pt-2.5 pb-[calc(12px+env(safe-area-inset-bottom,0px))] backdrop-blur-md lg:hidden">
          <p className="m-0 flex w-full items-baseline justify-between font-mono text-[13px]">
            <span>{formatUZS(a.price_uzs)}</span>
            <span className="text-muted">{formatUSD(a.price_usd)}</span>
          </p>
          <LeadDialogButton intent="book" apartmentId={a.id} label={t("book")} summary={summary} salesPhone={site.phone} className="btn btn-fill flex-1" />
          <LeadDialogButton intent="ask" apartmentId={a.id} label={t("ask")} summary={summary} salesPhone={site.phone} className="btn btn-ghost flex-1 !px-3" />
        </div>
      )}
    </article>
  );
}
