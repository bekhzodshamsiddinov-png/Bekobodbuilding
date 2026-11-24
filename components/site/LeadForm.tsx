"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { formatPhone } from "@/lib/format";
import { track } from "@/lib/analytics";
import { leadSchema, pickUtm, type LeadInput } from "@/lib/validation/lead";

type Props = {
  apartmentId?: string | null;
  intent?: "book" | "ask" | "call";
  salesPhone: string;
  onDone?: () => void;
  autoFocus?: boolean;
};

type Result = { kind: "ok"; name: string } | { kind: "err"; key: "errRate" | "errOffline" | "errGeneric" } | null;

export function LeadForm({ apartmentId = null, intent = "call", salesPhone, autoFocus }: Props) {
  const t = useTranslations("lead");
  const uid = useId();
  const [result, setResult] = useState<Result>(null);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: "", phone: "+998 ", apartmentId, intent, source: "site", website: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setResult(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...values, utm: pickUtm(window.location.search) }),
      });
      if (res.ok) {
        track("lead_submit", { intent, apartment: Boolean(apartmentId) });
        setResult({ kind: "ok", name: values.name.trim() });
        reset({ name: "", phone: "+998 ", apartmentId, intent, source: "site", website: "" });
        return;
      }
      setResult({ kind: "err", key: res.status === 429 ? "errRate" : res.status === 503 ? "errOffline" : "errGeneric" });
    } catch {
      setResult({ kind: "err", key: "errGeneric" });
    }
  });

  const phoneField = register("phone");

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4" aria-describedby={`${uid}-consent`}>
      <label className="field" htmlFor={`${uid}-name`}>
        {t("name")}
        <input
          id={`${uid}-name`}
          className="input"
          autoComplete="name"
          placeholder={t("namePh")}
          autoFocus={autoFocus}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${uid}-name-err` : undefined}
          {...register("name")}
        />
        {errors.name && (
          <span id={`${uid}-name-err`} className="text-[13px] tracking-normal normal-case text-danger">
            {t("errName")}
          </span>
        )}
      </label>
      <label className="field" htmlFor={`${uid}-phone`}>
        {t("phone")}
        <input
          id={`${uid}-phone`}
          className="input font-mono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? `${uid}-phone-err` : undefined}
          {...phoneField}
          onChange={(e) => {
            setValue("phone", formatPhone(e.target.value), { shouldValidate: Boolean(errors.phone) });
          }}
        />
        {errors.phone && (
          <span id={`${uid}-phone-err`} className="text-[13px] tracking-normal normal-case text-danger">
            {t("errPhone")}
          </span>
        )}
      </label>
      {/* Honeypot: hidden from people and assistive tech, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>
      <button className="btn btn-fill w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("sending") : t("submit")}
      </button>
      <p id={`${uid}-consent`} className="m-0 text-[12px] leading-snug text-muted">
        {t("consent")}
      </p>
      <p role="status" aria-live="polite" className="m-0 text-[14.5px]">
        {result?.kind === "ok" && <span className="text-free">{t("ok", { name: result.name })}</span>}
        {result?.kind === "err" && <span className="text-danger">{t(result.key, { phone: salesPhone })}</span>}
      </p>
    </form>
  );
}
