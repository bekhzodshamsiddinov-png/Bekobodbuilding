import type { LeadStage } from "../types";
import { demoApartments } from "./sadaf";

export type CrmLead = {
  id: string;
  name: string;
  phone: string;
  source: string;
  stage: LeadStage;
  manager_id: string | null;
  notes: string | null;
  created_at: string;
  apartment: { id: string; slug: string; number: string; rooms: number; area_m2: number } | null;
};

// Clearly fictional sample leads for the CRM preview (no database connected).
const NAMES = ["Namuna mijoz 1", "Namuna mijoz 2", "Namuna mijoz 3", "Namuna mijoz 4", "Namuna mijoz 5", "Namuna mijoz 6", "Namuna mijoz 7", "Namuna mijoz 8"];
const STAGES: LeadStage[] = ["new", "new", "contacted", "contacted", "meeting", "reserved", "contract", "lost"];

export const demoLeads: CrmLead[] = NAMES.map((name, i) => {
  const a = demoApartments[(i * 37) % demoApartments.length];
  return {
    id: `00000000-0000-4000-8004-${String(i + 1).padStart(12, "0")}`,
    name,
    phone: `+99890000000${i}`,
    source: i % 3 === 0 ? "telegram" : "site",
    stage: STAGES[i],
    manager_id: i < 2 ? null : "demo",
    notes: null,
    created_at: new Date(Date.UTC(2026, 10, 23, 9 + i, 15)).toISOString(),
    apartment: i % 2 === 0 ? { id: a.id, slug: a.slug, number: a.number, rooms: a.rooms, area_m2: a.area_m2 } : null,
  };
});
