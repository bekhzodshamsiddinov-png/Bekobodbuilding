import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";
import { escapeHtml } from "@/lib/telegram";
import { leadSchema, pickUtm } from "@/lib/validation/lead";

describe("lead schema", () => {
  it("normalises phone and trims name", () => {
    const r = leadSchema.parse({ name: "  Dilshod ", phone: "+998 90 123-45-67" });
    expect(r).toMatchObject({ name: "Dilshod", phone: "+998901234567", intent: "call", source: "site" });
  });
  it("strips control characters from the name", () => {
    expect(leadSchema.parse({ name: "A\u0000B\nC", phone: "998901234567" }).name).toBe("A B C");
  });
  it("rejects bad input", () => {
    expect(leadSchema.safeParse({ name: "", phone: "998901234567" }).success).toBe(false);
    expect(leadSchema.safeParse({ name: "A", phone: "123" }).success).toBe(false);
    expect(leadSchema.safeParse({ name: "x".repeat(121), phone: "998901234567" }).success).toBe(false);
    expect(leadSchema.safeParse({ name: "A", phone: "998901234567", apartmentId: "1 or 1=1" }).success).toBe(false);
    expect(leadSchema.safeParse({ name: "A", phone: "998901234567", source: "<script>" }).success).toBe(false);
    expect(leadSchema.safeParse({ name: "A", phone: "998901234567", intent: "admin" }).success).toBe(false);
    expect(leadSchema.safeParse({ name: "A", phone: "998901234567", utm: { evil: "x" } }).success).toBe(false);
  });
  it("accepts apartment ids in the demo id format", () => {
    expect(leadSchema.safeParse({ name: "A", phone: "998901234567", apartmentId: "00000000-0000-4000-8003-000000000001" }).success).toBe(true);
  });
  it("picks only known utm keys", () => {
    expect(pickUtm("?utm_source=ig&utm_medium=cpc&x=1")).toEqual({ utm_source: "ig", utm_medium: "cpc" });
    expect(pickUtm("?x=1")).toBeNull();
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(check("ip", 0).ok).toBe(true);
    expect(check("ip", 10).ok).toBe(true);
    const blocked = check("ip", 20);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBe(1);
    expect(check("other", 20).ok).toBe(true);
    expect(check("ip", 1500).ok).toBe(true);
  });
  it("stays bounded in memory", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 1000, max: 100 });
    for (let i = 0; i < 1000; i++) check(`ip${i}`, 0);
    expect(check("ip999", 1).ok).toBe(false);
  });
});

describe("telegram", () => {
  it("escapes HTML so user input cannot inject markup", () => {
    expect(escapeHtml(`<b>x</b> & "y"`)).toBe(`&lt;b&gt;x&lt;/b&gt; &amp; "y"`);
  });
});
