"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { bulkReprice, updateApartment, type ActionResult } from "@/app/crm/actions";
import { formatArea, formatUSD, formatUZS } from "@/lib/format";
import { APARTMENT_STATUSES, type ApartmentStatus } from "@/lib/types";

export type BoardBuilding = { id: string; code: string; name: string; floors: number; entrances: number; firstFloor: number };
export type BoardUnit = {
  id: string; slug: string; b: string; e: number; f: number; no: string;
  rooms: number; area: number; uzs: number; usd: number; st: ApartmentStatus;
};

const CELL: Record<ApartmentStatus, string> = {
  free: "bg-free text-white",
  reserved: "bg-reserved text-white",
  sold: "bg-sold text-white",
  hidden: "bg-paper-2 text-muted border border-dashed border-muted/50",
};
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export function ChessBoard({
  buildings, units: initialUnits, initialBuilding, canPrice, canStatus, usdRate,
}: {
  buildings: BoardBuilding[]; units: BoardUnit[]; initialBuilding: string;
  canPrice: boolean; canStatus: boolean; usdRate: number;
}) {
  const t = useTranslations("crm");
  const ts = useTranslations("status");
  const [units, setUnits] = useState(initialUnits);
  const [code, setCode] = useState(initialBuilding);
  const [filter, setFilter] = useState<ApartmentStatus | "all">("all");
  const [selId, setSelId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const building = buildings.find((b) => b.code === code) ?? buildings[0];
  const list = useMemo(() => units.filter((u) => u.b === building.id), [units, building.id]);
  const perFloor = Math.max(1, ...list.map((u) => Number(u.no.slice(-2))));
  const sel = units.find((u) => u.id === selId) ?? null;

  const kpi = useMemo(() => {
    const c = { free: 0, reserved: 0, sold: 0, hidden: 0, freeSum: 0 };
    for (const u of list) {
      c[u.st] += 1;
      if (u.st === "free") c.freeSum += u.uzs;
    }
    return c;
  }, [list]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(id);
  }, [toast]);

  const report = (r: ActionResult, okText: string, demoText: string) => {
    if (r.ok) setToast({ kind: "ok", text: r.demo ? demoText : okText });
    else setToast({ kind: "err", text: t(`errors.${r.error}`) });
    return r.ok;
  };

  function chooseBuilding(c: string) {
    setCode(c);
    setSelId(null);
    const url = new URL(window.location.href);
    url.searchParams.set("bino", c);
    window.history.replaceState(null, "", url);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[clamp(28px,3vw,40px)]">{t("board.title")}</h1>
        <div role="tablist" aria-label={t("board.building")} className="flex flex-wrap gap-1.5">
          {buildings.map((b) => (
            <button key={b.code} role="tab" aria-selected={b.code === code} className="chip" onClick={() => chooseBuilding(b.code)}>
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <dl className="m-0 mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        {(
          [
            ["free", kpi.free, "border-l-free"],
            ["reserved", kpi.reserved, "border-l-reserved"],
            ["sold", kpi.sold, "border-l-sold"],
          ] as const
        ).map(([k, v, c]) => (
          <div key={k} className={`border border-l-4 border-line bg-white p-4 ${c}`}>
            <dt className="mono-label text-muted">{t(`kpi.${k}`)}</dt>
            <dd className="m-0 mt-1 font-display text-[34px] leading-none">{v}</dd>
          </div>
        ))}
        <div className="border border-l-4 border-line border-l-bronze bg-white p-4">
          <dt className="mono-label text-muted">{t("kpi.freeSum")}</dt>
          <dd className="m-0 mt-1 font-display text-[28px] leading-tight">{t("kpi.bln", { n: (kpi.freeSum / 1e9).toFixed(1).replace(".", ",") })}</dd>
        </div>
      </dl>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="mono-label mr-1 text-muted">{t("board.filter")}</span>
        {(["all", ...APARTMENT_STATUSES] as const).map((s) => (
          <button key={s} type="button" className="chip !min-h-9" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s === "all" ? t("board.all") : ts(s)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto border border-line bg-white p-3">
        <table className="w-max border-separate border-spacing-1 font-mono text-[11px]">
          <thead>
            <tr>
              <th className="w-10 text-left font-normal text-muted">{t("board.floor")}</th>
              {range(1, building.entrances).map((e) => (
                <th key={e} colSpan={perFloor} className="pb-1 text-left font-normal text-muted">
                  {t("board.entrance", { n: e })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {range(building.firstFloor, building.floors)
              .reverse()
              .map((f) => (
                <tr key={f}>
                  <th scope="row" className="pr-1 text-right font-normal text-muted">{f}</th>
                  {range(1, building.entrances).flatMap((e) =>
                    range(1, perFloor).map((k) => {
                      const u = list.find((x) => x.f === f && x.e === e && Number(x.no.slice(-2)) === k);
                      if (!u) return <td key={`${e}-${k}`} />;
                      const dim = filter !== "all" && u.st !== filter;
                      return (
                        <td key={u.id} className={k === perFloor && e < building.entrances ? "pr-3" : ""}>
                          <button
                            type="button"
                            onClick={() => setSelId(u.id)}
                            aria-label={`№${u.no}, ${ts(u.st)}, ${formatUZS(u.uzs)}`}
                            aria-pressed={selId === u.id}
                            className={`grid h-11 w-14 place-items-center leading-tight transition-[opacity,transform] hover:scale-105 ${CELL[u.st]} ${
                              dim ? "opacity-15" : ""
                            } ${selId === u.id ? "outline-2 outline-offset-1 outline-ink-1" : ""}`}
                          >
                            <span>{u.no}</span>
                            <span className="text-[9.5px] opacity-80">{u.area}m²</span>
                          </button>
                        </td>
                      );
                    }),
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {canPrice && (
        <BulkPanel
          building={building}
          onDone={(r, pct, onlyFree, rooms) => {
            const ok = report(r, t("board.bulkDone", { n: r.ok ? (r.count ?? 0) : 0 }), t("board.bulkDemo"));
            if (ok) {
              // Mirror the database rounding so the board matches what was saved.
              setUnits((us) =>
                us.map((u) => {
                  if (u.b !== building.id || u.st === "sold" || (onlyFree && u.st !== "free") || (rooms && u.rooms !== rooms)) return u;
                  const usd = Math.round((u.usd * (1 + pct / 100)) / 100) * 100;
                  return { ...u, usd, uzs: Math.round((usd * usdRate) / 1e6) * 1e6 };
                }),
              );
            }
          }}
        />
      )}

      {sel && (
        <Drawer
          key={sel.id}
          unit={sel}
          building={building}
          canPrice={canPrice}
          canStatus={canStatus}
          onClose={() => setSelId(null)}
          onSaved={(r, patch) => {
            if (report(r, t("drawer.saved"), t("drawer.savedDemo"))) setUnits((us) => us.map((u) => (u.id === sel.id ? { ...u, ...patch } : u)));
          }}
        />
      )}

      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-[60] flex justify-center lg:left-[264px]">
        {toast && (
          <p className={`pointer-events-auto m-0 max-w-[560px] px-4 py-3 text-[14px] text-white shadow-lg [animation:fade-up_.25s_ease] ${toast.kind === "ok" ? "bg-ink-1" : "bg-danger"}`}>
            {toast.text}
          </p>
        )}
      </div>
    </div>
  );
}

function Drawer({
  unit, building, canPrice, canStatus, onClose, onSaved,
}: {
  unit: BoardUnit; building: BoardBuilding; canPrice: boolean; canStatus: boolean;
  onClose: () => void; onSaved: (r: ActionResult, patch: Partial<BoardUnit>) => void;
}) {
  const t = useTranslations("crm");
  const ts = useTranslations("status");
  const [st, setSt] = useState(unit.st);
  const [uzs, setUzs] = useState(String(unit.uzs));
  const [usd, setUsd] = useState(String(unit.usd));
  const [pending, start] = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () =>
    start(async () => {
      const patch: { status?: ApartmentStatus; price_uzs?: number; price_usd?: number } = {};
      if (st !== unit.st) patch.status = st;
      if (canPrice && Number(uzs) !== unit.uzs) patch.price_uzs = Math.round(Number(uzs));
      if (canPrice && Number(usd) !== unit.usd) patch.price_usd = Number(usd);
      if (!Object.keys(patch).length) return onClose();
      const r = await updateApartment({ id: unit.id, ...patch });
      onSaved(r, { st: patch.status ?? unit.st, uzs: patch.price_uzs ?? unit.uzs, usd: patch.price_usd ?? unit.usd });
      if (r.ok) onClose();
    });

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="drawer-title"
      className="fixed inset-y-0 right-0 z-50 flex w-[min(420px,100%)] flex-col border-l border-line bg-white shadow-[-20px_0_40px_rgba(0,0,0,.08)] [animation:fade-up_.25s_ease]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line p-5">
        <div>
          <p className="mono-label m-0 text-bronze">{building.name}</p>
          <h2 id="drawer-title" className="mt-1 text-[28px]">{t("drawer.title", { n: unit.no })}</h2>
          <p className="m-0 mt-1 text-[13px] text-muted">
            {t("drawer.specs", { rooms: unit.rooms, area: formatArea(unit.area), entrance: unit.e, floor: unit.f })}
          </p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label={t("drawer.close")} className="grid h-11 w-11 place-items-center text-[26px] leading-none">
          ×
        </button>
      </div>
      <div className="grid flex-1 content-start gap-5 overflow-y-auto p-5">
        <fieldset className="m-0 border-0 p-0" disabled={!canStatus}>
          <legend className="field mb-2">{t("drawer.status")}</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {APARTMENT_STATUSES.map((s) => (
              <button key={s} type="button" className="chip justify-center" aria-pressed={st === s} onClick={() => setSt(s)}>
                {ts(s)}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          {t("drawer.priceUzs")}
          <input className="input font-mono" inputMode="numeric" value={uzs} disabled={!canPrice} onChange={(e) => setUzs(e.target.value.replace(/\D/g, ""))} />
          <span className="text-[12px] tracking-normal normal-case">{formatUZS(Number(uzs) || 0)}</span>
        </label>
        <label className="field">
          {t("drawer.priceUsd")}
          <input className="input font-mono" inputMode="decimal" value={usd} disabled={!canPrice} onChange={(e) => setUsd(e.target.value.replace(/[^\d.]/g, ""))} />
          <span className="text-[12px] tracking-normal normal-case">{formatUSD(Number(usd) || 0)}</span>
        </label>
        {!canPrice && <p className="m-0 text-[13px] text-muted">{t("drawer.priceLocked")}</p>}
        <a href={`/xonadon/${unit.slug}`} target="_blank" rel="noopener" className="text-[13px] text-bronze underline underline-offset-4">
          {t("board.open")} ↗
        </a>
      </div>
      <div className="border-t border-line p-5">
        <button type="button" className="btn btn-fill w-full" onClick={save} disabled={pending || !canStatus}>
          {pending ? t("drawer.saving") : t("drawer.save")}
        </button>
      </div>
    </aside>
  );
}

function BulkPanel({
  building, onDone,
}: {
  building: BoardBuilding;
  onDone: (r: ActionResult, pct: number, onlyFree: boolean, rooms: number | null) => void;
}) {
  const t = useTranslations("crm.board");
  const [pct, setPct] = useState("");
  const [onlyFree, setOnlyFree] = useState(true);
  const [rooms, setRooms] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const n = Number(pct.replace(",", "."));
  const valid = Number.isFinite(n) && n !== 0 && n >= -50 && n <= 50;

  return (
    <details className="mt-6 border border-line bg-white">
      <summary className="cursor-pointer px-5 py-4 font-display text-[20px]">{t("bulk")}</summary>
      <div className="grid gap-4 border-t border-line p-5 md:grid-cols-[1fr_auto]">
        <p className="m-0 text-[13.5px] text-muted md:col-span-2">{t("bulkHint")}</p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="field w-32">
            {t("percent")}
            <input className="input font-mono" inputMode="decimal" placeholder="+5" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.,-]/g, ""))} />
          </label>
          <label className="field">
            {t("rooms")}
            <select className="input !w-auto" value={rooms ?? ""} onChange={(e) => setRooms(e.target.value ? Number(e.target.value) : null)}>
              <option value="">{t("anyRooms")}</option>
              {[1, 2, 3].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-12 items-center gap-2 text-[14px]">
            <input type="checkbox" className="h-5 w-5 accent-[var(--bronze)]" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} />
            {t("onlyFree")}
          </label>
        </div>
        <button
          type="button"
          className="btn btn-fill self-end"
          disabled={!valid || pending}
          onClick={() => {
            if (!window.confirm(t("confirm", { building: building.name, percent: n > 0 ? `+${n}` : n }))) return;
            start(async () => {
              const r = await bulkReprice({ buildingId: building.id, percent: n, onlyFree, rooms });
              onDone(r, n, onlyFree, rooms);
              if (r.ok) setPct("");
            });
          }}
        >
          {t("apply")}
        </button>
      </div>
    </details>
  );
}
