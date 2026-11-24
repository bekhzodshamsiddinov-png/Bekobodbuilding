import "server-only";
import { getInventory, type Inventory } from "../data/inventory";
import { demoLeads, type CrmLead } from "../demo/leads";
import { createClient } from "../supabase/server";
import type { Apartment, ApartmentRow, Building, FloorBands } from "../types";
import type { Staff } from "./session";

/** Inventory as staff see it: live (uncached) and including hidden apartments. */
export async function getCrmInventory(staff: Staff): Promise<Inventory> {
  const pub = await getInventory();
  if (staff.demo) return pub;
  const db = await createClient();
  const { data: buildings, error: bErr } = await db
    .from("buildings")
    .select("id, project_id, code, name, floors, entrances, first_residential_floor, facade_image, floor_bands, sort")
    .eq("project_id", pub.project.id)
    .order("sort");
  if (bErr) throw new Error(bErr.message);
  const ids = (buildings ?? []).map((b) => b.id);
  const rows: Apartment[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("apartments")
      .select("id, building_id, entrance, floor, number, slug, rooms, area_m2, price_uzs, price_usd, status, orientation, has_balcony, plan_2d_url, plan_3d_url, tour_id, updated_at")
      .in("building_id", ids)
      .order("floor")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data as Apartment[]));
    if (!data || data.length < 1000) break;
  }
  const bs: Building[] = (buildings ?? []).map((b) => ({ ...b, floor_bands: b.floor_bands as FloorBands | null }));
  const code = new Map(bs.map((b) => [b.id, b.code]));
  const apartments: ApartmentRow[] = rows.map((a) => ({
    ...a,
    area_m2: Number(a.area_m2),
    price_uzs: Number(a.price_uzs),
    price_usd: Number(a.price_usd),
    building_code: code.get(a.building_id) ?? "",
  }));
  return { ...pub, buildings: bs, apartments, sample: false };
}

/** Leads visible to this staff member (RLS narrows managers to their own + unassigned). */
export async function getCrmLeads(staff: Staff): Promise<CrmLead[]> {
  if (staff.demo) return demoLeads;
  const db = await createClient();
  const { data, error } = await db
    .from("leads")
    .select("id, name, phone, source, stage, manager_id, notes, created_at, apartment:apartments(id, slug, number, rooms, area_m2)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CrmLead[];
}
