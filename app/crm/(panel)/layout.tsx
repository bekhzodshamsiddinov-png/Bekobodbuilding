import { CrmShell } from "@/components/crm/CrmShell";
import { requireStaff } from "@/lib/crm/session";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <CrmShell name={staff.name} role={staff.role} demo={staff.demo}>
      {children}
    </CrmShell>
  );
}
