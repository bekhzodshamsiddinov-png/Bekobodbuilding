import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/crm/actions";
import { getStaff } from "@/lib/crm/session";

// Signed in, but no role yet: nothing to show until an owner/admin approves.
export default async function WaitingPage() {
  const staff = await getStaff();
  if (!staff) redirect("/crm/login");
  if (staff.role) redirect("/crm/shaxmatka");
  const t = await getTranslations("crm.wait");
  return (
    <main className="grid min-h-svh place-items-center bg-ink px-5 text-center text-paper">
      <div className="max-w-[440px]">
        <h1 className="text-[32px]">{t("title")}</h1>
        <p className="mt-4 text-muted-d">{t("text")}</p>
        <p className="mono-label mt-2 text-bronze-l">{staff.email}</p>
        <form action={signOut} className="mt-8">
          <button className="btn btn-ghost on-dark">{t("logout")}</button>
        </form>
      </div>
    </main>
  );
}
