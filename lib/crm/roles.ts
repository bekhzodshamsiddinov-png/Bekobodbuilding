import type { StaffRole } from "../types";

// What each role may do in the CRM UI. The database enforces the same rules
// (RLS + triggers); this only decides which controls to show.
export const can = {
  editPrice: (r: StaffRole | null) => r === "owner" || r === "sales_head" || r === "admin",
  editStatus: (r: StaffRole | null) => r === "owner" || r === "sales_head" || r === "admin" || r === "manager",
  seeLeads: (r: StaffRole | null) => r === "owner" || r === "sales_head" || r === "admin" || r === "manager",
  seeAllLeads: (r: StaffRole | null) => r === "owner" || r === "sales_head" || r === "admin",
};
