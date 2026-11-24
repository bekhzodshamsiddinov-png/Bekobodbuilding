import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/crm/LoginForm";
import { LogoMark } from "@/components/ui/Logo";
import { getStaff } from "@/lib/crm/session";

export default async function LoginPage() {
  const staff = await getStaff();
  if (staff?.role) redirect("/crm/shaxmatka");
  const t = await getTranslations("crm.login");
  return (
    <main className="grid min-h-svh place-items-center bg-ink px-5 text-paper">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark className="h-8 w-8" />
          <span className="font-display text-[22px] tracking-[0.2em]">SADAF CRM</span>
        </div>
        <h1 className="mb-6 text-[32px]">{t("title")}</h1>
        <LoginForm />
        <p className="mt-6 text-[13px] text-muted-d">{t("note")}</p>
      </div>
    </main>
  );
}
