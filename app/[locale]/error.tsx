"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  useEffect(() => {
    console.error(error.digest ?? error.message);
  }, [error]);
  return (
    <main className="on-dark grid min-h-svh place-items-center bg-ink text-paper">
      <div className="wrap text-center">
        <h1 className="text-[clamp(36px,5vw,64px)]">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-muted-d">{t("text")}</p>
        <button type="button" onClick={reset} className="btn btn-fill mt-8">
          {t("retry")}
        </button>
      </div>
    </main>
  );
}
