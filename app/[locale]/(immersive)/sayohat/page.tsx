import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CinematicTour, type TourBuilding } from "@/components/site/tour/CinematicTour";
import { getInventory } from "@/lib/data/inventory";
import { MEDIA_URL } from "@/lib/media";

type Props = { params: Promise<{ locale: string }> };

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "tour" });
  return { title: t("eyebrow"), description: t("intro") };
}

export default async function TourPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const inv = await getInventory();
  const buildings: TourBuilding[] = inv.buildings
    .filter((b): b is typeof b & { code: TourBuilding["code"] } => ["b12a", "b12b", "b16"].includes(b.code))
    .map((b) => ({
      code: b.code,
      floors: b.floors,
      entrances: b.entrances,
      free: inv.apartments.filter((a) => a.building_id === b.id && a.status === "free").length,
    }));
  return (
    <main>
      <link rel="preload" as="image" href={`${MEDIA_URL}/scn/hero.webp`} />
      <CinematicTour mediaUrl={MEDIA_URL} buildings={buildings} />
    </main>
  );
}
