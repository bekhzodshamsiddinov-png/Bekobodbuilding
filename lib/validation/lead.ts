import { z } from "zod";
import { isValidUzPhone, phoneDigits } from "../format";

const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid", "yclid"] as const;

/** Shared by the browser form and the API route (the server re-validates). */
export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "errName")
    .max(120, "errName")
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, " ")),
  phone: z
    .string()
    .max(32, "errPhone")
    .refine(isValidUzPhone, "errPhone")
    .transform((p) => "+" + phoneDigits(p)),
  apartmentId: z.uuid().nullish(),
  intent: z.enum(["book", "ask", "call"]).default("call"),
  source: z
    .string()
    .regex(/^[a-z0-9_-]{1,40}$/)
    .default("site"),
  utm: z
    .partialRecord(z.enum(utmKeys), z.string().max(200))
    .nullish(),
  /** Honeypot. Real users never see or fill it. */
  website: z.string().max(200).optional(),
});

export type LeadInput = z.input<typeof leadSchema>;
export type Lead = z.output<typeof leadSchema>;

export function pickUtm(search: string): Record<string, string> | null {
  const params = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const k of utmKeys) {
    const v = params.get(k);
    if (v) out[k] = v.slice(0, 200);
  }
  return Object.keys(out).length ? out : null;
}
