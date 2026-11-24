"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { signIn } from "@/app/crm/actions";

export function LoginForm() {
  const t = useTranslations("crm.login");
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="grid gap-4">
      <label className="field !text-muted-d">
        {t("email")}
        <input name="email" type="email" required autoComplete="username" className="input" />
      </label>
      <label className="field !text-muted-d">
        {t("password")}
        <input name="password" type="password" required minLength={6} autoComplete="current-password" className="input" />
      </label>
      <button className="btn btn-fill mt-2 w-full" disabled={pending}>
        {pending ? t("sending") : t("submit")}
      </button>
      <p role="alert" className="m-0 min-h-5 text-[14px] text-[#e39a7f]">
        {state?.error === "credentials" ? t("credentials") : state?.error ? t("invalid") : ""}
      </p>
    </form>
  );
}
