// End-to-end smoke + security checks against a production build.
//
//   pnpm build && pnpm test:e2e                 # against `next start` on :3100
//   E2E_BASE_URL=https://… pnpm test:e2e        # against a deployment
//
// Optional: E2E_MEDIA_DIR=<dir containing assets/> serves media locally (offline CI).
// Screenshots go to E2E_SHOTS (default: ./.e2e-shots).
import { spawn } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const SHOTS = process.env.E2E_SHOTS ?? ".e2e-shots";
mkdirSync(SHOTS, { recursive: true });
let BASE = process.env.E2E_BASE_URL;
const cleanup = [];

const MIME = { ".webp": "image/webp", ".jpg": "image/jpeg", ".mp4": "video/mp4", ".png": "image/png" };
if (process.env.E2E_MEDIA_DIR) {
  const root = process.env.E2E_MEDIA_DIR;
  const srv = createServer((req, res) => {
    const p = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!p.startsWith(root) || !existsSync(p) || statSync(p).isDirectory()) return res.writeHead(404).end();
    res.writeHead(200, { "content-type": MIME[extname(p)] ?? "application/octet-stream", "access-control-allow-origin": "*" });
    createReadStream(p).pipe(res);
  }).listen(8765);
  cleanup.push(() => srv.close());
}

if (!BASE) {
  const proc = spawn("pnpm", ["exec", "next", "start", "-p", "3100"], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  cleanup.push(() => proc.kill("SIGTERM"));
  await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error("next start timeout")), 30000);
    proc.stdout.on("data", (d) => /Ready|started/i.test(String(d)) && (clearTimeout(t), ok()));
    proc.on("exit", (c) => fail(new Error(`next start exited ${c}`)));
  });
  BASE = "http://localhost:3100";
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push([true, name]);
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push([false, name, e.message]);
    console.log(`  ✗ ${name}\n      ${e.message.split("\n")[0]}`);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

const browser = await chromium.launch();
cleanup.push(() => browser.close());

try {
  console.log(`E2E against ${BASE}`);
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const errors = [];
  for (const ctx of [desktop, mobile]) {
    ctx.on("page", (p) => {
      p.on("pageerror", (e) => errors.push(`${p.url()}: ${e.message}`));
      p.on("console", (m) => m.type() === "error" && !/Failed to load resource|ERR_|net::/.test(m.text()) && errors.push(`${p.url()}: ${m.text()}`));
    });
  }

  await check("security headers on HTML", async () => {
    const r = await fetch(BASE + "/");
    const h = r.headers;
    for (const k of ["content-security-policy", "x-content-type-options", "x-frame-options", "referrer-policy", "strict-transport-security", "permissions-policy"]) {
      assert(h.get(k), `missing ${k}`);
    }
    assert(!h.get("x-powered-by"), "x-powered-by leaks");
    assert(/frame-ancestors 'none'/.test(h.get("content-security-policy")), "CSP lacks frame-ancestors");
  });

  await check("locales: / is Uzbek, /ru Russian, /en English", async () => {
    // Own context: visiting /en stores a locale cookie that would redirect later visits.
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    for (const [path, lang] of [["/", "uz"], ["/ru", "ru"], ["/en", "en"]]) {
      await p.goto(BASE + path);
      assert((await p.getAttribute("html", "lang")) === lang, `${path} lang`);
    }
    await ctx.close();
  });

  await check("home: hero, live counter and one clear CTA", async () => {
    const p = await desktop.newPage();
    await p.goto(BASE + "/", { waitUntil: "load" });
    assert(/Sadaf Residence/.test(await p.textContent("h1")), "h1");
    const count = await p.textContent("[data-testid=free-count]");
    assert(/Sotuvda \d+ ta xonadon/.test(count), `counter: ${count}`);
    await p.screenshot({ path: `${SHOTS}/home-desktop.png` });
    await p.close();
  });

  await check("home on 375px: no horizontal scroll, menu opens", async () => {
    const p = await mobile.newPage();
    await p.goto(BASE + "/", { waitUntil: "load" });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    assert(sw <= 375, `scrollWidth ${sw}`);
    await p.screenshot({ path: `${SHOTS}/home-mobile.png` });
    await p.getByRole("button", { name: "Menyu" }).click();
    assert(await p.isVisible("#mobile-menu"), "mobile menu");
    await p.screenshot({ path: `${SHOTS}/home-mobile-menu.png` });
    await p.close();
  });

  await check("picker: floor band → units → apartment page", async () => {
    const p = await desktop.newPage();
    await p.goto(BASE + "/xonadonlar", { waitUntil: "load" });
    await p.getByRole("button", { name: /^7-qavat,/ }).click();
    assert((await p.textContent("main")).includes("7-qavat"), "floor 7 selected");
    await p.screenshot({ path: `${SHOTS}/picker-facade.png` });
    await p.getByRole("tab", { name: "Shaxmatka" }).click();
    await p.screenshot({ path: `${SHOTS}/picker-grid.png` });
    await p.getByRole("tab", { name: "Ro'yxat" }).click();
    await p.getByRole("checkbox", { name: "Faqat sotuvdagilar" }).check();
    const rows = await p.locator("tbody tr").count();
    assert(rows > 0, "table rows");
    const statuses = await p.locator("tbody tr td:nth-child(8)").allTextContents();
    assert(statuses.every((s) => s === "Sotuvda"), "only free filter");
    await p.locator("tbody tr").first().getByRole("link").click();
    await p.waitForURL(/\/xonadon\//);
    assert(/so'm/.test(await p.textContent("[data-testid=price]")), "price");
    await p.screenshot({ path: `${SHOTS}/apartment-desktop.png`, fullPage: true });
    await p.close();
  });

  await check("picker: 16/5 schematic facade, entrances, keyboard", async () => {
    const p = await desktop.newPage();
    await p.goto(BASE + "/xonadonlar?bino=b16", { waitUntil: "load" });
    const cell = p.getByRole("button", { name: /^3-podyezd, 9-qavat/ });
    await cell.focus();
    await p.keyboard.press("Enter");
    assert((await p.textContent("main")).includes("3-podyezd"), "entrance 3");
    await p.screenshot({ path: `${SHOTS}/picker-b16.png` });
    await p.close();
  });

  await check("apartment on 375px: sticky book bar, lead dialog validates", async () => {
    const p = await mobile.newPage();
    await p.goto(BASE + "/xonadonlar?bino=b16", { waitUntil: "load" });
    await p.getByRole("tab", { name: "Ro'yxat" }).click();
    await p.getByRole("checkbox", { name: "Faqat sotuvdagilar" }).check();
    const href = await p.locator("tbody tr a").first().getAttribute("href");
    await p.goto(BASE + href, { waitUntil: "load" });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    assert(sw <= 375, `scrollWidth ${sw}`);
    await p.screenshot({ path: `${SHOTS}/apartment-mobile.png` });
    await p.getByRole("button", { name: "Bron qilish" }).last().click();
    const dialog = p.getByRole("dialog");
    await dialog.getByRole("button", { name: "Yuborish" }).click();
    assert(await dialog.getByText("Ismingizni kiriting.").isVisible(), "name error");
    assert(await dialog.getByText(/To'liq raqam kiriting/).isVisible(), "phone error");
    await dialog.getByLabel("Ismingiz").fill("Test");
    await dialog.getByLabel("Telefon").fill("901234567");
    assert((await dialog.getByLabel("Telefon").inputValue()) === "+998 90 123-45-67", "phone mask");
    await p.screenshot({ path: `${SHOTS}/lead-dialog-mobile.png` });
    await dialog.getByRole("button", { name: "Yuborish" }).click();
    await dialog.getByRole("status").getByText(/./).waitFor({ timeout: 8000 });
    await p.keyboard.press("Escape");
    assert(!(await dialog.isVisible()), "Esc closes dialog");
    await p.close();
  });

  await check("tour: intro → scene 1 with hotspots → card", async () => {
    const p = await desktop.newPage();
    await p.goto(BASE + "/sayohat", { waitUntil: "domcontentloaded" });
    await p.getByRole("button", { name: /Sayohatni boshlash/ }).click();
    await p.getByRole("button", { name: /16 qavatli uy/ }).first().waitFor({ state: "visible", timeout: 20000 });
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${SHOTS}/tour-scene.png` });
    await p.getByRole("button", { name: /16 qavatli uy/ }).first().click();
    await p.getByRole("link", { name: "Shu binodan tanlash" }).waitFor({ timeout: 5000 });
    await p.screenshot({ path: `${SHOTS}/tour-card.png` });
    await p.close();
  });

  await check("unknown pages return 404", async () => {
    for (const path of ["/xonadon/does-not-exist", "/xonadon/..%2f..%2fetc", "/nope", "/ru/nope"]) {
      const r = await fetch(BASE + path);
      assert(r.status === 404, `${path} → ${r.status}`);
    }
  });

  await check("API /api/leads rejects bad input, foreign origins and floods", async () => {
    const post = (body, headers = {}) =>
      fetch(BASE + "/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "10.9.9.9", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
      });
    assert((await post({ name: "A", phone: "1" })).status === 400, "bad phone → 400");
    assert((await post("{not json")).status === 400, "bad json → 400");
    assert((await post({ name: "A", phone: "+998901234567" }, { origin: "https://evil.example" })).status === 403, "foreign origin → 403");
    assert((await post("x".repeat(5000))).status === 413, "big body → 413");
    const r = await fetch(BASE + "/api/leads", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" });
    assert(r.status === 415, "content-type → 415");
    const hp = await post({ name: "Bot", phone: "+998901234567", website: "spam" }, { "x-real-ip": "10.9.9.8" });
    assert(hp.status === 200, "honeypot pretends ok");
    let last = 0;
    for (let i = 0; i < 6; i++) last = (await post({ name: "F", phone: "+998901234567" }, { "x-real-ip": "10.9.9.7" })).status;
    assert(last === 429, `6th request → ${last}`);
    assert((await post({ name: "A", phone: "+998901234567" })).headers.get("cache-control")?.includes("no-store"), "no-store");
  });

  await check("API /api/health exposes booleans only", async () => {
    const j = await (await fetch(BASE + "/api/health")).json();
    assert(j.ok === true && Object.values(j.integrations).every((v) => typeof v === "boolean"), JSON.stringify(j));
  });

  await check("telegram webhook requires the secret", async () => {
    const r = await fetch(BASE + "/api/telegram/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert(r.status === 401, `→ ${r.status}`);
  });

  await check("no runtime errors in the browser console", async () => {
    assert(errors.length === 0, errors.slice(0, 3).join(" | "));
  });
} finally {
  for (const fn of cleanup.reverse()) await fn();
}

const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} passed. Screenshots: ${SHOTS}/`);
process.exit(failed.length ? 1 : 0);
