import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demoApartments, demoBuildings } from "@/lib/demo/sadaf";

describe("Sadaf sample inventory", () => {
  it("has 3 buildings with the expected shape", () => {
    expect(demoBuildings.map((b) => [b.code, b.floors, b.entrances])).toEqual([
      ["b12a", 12, 1],
      ["b12b", 12, 2],
      ["b16", 16, 5],
    ]);
  });
  it("has 4 layouts per floor per entrance (16/5 ground floor is retail)", () => {
    expect(demoApartments).toHaveLength(12 * 4 + 12 * 2 * 4 + 15 * 5 * 4);
    expect(new Set(demoApartments.map((a) => a.area_m2))).toEqual(new Set([42, 64, 86, 68]));
    expect(demoApartments.some((a) => a.slug.startsWith("b16-") && a.floor === 1)).toBe(false);
  });
  it("uses unique, URL-safe slugs like b16-p3-0704", () => {
    const slugs = demoApartments.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((s) => /^[a-z0-9]+-p\d+-\d{4}$/.test(s))).toBe(true);
    expect(slugs).toContain("b16-p3-0704");
  });
  it("mixes statuses and keeps prices positive", () => {
    const st = new Set(demoApartments.map((a) => a.status));
    expect(st).toEqual(new Set(["free", "reserved", "sold"]));
    expect(demoApartments.every((a) => a.price_uzs > 0 && a.price_usd > 0)).toBe(true);
  });
  it("matches supabase/seed.sql (run `pnpm seed:gen` after changing the sample)", () => {
    const sql = readFileSync(new URL("../../supabase/seed.sql", import.meta.url), "utf8");
    for (const a of [demoApartments[0], demoApartments[200], demoApartments.at(-1)!]) {
      expect(sql).toContain(`'${a.slug}', ${a.rooms}, ${a.area_m2}, ${a.price_uzs}, ${a.price_usd}, '${a.status}'`);
    }
  });
});
