import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const MEDIA_URL =
  process.env.NEXT_PUBLIC_MEDIA_URL ?? "https://bekhzodshamsiddinov-png.github.io/Webuy/assets";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

const mediaOrigin = new URL(MEDIA_URL).origin;
const supabaseOrigin = SUPABASE_URL ? new URL(SUPABASE_URL).origin : "";
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:");
const isDev = process.env.NODE_ENV !== "production";

// Content Security Policy. Next.js injects small inline bootstrap scripts, so
// 'unsafe-inline' is required for script-src unless every page is rendered with a
// nonce (which would turn the whole marketing site dynamic). Everything else is
// locked down: no plugins, no framing, no foreign form targets.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net https://mc.yandex.ru`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${mediaOrigin} ${supabaseOrigin} https://www.google-analytics.com https://www.facebook.com https://mc.yandex.ru`,
  `media-src 'self' blob: ${mediaOrigin} ${supabaseOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs} https://www.google-analytics.com https://region1.google-analytics.com https://mc.yandex.ru${isDev ? " ws:" : ""}`,
  "frame-src 'self' https://my.matterport.com https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Local test builds serve media over plain http; never drop this in production.
  ...(MEDIA_URL.startsWith("https://") ? ["upgrade-insecure-requests"] : []),
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [new URL(`${MEDIA_URL}/**`)],
    formats: ["image/avif", "image/webp"],
    // Renders are already web-sized WebP; local e2e runs skip the optimizer.
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === "1",
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // API responses must never be cached by shared caches.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

export default withNextIntl(nextConfig);
