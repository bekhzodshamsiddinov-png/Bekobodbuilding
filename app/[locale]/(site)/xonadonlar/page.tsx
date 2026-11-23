import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApartmentPicker } from "@/components/site/picker/ApartmentPicker";
import type { PickerBuilding, PickerUnit } from "@/components/site/picker/types";
import { SampleNotice } from "@/components/site/SampleNotice";
import { getInventory } from "@/lib/data/inventory";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ bino?: string | string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "picker" });
  return { title: t("eyebrow"), description: t("hint") };
}

export default async function ApartmentsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("picker");
  const inv = await getInventory();
  const sp = await searchParams;
  const wanted = typeof sp.bino === "string" ? sp.bino : "";
  const initial = inv.buildings.some((b) => b.code === wanted) ? wanted : inv.buildings[0]?.code;

  const buildings: PickerBuilding[] = inv.buildings.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    floors: b.floors,
    entrances: b.entrances,
    firstFloor: b.first_residential_floor,
    bands: b.floor_bands,
    facade: b.facade_image,
  }));
  // Slim payload: only what the picker renders.
  const units: PickerUnit[] = inv.apartments.map((a) => ({
    id: a.id,
    slug: a.slug,
    b: a.building_id,
    e: a.entrance,
    f: a.floor,
    no: a.number,
    rooms: a.rooms,
    area: a.area_m2,
    uzs: a.price_uzs,
    usd: a.price_usd,
    st: a.status,
    side: a.orientation,
  }));

  return (
    <section className="pt-[calc(96px+env(safe-area-inset-top,0px))] pb-[clamp(72px,9vw,120px)]">
      <div className="wrap">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow">{t("eyebrow")}</div>
            <h1 className="mt-3 text-[clamp(32px,3.8vw,54px)] leading-[1.04]">{t("title")}</h1>
          </div>
          <p className="m-0 max-w-[40ch] text-[15px] text-muted">{t("hint")}</p>
        </div>
        {initial ? <ApartmentPicker key={initial} buildings={buildings} units={units} initialBuilding={initial} /> : null}
        {inv.sample && <SampleNotice className="mt-8" />}
      </div>
    </section>
  );
}
