import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="on-dark grid min-h-svh place-items-center bg-ink text-paper">
      <div className="wrap text-center">
        <p className="eyebrow justify-center">404</p>
        <h1 className="mt-5 text-[clamp(40px,6vw,80px)]">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-muted-d">{t("text")}</p>
        <Link href="/" className="btn btn-fill mt-8">
          {t("cta")}
        </Link>
      </div>
    </main>
  );
}
