import { getTranslations } from "next-intl/server";

/** Shown while the site runs on built-in sample data (no database connected). */
export async function SampleNotice({ className = "" }: { className?: string }) {
  const t = await getTranslations("common");
  return (
    <p role="note" className={`mono-label m-0 leading-relaxed tracking-[0.06em] text-muted normal-case ${className}`}>
      ⓘ {t("sample")}
    </p>
  );
}
