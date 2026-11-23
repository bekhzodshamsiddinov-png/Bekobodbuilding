// Sadaf Residence sample data.
//
// Single source of truth for the demo inventory: the site falls back to it when
// Supabase is not configured, and `pnpm seed:gen` renders the very same rows into
// supabase/seed.sql. Deterministic (seeded PRNG), so both always agree.
import type { Apartment, ApartmentStatus, Building, Orientation, Project } from "../types";

export const DEMO_UPDATED_AT = "2026-11-23T00:00:00.000Z";

/** Deterministic UUID-shaped id: kind digit + running number. */
export function demoId(kind: number, n: number): string {
  return `00000000-0000-4000-800${kind}-${n.toString(16).padStart(12, "0")}`;
}

export const demoProject: Project = {
  id: demoId(1, 1),
  slug: "sadaf-residence",
  name: "Sadaf Residence",
  city: "Bekobod",
  address: "Bekobod shahri (manzil aniqlashtiriladi)",
  status: "selling",
  hero_media: { poster: "vid/hero.jpg", video: "vid/hero.mp4" },
  usd_rate: 12650,
};

export const demoBuildings: Building[] = [
  {
    id: demoId(2, 1),
    project_id: demoProject.id,
    code: "b12a",
    name: "12/1",
    floors: 12,
    entrances: 1,
    first_residential_floor: 1,
    facade_image: "img/b12a-front.webp",
    // Measured on the 1200×1600 front render in Webuy's floor picker.
    floor_bands: { image: "img/b12a-front.webp", width: 1200, height: 1600, y0: 1505, fht: 78, x0: 118, x1: 1108 },
    sort: 1,
  },
  {
    id: demoId(2, 2),
    project_id: demoProject.id,
    code: "b12b",
    name: "12/2",
    floors: 12,
    entrances: 2,
    first_residential_floor: 1,
    facade_image: "img/b12b-wide.webp",
    floor_bands: null,
    sort: 2,
  },
  {
    id: demoId(2, 3),
    project_id: demoProject.id,
    code: "b16",
    name: "16/5",
    floors: 16,
    entrances: 5,
    first_residential_floor: 2, // ground floor is retail
    facade_image: "img/b16-hero.webp",
    floor_bands: null,
    sort: 3,
  },
];

/** Four layouts per floor per entrance: [rooms, m², orientation]. */
export const UNIT_TYPES: ReadonlyArray<readonly [number, number, Orientation]> = [
  [1, 42, "yard"],
  [2, 64, "yard"],
  [3, 86, "street"],
  [2, 68, "street"],
];

const USD_PER_M2 = 640;

export function priceUsd(area: number, floor: number, orientation: Orientation): number {
  let k = 1;
  if (floor <= 2) k -= 0.04;
  else k += Math.min(floor - 3, 10) * 0.006;
  if (orientation === "yard") k += 0.02;
  return Math.round((area * USD_PER_M2 * k) / 100) * 100;
}

export function priceUzs(usd: number, rate: number): number {
  return Math.round((usd * rate) / 1_000_000) * 1_000_000;
}

export function apartmentSlug(code: string, entrance: number, floor: number, unit: number): string {
  return `${code}-p${entrance}-${String(floor).padStart(2, "0")}${String(unit).padStart(2, "0")}`;
}

function generate(): Apartment[] {
  // Same Park–Miller generator Webuy used for its sample floor picker.
  let s = 12;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const out: Apartment[] = [];
  let n = 0;
  for (const b of demoBuildings) {
    for (let e = 1; e <= b.entrances; e++) {
      for (let f = b.first_residential_floor; f <= b.floors; f++) {
        UNIT_TYPES.forEach(([rooms, area, orientation], u) => {
          const x = rnd();
          const status: ApartmentStatus = f === 1 ? "sold" : x < 0.45 ? "free" : x < 0.62 ? "reserved" : "sold";
          const usd = priceUsd(area, f, orientation);
          n += 1;
          out.push({
            id: demoId(3, n),
            building_id: b.id,
            entrance: e,
            floor: f,
            number: `${f}${String(u + 1).padStart(2, "0")}`,
            slug: apartmentSlug(b.code, e, f, u + 1),
            rooms,
            area_m2: area,
            price_usd: usd,
            price_uzs: priceUzs(usd, demoProject.usd_rate),
            status,
            orientation,
            has_balcony: true,
            plan_2d_url: null,
            plan_3d_url: null,
            tour_id: null,
            updated_at: DEMO_UPDATED_AT,
          });
        });
      }
    }
  }
  return out;
}

export const demoApartments: Apartment[] = generate();
