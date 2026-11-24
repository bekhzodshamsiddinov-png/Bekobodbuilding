// Formatting helpers. Spaces between digit groups are non-breaking (U+00A0)
// so prices never wrap in the middle of a number.
export const NBSP = " ";

function groupDigits(n: number): string {
  const sign = n < 0 ? "-" : "";
  const digits = Math.round(Math.abs(n)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 1250000000 → "1 250 000 000 so'm" */
export function formatUZS(n: number, unit = "so'm"): string {
  return `${groupDigits(n)}${NBSP}${unit}`;
}

/** 98500 → "$ 98 500" */
export function formatUSD(n: number): string {
  return `$${NBSP}${groupDigits(n)}`;
}

/** 64.5 → "64,5 m²", 64 → "64 m²" */
export function formatArea(m2: number): string {
  const rounded = Math.round(m2 * 10) / 10;
  const s = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
  return `${s}${NBSP}m²`;
}

/** Keeps only digits. "+998 (90) 123-45-67" → "998901234567" */
export function phoneDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/** Uzbek numbers: 998 + 9 digits. */
export function isValidUzPhone(input: string): boolean {
  return /^998\d{9}$/.test(phoneDigits(input));
}

/** "998901234567" → "+998 90 123-45-67" (partial input is formatted as far as it goes). */
export function formatPhone(input: string): string {
  let d = phoneDigits(input);
  if (!d.startsWith("998")) d = "998" + d;
  d = d.slice(0, 12);
  const p = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)];
  let out = "+" + p[0];
  if (p[1]) out += " " + p[1];
  if (p[2]) out += " " + p[2];
  if (p[3]) out += "-" + p[3];
  if (p[4]) out += "-" + p[4];
  return out;
}

/** Monthly instalment of an interest-free plan. */
export function monthlyPayment(price: number, downPercent: number, months: number): number {
  const pct = Math.min(Math.max(downPercent, 0), 100);
  const down = (price * pct) / 100;
  if (months <= 0) return 0;
  return Math.ceil((price - down) / months);
}
