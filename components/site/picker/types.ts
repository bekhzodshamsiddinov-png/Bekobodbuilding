import type { ApartmentStatus, FloorBands, Orientation } from "@/lib/types";

export type PickerBuilding = {
  id: string;
  code: string;
  name: string;
  floors: number;
  entrances: number;
  firstFloor: number;
  bands: FloorBands | null;
  facade: string | null;
};

export type PickerUnit = {
  id: string;
  slug: string;
  b: string; // building id
  e: number; // entrance
  f: number; // floor
  no: string;
  rooms: number;
  area: number;
  uzs: number;
  usd: number;
  st: ApartmentStatus;
  side: Orientation;
};

export type Filters = { rooms: number[]; onlyFree: boolean; side: Orientation | "any" };

export const STATUS_BG: Record<ApartmentStatus, string> = {
  free: "bg-free",
  reserved: "bg-reserved",
  sold: "bg-sold",
  hidden: "bg-sold",
};
export const STATUS_TEXT: Record<ApartmentStatus, string> = {
  free: "text-free",
  reserved: "text-reserved",
  sold: "text-sold",
  hidden: "text-sold",
};

export function matches(u: PickerUnit, f: Filters): boolean {
  if (f.onlyFree && u.st !== "free") return false;
  if (f.rooms.length && !f.rooms.includes(Math.min(u.rooms, 3))) return false;
  if (f.side !== "any" && u.side !== f.side) return false;
  return true;
}
