import "server-only";
import { unstable_cache } from "next/cache";
import { demoApartments, demoBuildings, demoProject } from "../demo/sadaf";
import { isSupabaseConfigured } from "../supabase/env";
import { createPublicClient } from "../supabase/server";
import type { Apartment, ApartmentRow, Building, FloorBands, Project } from "../types";

/** Cache tag busted by the CRM whenever a price or status changes. */
export const INVENTORY_TAG = "inventory";

export interface Inventory {
  project: Project;
  buildings: Building[];
  apartments: ApartmentRow[];
  /** true when the data is the built-in Sadaf sample, not the live database. */
  sample: boolean;
}

const PROJECT_SLUG = process.env.PROJECT_SLUG ?? "sadaf-residence";
const PAGE = 1000;

function withCodes(buildings: Building[], apartments: Apartment[]): ApartmentRow[] {
  const codes = new Map(buildings.map((b) => [b.id, b.code]));
  return apartments
    .filter((a) => a.status !== "hidden")
    .map((a) => ({ ...a, building_code: codes.get(a.building_id) ?? "" }));
}

async function loadFromSupabase(): Promise<Inventory> {
  const db = createPublicClient();
  const { data: project, error: pErr } = await db
    .from("projects")
    .select("id, slug, name, city, address, status, hero_media, usd_rate")
    .eq("slug", PROJECT_SLUG)
    .single();
  if (pErr || !project) throw new Error(`projects: ${pErr?.message ?? "not found"}`);

  const { data: buildings, error: bErr } = await db
    .from("buildings")
    .select("id, project_id, code, name, floors, entrances, first_residential_floor, facade_image, floor_bands, sort")
    .eq("project_id", project.id)
    .order("sort");
  if (bErr || !buildings) throw new Error(`buildings: ${bErr?.message}`);

  const apartments: Apartment[] = [];
  const ids = buildings.map((b) => b.id);
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("apartments")
      .select(
        "id, building_id, entrance, floor, number, slug, rooms, area_m2, price_uzs, price_usd, status, orientation, has_balcony, plan_2d_url, plan_3d_url, tour_id, updated_at",
      )
      .in("building_id", ids)
      .order("building_id")
      .order("entrance")
      .order("floor")
      .order("number")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`apartments: ${error.message}`);
    apartments.push(...(data as Apartment[]));
    if (!data || data.length < PAGE) break;
  }

  const typedBuildings: Building[] = buildings.map((b) => ({ ...b, floor_bands: b.floor_bands as FloorBands | null }));
  return {
    project: { ...project, hero_media: project.hero_media as Project["hero_media"], usd_rate: Number(project.usd_rate) },
    buildings: typedBuildings,
    apartments: withCodes(
      typedBuildings,
      apartments.map((a) => ({ ...a, area_m2: Number(a.area_m2), price_uzs: Number(a.price_uzs), price_usd: Number(a.price_usd) })),
    ),
    sample: false,
  };
}

const cachedInventory = unstable_cache(loadFromSupabase, ["inventory-v1"], {
  tags: [INVENTORY_TAG],
  revalidate: 60,
});

/**
 * Whole sales inventory of the current project. Live data when Supabase is
 * configured (cached for 60 s and busted by the CRM), the Sadaf sample otherwise.
 * A configured-but-failing database throws instead of silently showing sample
 * statuses to buyers.
 */
export async function getInventory(): Promise<Inventory> {
  if (!isSupabaseConfigured()) {
    return {
      project: demoProject,
      buildings: demoBuildings,
      apartments: withCodes(demoBuildings, demoApartments),
      sample: true,
    };
  }
  return cachedInventory();
}

export async function getApartmentBySlug(slug: string) {
  const inv = await getInventory();
  const apartment = inv.apartments.find((a) => a.slug === slug);
  if (!apartment) return null;
  const building = inv.buildings.find((b) => b.id === apartment.building_id)!;
  return { ...inv, apartment, building };
}

export function countByStatus(apartments: ApartmentRow[]) {
  const c = { free: 0, reserved: 0, sold: 0 };
  for (const a of apartments) if (a.status in c) c[a.status as keyof typeof c] += 1;
  return c;
}
