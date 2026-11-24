import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "ru", "en"],
  defaultLocale: "uz",
  // `/` serves Uzbek without a prefix; `/ru`, `/en` carry one.
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
