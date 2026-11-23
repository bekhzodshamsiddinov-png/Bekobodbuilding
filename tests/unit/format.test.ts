import { describe, expect, it } from "vitest";
import { formatArea, formatPhone, formatUSD, formatUZS, isValidUzPhone, monthlyPayment, NBSP } from "@/lib/format";

const sp = (s: string) => s.replaceAll(NBSP, " ");

describe("format", () => {
  it("formats so'm with grouped digits", () => {
    expect(sp(formatUZS(1_250_000_000))).toBe("1 250 000 000 so'm");
    expect(sp(formatUZS(999))).toBe("999 so'm");
  });
  it("formats dollars", () => {
    expect(sp(formatUSD(98_500))).toBe("$ 98 500");
  });
  it("formats area with a decimal comma", () => {
    expect(sp(formatArea(64.5))).toBe("64,5 m²");
    expect(sp(formatArea(64))).toBe("64 m²");
    expect(sp(formatArea(42.04))).toBe("42 m²");
  });
  it("keeps numbers on one line", () => {
    expect(formatUZS(1_000_000)).not.toContain(" ");
  });
});

describe("phone", () => {
  it("accepts 998 + 9 digits in any notation", () => {
    expect(isValidUzPhone("+998 90 123-45-67")).toBe(true);
    expect(isValidUzPhone("998901234567")).toBe(true);
    expect(isValidUzPhone("+998 (90) 123 45 67")).toBe(true);
  });
  it("rejects short, long and foreign numbers", () => {
    expect(isValidUzPhone("+998 90 123")).toBe(false);
    expect(isValidUzPhone("+9989012345678")).toBe(false);
    expect(isValidUzPhone("+7 900 123 45 67")).toBe(false);
    expect(isValidUzPhone("")).toBe(false);
  });
  it("masks while typing", () => {
    expect(formatPhone("+998 ")).toBe("+998");
    expect(formatPhone("99890")).toBe("+998 90");
    expect(formatPhone("998901234567")).toBe("+998 90 123-45-67");
    expect(formatPhone("998901234567999")).toBe("+998 90 123-45-67");
    expect(formatPhone("901234567")).toBe("+998 90 123-45-67");
  });
});

describe("instalments", () => {
  it("splits the rest evenly and rounds up", () => {
    expect(monthlyPayment(1_000_000, 30, 12)).toBe(58_334);
    expect(monthlyPayment(1_200, 0, 12)).toBe(100);
    expect(monthlyPayment(1_200, 100, 12)).toBe(0);
  });
  it("clamps nonsense input", () => {
    expect(monthlyPayment(1_200, -10, 12)).toBe(100);
    expect(monthlyPayment(1_200, 30, 0)).toBe(0);
  });
});
