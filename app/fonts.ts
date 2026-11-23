import { IBM_Plex_Mono, Manrope, Marcellus } from "next/font/google";

export const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-marcellus",
  display: "swap",
});

export const manrope = Manrope({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const fontVars = `${marcellus.variable} ${manrope.variable} ${plexMono.variable}`;
