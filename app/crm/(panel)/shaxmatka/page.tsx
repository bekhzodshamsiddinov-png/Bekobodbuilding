import type { Metadata } from "next";
import { ChessBoard, type BoardBuilding, type BoardUnit } from "@/components/crm/ChessBoard";
import { getCrmInventory } from "@/lib/crm/data";
import { can } from "@/lib/crm/roles";
import { requireStaff } from "@/lib/crm/session";

export const metadata: Metadata = { title: "Shaxmatka · Sadaf CRM" };

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ bino?: string }> }) {
  const staff = await requireStaff();
  const inv = await getCrmInventory(staff);
  const { bino } = await searchParams;
  const buildings: BoardBuilding[] = inv.buildings.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    floors: b.floors,
    entrances: b.entrances,
    firstFloor: b.first_residential_floor,
  }));
  const units: BoardUnit[] = inv.apartments.map((a) => ({
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
  }));
  const initial = buildings.some((b) => b.code === bino) ? bino! : buildings[0]?.code;
  return (
    <ChessBoard
      key={initial}
      buildings={buildings}
      units={units}
      initialBuilding={initial}
      canPrice={can.editPrice(staff.role)}
      canStatus={can.editStatus(staff.role)}
      usdRate={inv.project.usd_rate}
    />
  );
}
