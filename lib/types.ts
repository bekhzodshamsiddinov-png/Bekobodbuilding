// Domain types shared by the public site, the API and the CRM.
// They mirror supabase/migrations/0001_schema.sql — keep both in sync.

export const APARTMENT_STATUSES = ["free", "reserved", "sold", "hidden"] as const;
export type ApartmentStatus = (typeof APARTMENT_STATUSES)[number];
export type Orientation = "yard" | "street";

export const STAFF_ROLES = ["owner", "sales_head", "manager", "accountant", "lawyer", "admin"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const LEAD_STAGES = ["new", "contacted", "meeting", "reserved", "contract", "lost"] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export interface FloorBands {
  /** Facade render, relative to the media base URL. */
  image: string;
  /** SVG viewBox the bands were measured in. */
  width: number;
  height: number;
  /** y of the bottom edge of floor 1, floor height, horizontal extent. */
  y0: number;
  fht: number;
  x0: number;
  x1: number;
}

export interface Project {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  status: string;
  hero_media: { poster: string; video: string } | null;
  usd_rate: number;
}

export interface Building {
  id: string;
  project_id: string;
  code: string; // b12a | b12b | b16
  name: string;
  floors: number;
  entrances: number;
  first_residential_floor: number;
  facade_image: string | null;
  floor_bands: FloorBands | null;
  sort: number;
}

export interface Apartment {
  id: string;
  building_id: string;
  entrance: number;
  floor: number;
  number: string;
  slug: string;
  rooms: number;
  area_m2: number;
  price_uzs: number;
  price_usd: number;
  status: ApartmentStatus;
  orientation: Orientation;
  has_balcony: boolean;
  plan_2d_url: string | null;
  plan_3d_url: string | null;
  tour_id: string | null;
  updated_at: string;
}

/** Apartment with its building code, as used by listing UIs. */
export interface ApartmentRow extends Apartment {
  building_code: string;
}
