import { getTranslations } from "next-intl/server";
import { site } from "@/lib/site";

export async function Footer() {
  const t = await getTranslations("footer");
  return (
    <footer className="bg-ink-1 font-mono text-[11.5px] leading-relaxed tracking-[0.06em] text-muted-d">
      <div className="wrap flex flex-wrap justify-between gap-5 py-8" style={{ paddingBottom: "calc(30px + env(safe-area-inset-bottom,0px))" }}>
        <span>
          © {new Date().getFullYear()} Sadaf Residence · {site.address}
        </span>
        <span>{t("note")}</span>
      </div>
    </footer>
  );
}
