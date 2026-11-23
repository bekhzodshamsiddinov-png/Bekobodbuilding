import "./globals.css";
import Link from "next/link";
import { fontVars } from "./fonts";

// Fallback for URLs outside any locale (rare: the proxy adds the locale).
export default function GlobalNotFound() {
  return (
    <html lang="uz" className={fontVars}>
      <body className="grid min-h-svh place-items-center bg-ink text-paper">
        <main className="wrap text-center">
          <p className="eyebrow justify-center">404</p>
          <h1 className="mt-5 text-5xl">Sahifa topilmadi</h1>
          <Link className="btn btn-fill mt-8" href="/">
            Bosh sahifa
          </Link>
        </main>
      </body>
    </html>
  );
}
