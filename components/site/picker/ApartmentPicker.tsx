"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { formatArea, formatUSD, formatUZS } from "@/lib/format";
import { media } from "@/lib/media";
import { matches, STATUS_BG, STATUS_TEXT, type Filters, type PickerBuilding, type PickerUnit } from "./types";

type View = "facade" | "grid" | "table";

export function ApartmentPicker({
  buildings,
  units,
  initialBuilding,
}: {
  buildings: PickerBuilding[];
  units: PickerUnit[];
  initialBuilding: string;
}) {
  const t = useTranslations("picker");
  const tb = useTranslations("building");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const to = useTranslations("orientation");

  const [code, setCode] = useState(initialBuilding);
  const [view, setView] = useState<View>("facade");
  const [filters, setFilters] = useState<Filters>({ rooms: [], onlyFree: false, side: "any" });
  const building = buildings.find((b) => b.code === code) ?? buildings[0];
  const [sel, setSel] = useState(() => defaultSelection(building, units));

  const inBuilding = useMemo(() => units.filter((u) => u.b === building.id), [units, building.id]);
  const filtered = useMemo(() => inBuilding.filter((u) => matches(u, filters)), [inBuilding, filters]);
  const filtersActive = filters.rooms.length > 0 || filters.onlyFree || filters.side !== "any";

  function chooseBuilding(c: string) {
    const b = buildings.find((x) => x.code === c)!;
    setCode(c);
    setSel(defaultSelection(b, units));
    const url = new URL(window.location.href);
    url.searchParams.set("bino", c);
    window.history.replaceState(null, "", url);
    track("picker_building", { building: c });
  }

  function chooseFloor(floor: number, entrance = sel.entrance) {
    setSel({ floor, entrance });
    track("picker_floor", { building: building.code, floor });
  }

  const floorUnits = inBuilding.filter((u) => u.f === sel.floor && u.e === sel.entrance);
  const floorFree = floorUnits.filter((u) => u.st === "free").length;
  const floors = range(building.firstFloor, building.floors);

  return (
    <div>
      {/* Building tabs */}
      <div role="tablist" aria-label={tb("apartments")} className="flex flex-wrap gap-1.5">
        {buildings.map((b) => {
          const free = units.filter((u) => u.b === b.id && u.st === "free").length;
          return (
            <button key={b.code} role="tab" aria-selected={b.code === code} className="chip" onClick={() => chooseBuilding(b.code)}>
              <span>{tb(`${b.code}.tab` as "b12a.tab")}</span>
              <span className="font-mono text-[11px] opacity-70">· {t("freeOnFloor", { n: free })}</span>
            </button>
          );
        })}
      </div>

      {/* Filters + view switch */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-4">
        <fieldset className="m-0 flex flex-wrap items-center gap-1.5 border-0 p-0">
          <legend className="mono-label float-left mr-2 text-muted">{t("roomsLabel")}</legend>
          {[1, 2, 3].map((r) => (
            <button
              key={r}
              type="button"
              className="chip !min-w-11 justify-center"
              aria-pressed={filters.rooms.includes(r)}
              onClick={() =>
                setFilters((f) => ({ ...f, rooms: f.rooms.includes(r) ? f.rooms.filter((x) => x !== r) : [...f.rooms, r] }))
              }
            >
              {r === 3 ? "3+" : r}
            </button>
          ))}
        </fieldset>
        <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[14px]">
          <input
            type="checkbox"
            className="h-5 w-5 accent-[var(--bronze)]"
            checked={filters.onlyFree}
            onChange={(e) => setFilters((f) => ({ ...f, onlyFree: e.target.checked }))}
          />
          {t("onlyFree")}
        </label>
        <label className="flex items-center gap-2.5 text-[14px]">
          <span className="mono-label text-muted">{t("orientationLabel")}</span>
          <select
            className="input !min-h-10 !w-auto !py-2"
            value={filters.side}
            onChange={(e) => setFilters((f) => ({ ...f, side: e.target.value as Filters["side"] }))}
          >
            <option value="any">{t("any")}</option>
            <option value="yard">{to("yard")}</option>
            <option value="street">{to("street")}</option>
          </select>
        </label>
        {filtersActive && (
          <button type="button" className="text-[13px] text-bronze underline underline-offset-4" onClick={() => setFilters({ rooms: [], onlyFree: false, side: "any" })}>
            {t("reset")}
          </button>
        )}
        <div role="tablist" aria-label={t("filters")} className="ml-auto flex gap-1">
          {(["facade", "grid", "table"] as const).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className="chip" onClick={() => setView(v)}>
              {t(v)}
            </button>
          ))}
        </div>
      </div>

      <p className="mono-label mt-4 mb-6 text-muted" aria-live="polite">
        {t("results", { n: filtered.length })}
      </p>

      {view === "table" ? (
        <UnitTable units={filtered} buildings={buildings} />
      ) : (
        <div className="grid items-start gap-[clamp(28px,5vw,72px)] lg:grid-cols-[minmax(0,1.1fr)_1fr]">
          <div>
            {view === "facade" ? (
              building.bands ? (
                <BandFacade building={building} floors={floors} selected={sel.floor} onPick={chooseFloor} units={inBuilding} filters={filters} />
              ) : (
                <SchematicFacade building={building} floors={floors} sel={sel} onPick={chooseFloor} units={inBuilding} filters={filters} />
              )
            ) : (
              <UnitGrid building={building} floors={floors} units={inBuilding} filters={filters} sel={sel} onPick={chooseFloor} />
            )}
            <Legend />
          </div>

          {/* Selected floor */}
          <div className="lg:sticky lg:top-24" aria-live="polite">
            <div className="eyebrow">{t("selectedFloor")}</div>
            <div className="mt-4 mb-1.5 font-display text-[clamp(64px,8vw,112px)] leading-[.9]">{tc("floor", { n: sel.floor })}</div>
            <p className="mt-0 mb-5 text-muted">
              {building.entrances > 1 && <>{tc("entrance", { n: sel.entrance })} · </>}
              {t("floorSummary", { total: floorUnits.length, free: floorFree })}
            </p>

            {building.entrances > 1 && (
              <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label={tb("entrances")}>
                {range(1, building.entrances).map((e) => (
                  <button key={e} type="button" className="chip !min-w-11 justify-center" aria-pressed={e === sel.entrance} onClick={() => chooseFloor(sel.floor, e)}>
                    {e}
                  </button>
                ))}
              </div>
            )}

            <ul className="m-0 mb-5 grid list-none grid-cols-2 gap-2.5 p-0">
              {floorUnits.map((u) => {
                const dim = !matches(u, filters);
                return (
                  <li key={u.id}>
                    <Link
                      href={`/xonadon/${u.slug}`}
                      className={`flex h-full min-w-0 flex-col gap-1 border border-line bg-paper-3 p-4 no-underline transition-[border-color,opacity,transform] hover:-translate-y-0.5 hover:border-bronze ${
                        u.st !== "free" || dim ? "opacity-55" : ""
                      }`}
                    >
                      <b className="font-display text-[24px] leading-[1.1] font-normal">{tc("rooms", { n: u.rooms })}</b>
                      <span className="text-[13px] text-muted">
                        {tc("apartmentNo", { n: u.no })} · {formatArea(u.area)}
                      </span>
                      {u.st === "free" && <span className="font-mono text-[12.5px]">{formatUZS(u.uzs)}</span>}
                      <em className={`mono-label mt-1.5 not-italic ${STATUS_TEXT[u.st]}`}>{ts(u.st)}</em>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <nav aria-label={t("floorList")} className="flex flex-wrap gap-1.5">
              {floors.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => chooseFloor(n)}
                  aria-label={tc("floor", { n })}
                  aria-pressed={n === sel.floor}
                  className={`grid h-10 w-10 place-items-center border font-mono text-[13px] ${
                    n === sel.floor ? "border-ink-1 bg-ink-1 text-paper" : "border-line hover:border-bronze"
                  }`}
                >
                  {n}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

function defaultSelection(b: PickerBuilding, units: PickerUnit[]) {
  // Start on the floor with the most free apartments in the middle of the building.
  const mid = Math.round((b.firstFloor + b.floors) / 2);
  let best = { floor: mid, entrance: 1, score: -1 };
  for (const u of units) {
    if (u.b !== b.id || u.st !== "free") continue;
    const free = units.filter((x) => x.b === b.id && x.f === u.f && x.e === u.e && x.st === "free").length;
    const score = free * 100 - Math.abs(u.f - mid);
    if (score > best.score) best = { floor: u.f, entrance: u.e, score };
  }
  return { floor: best.floor, entrance: best.entrance };
}

function range(a: number, b: number) {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

function Legend() {
  const ts = useTranslations("status");
  return (
    <ul className="m-0 mt-4 flex list-none flex-wrap gap-4 p-0 text-[13px] text-muted">
      {(["free", "reserved", "sold"] as const).map((s) => (
        <li key={s} className="flex items-center gap-2">
          <span className={`dot ${STATUS_BG[s]}`} aria-hidden="true" />
          {ts(s)}
        </li>
      ))}
    </ul>
  );
}

/** Real facade render with measured clickable floor bands (Webuy floor picker). */
function BandFacade({
  building,
  floors,
  selected,
  onPick,
  units,
  filters,
}: {
  building: PickerBuilding;
  floors: number[];
  selected: number;
  onPick: (f: number) => void;
  units: PickerUnit[];
  filters: Filters;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("picker");
  const b = building.bands!;
  return (
    <div className="relative aspect-[3/4] max-w-[560px] overflow-hidden bg-paper-2">
      <Image src={media(b.image)} alt={building.name} fill sizes="(max-width: 1024px) 100vw, 560px" className="object-cover" priority />
      <svg viewBox={`0 0 ${b.width} ${b.height}`} className="absolute inset-0 h-full w-full" role="group" aria-label={t("floorList")}>
        {floors.map((n) => {
          const y = b.y0 - n * b.fht;
          const free = units.filter((u) => u.f === n && u.st === "free" && matches(u, filters)).length;
          const on = n === selected;
          return (
            <g key={n}>
              <rect
                x={b.x0}
                y={y}
                width={b.x1 - b.x0}
                height={b.fht}
                tabIndex={0}
                role="button"
                aria-label={`${tc("floor", { n })}, ${t("freeOnFloor", { n: free })}`}
                aria-pressed={on}
                onClick={() => onPick(n)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(n))}
                className={`cursor-pointer outline-none transition-[fill] duration-200 focus-visible:stroke-white focus-visible:stroke-2 ${
                  on ? "fill-[rgba(168,131,79,.45)] stroke-white stroke-2" : "fill-[rgba(168,131,79,0)] hover:fill-[rgba(168,131,79,.32)]"
                }`}
              />
              {on && (
                <text
                  x={b.x1 - 70}
                  y={y + b.fht / 2 + 8}
                  className="pointer-events-none fill-white font-mono text-[22px]"
                  style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.45)", strokeWidth: 4 }}
                >
                  {n} · {free}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Drawn facade for buildings without measured renders: one band per floor per entrance. */
function SchematicFacade({
  building,
  floors,
  sel,
  onPick,
  units,
  filters,
}: {
  building: PickerBuilding;
  floors: number[];
  sel: { floor: number; entrance: number };
  onPick: (f: number, e: number) => void;
  units: PickerUnit[];
  filters: Filters;
}) {
  const tc = useTranslations("common");
  const t = useTranslations("picker");
  const colW = 120;
  const gap = 10;
  const rowH = 30;
  const pad = 24;
  const ground = building.firstFloor > 1 ? 40 : 0;
  const W = pad * 2 + building.entrances * colW + (building.entrances - 1) * gap;
  const H = pad + floors.length * rowH + ground + 18;
  return (
    <div className="overflow-hidden bg-ink-1 p-3">
      {building.facade && (
        <div className="relative mb-3 aspect-[16/6] overflow-hidden">
          <Image src={media(building.facade)} alt={building.name} fill sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" />
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="group" aria-label={t("floorList")}>
        <rect x={pad - 8} y={pad - 10} width={W - 2 * pad + 16} height={H - pad - 8} fill="#2a2b2e" />
        {range(1, building.entrances).map((e) => {
          const x = pad + (e - 1) * (colW + gap);
          return (
            <g key={e}>
              {floors.map((n, i) => {
                const y = pad + (floors.length - 1 - i) * rowH;
                const list = units.filter((u) => u.f === n && u.e === e);
                const free = list.filter((u) => u.st === "free" && matches(u, filters)).length;
                const on = n === sel.floor && e === sel.entrance;
                const fill = on ? "rgba(201,164,107,.85)" : free ? `rgba(127,196,143,${0.18 + free * 0.14})` : "rgba(238,235,229,.07)";
                return (
                  <rect
                    key={n}
                    x={x}
                    y={y}
                    width={colW}
                    height={rowH - 4}
                    rx={1}
                    fill={fill}
                    stroke={on ? "#fff" : "rgba(238,235,229,.14)"}
                    strokeWidth={on ? 2 : 1}
                    tabIndex={0}
                    role="button"
                    aria-label={`${tc("entrance", { n: e })}, ${tc("floor", { n })}, ${t("freeOnFloor", { n: free })}`}
                    aria-pressed={on}
                    onClick={() => onPick(n, e)}
                    onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && (ev.preventDefault(), onPick(n, e))}
                    className="cursor-pointer outline-none transition-[fill] hover:fill-[rgba(201,164,107,.55)] focus-visible:stroke-white"
                  />
                );
              })}
              {ground > 0 && (
                <rect x={x} y={pad + floors.length * rowH} width={colW} height={ground - 6} fill="rgba(168,131,79,.25)" />
              )}
              <text x={x + colW / 2} y={H - 4} textAnchor="middle" className="fill-[#a9a39a] font-mono text-[11px]">
                {e}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Chessboard: every apartment as a coloured cell. */
function UnitGrid({
  building,
  floors,
  units,
  filters,
  sel,
  onPick,
}: {
  building: PickerBuilding;
  floors: number[];
  units: PickerUnit[];
  filters: Filters;
  sel: { floor: number; entrance: number };
  onPick: (f: number, e: number) => void;
}) {
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const perFloor = Math.max(...units.map((u) => Number(u.no.slice(-2))), 1);
  return (
    <div className="overflow-x-auto">
      <table className="w-max border-separate border-spacing-1 font-mono text-[11px]">
        <thead>
          <tr>
            <th className="w-8" />
            {range(1, building.entrances).map((e) => (
              <th key={e} colSpan={perFloor} className="pb-1 text-left font-normal text-muted">
                {tc("entrance", { n: e })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...floors].reverse().map((n) => (
            <tr key={n}>
              <th scope="row" className={`pr-1 text-right font-normal ${n === sel.floor ? "text-bronze" : "text-muted"}`}>
                {n}
              </th>
              {range(1, building.entrances).flatMap((e) =>
                range(1, perFloor).map((k) => {
                  const u = units.find((x) => x.f === n && x.e === e && Number(x.no.slice(-2)) === k);
                  if (!u) return <td key={`${e}-${k}`} />;
                  const dim = !matches(u, filters);
                  return (
                    <td key={u.id} className={k === perFloor && e < building.entrances ? "pr-2" : ""}>
                      <Link
                        href={`/xonadon/${u.slug}`}
                        onFocus={() => onPick(n, e)}
                        onMouseEnter={() => onPick(n, e)}
                        aria-label={`${tc("floor", { n })}, ${tc("apartmentNo", { n: u.no })}, ${tc("rooms", { n: u.rooms })}, ${ts(u.st)}`}
                        className={`grid h-9 w-9 place-items-center text-white no-underline transition-[opacity,transform] hover:scale-110 ${STATUS_BG[u.st]} ${
                          dim ? "opacity-20" : u.st === "free" ? "" : "opacity-60"
                        }`}
                      >
                        {u.rooms}
                      </Link>
                    </td>
                  );
                }),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnitTable({ units, buildings }: { units: PickerUnit[]; buildings: PickerBuilding[] }) {
  const t = useTranslations("picker");
  const ts = useTranslations("status");
  const tc = useTranslations("common");
  const name = new Map(buildings.map((b) => [b.id, b.name]));
  if (!units.length) return <p className="text-muted">{t("noResults")}</p>;
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[720px] border-collapse text-[14px]">
        <thead className="bg-paper-2 text-left">
          <tr>
            {[t("colBuilding"), t("colEntrance"), t("colFloor"), t("colNo"), t("colRooms"), t("colArea"), t("colPrice"), t("colStatus"), ""].map(
              (h, i) => (
                <th key={i} scope="col" className="mono-label px-4 py-3 font-medium text-muted">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {units.slice(0, 300).map((u) => (
            <tr key={u.id} className="border-t border-line hover:bg-paper-3">
              <td className="px-4 py-3">{name.get(u.b)}</td>
              <td className="px-4 py-3 font-mono">{u.e}</td>
              <td className="px-4 py-3 font-mono">{u.f}</td>
              <td className="px-4 py-3 font-mono">{u.no}</td>
              <td className="px-4 py-3">{tc("rooms", { n: u.rooms })}</td>
              <td className="px-4 py-3 font-mono">{formatArea(u.area)}</td>
              <td className="px-4 py-3 font-mono whitespace-nowrap">
                {formatUZS(u.uzs)}
                <span className="block text-[12px] text-muted">{formatUSD(u.usd)}</span>
              </td>
              <td className={`mono-label px-4 py-3 ${STATUS_TEXT[u.st]}`}>{ts(u.st)}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/xonadon/${u.slug}`} className="text-bronze underline underline-offset-4">
                  {t("open")}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
