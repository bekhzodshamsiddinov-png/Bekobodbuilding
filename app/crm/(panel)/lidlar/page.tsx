import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LeadsBoard } from "@/components/crm/LeadsBoard";
import { getCrmLeads } from "@/lib/crm/data";
import { can } from "@/lib/crm/roles";
import { requireStaff } from "@/lib/crm/session";

export const metadata: Metadata = { title: "Lidlar · Sadaf CRM" };

export default async function LeadsPage() {
  const staff = await requireStaff();
  if (!can.seeLeads(staff.role)) redirect("/crm/shaxmatka");
  const leads = await getCrmLeads(staff);
  return <LeadsBoard leads={leads} me={staff.id} seeAll={can.seeAllLeads(staff.role)} />;
}
