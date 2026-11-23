"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LogoMark, LogoText } from "@/components/ui/Logo";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { BUILDING_IMAGES, INFO_IMAGE, SCENES, type BuildingCode, type Hotspot, type InfoKey } from "@/lib/content/tour";

type Card = { kind: "building"; code: BuildingCode } | { kind: "info"; key: InfoKey };
export type TourBuilding = { code: BuildingCode; floors: number; entrances: number; free: number };

const idx = (id: string) => SCENES.findIndex((s) => s.id === id);

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Viewport size as an external store, so layout maths never runs in effects.
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const viewportSnapshot = () => `${window.innerWidth}x${window.innerHeight}`;
function useViewport() {
  const v = useSyncExternalStore(subscribeResize, viewportSnapshot, () => "0x0");
  const [W, H] = v.split("x").map(Number);
  return { W, H };
}

/** Media box that covers the viewport at 16:9, and how far it can pan sideways. */
function coverBox(W: number, H: number) {
  let w = W;
  let h = W / (16 / 9);
  if (h < H) {
    h = H;
    w = H * (16 / 9);
  }
  return { w, h, max: Math.max(0, (w - W) / 2) };
}

/**
 * Full-screen cinematic walk-through: still frame + hotspots; clicking a
 * "go" hotspot flies the camera into it and plays the transition clip, then
 * lands on the next scene's still.
 */
export function CinematicTour({ mediaUrl, buildings }: { mediaUrl: string; buildings: TourBuilding[] }) {
  const t = useTranslations("tour");
  const tsc = useTranslations("scenes");
  const tcard = useTranslations("tourCards");
  const tb = useTranslations("building");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const m = (p: string) => `${mediaUrl}/${p}`;

  const [started, setStarted] = useState(false);
  const [cur, setCur] = useState(0);
  const [still, setStill] = useState(m("scn/hero.webp"));
  const [show, setShow] = useState(false);
  const [videoOn, setVideoOn] = useState(false);
  const [skip, setSkip] = useState(false);
  const [mini, setMini] = useState(false);
  const [fly, setFly] = useState<{ x: number; y: number } | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [cardImg, setCardImg] = useState(0);
  const { W, H } = useViewport();
  const box = coverBox(W, H);
  const [panRaw, setPanX] = useState(0);
  const panX = Math.max(-box.max, Math.min(box.max, panRaw));
  const reduced = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    prefersReduced,
    () => false,
  );
  const [loadPct, setLoadPct] = useState(0);

  const vid = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);
  const timers = useRef<number[]>([]);
  const pre = useRef<Record<string, HTMLVideoElement>>({});
  const stripRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /* center the scene's hotspots on narrow screens */
  const focusPan = useCallback((i: number) => {
    const hots = SCENES[i].hots;
    const { w } = coverBox(window.innerWidth, window.innerHeight);
    const ax = hots.reduce((a, h) => a + h.x, 0) / hots.length / 100;
    setPanX((0.5 - ax) * w);
  }, []);

  const preload = useCallback(
    (id: string) => {
      if (pre.current[id] || prefersReduced()) return;
      const v = document.createElement("video");
      v.preload = "auto";
      v.muted = true;
      v.src = m(`vid/${id}.mp4`);
      v.load();
      pre.current[id] = v;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaUrl],
  );

  const arrive = useCallback(
    (i: number) => {
      clearTimers();
      const v = vid.current;
      if (v) {
        v.onended = null;
        v.onerror = null;
        v.oncanplay = null;
      }
      setFly(null);
      const id = SCENES[i].id;
      const im = new Image();
      im.onload = im.onerror = () => {
        setStill(im.src);
        setVideoOn(false);
        later(() => {
          if (vid.current) {
            vid.current.removeAttribute("src");
            vid.current.load();
          }
        }, 400);
        setShow(true);
        setMini(false);
        later(() => setMini(true), 5000);
        setSkip(false);
        busy.current = false;
        SCENES[i].hots.forEach((h) => "to" in h && preload(h.to));
        preload(SCENES[(i + 1) % SCENES.length].id);
      };
      im.src = m(`scn/${id}.webp`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preload, mediaUrl],
  );

  const go = useCallback(
    (i: number) => {
      setCard(null);
      setCur(i);
      busy.current = true;
      setShow(false);
      focusPan(i);
      track("tour_scene", { scene: SCENES[i].id });
      const v = vid.current;
      if (!v || prefersReduced()) {
        arrive(i);
        return;
      }
      v.src = m(`vid/${SCENES[i].id}.mp4`);
      v.currentTime = 0;
      v.oncanplay = () => {
        v.oncanplay = null;
        v.play()
          .then(() => {
            setVideoOn(true);
            setFly(null);
            setSkip(true);
          })
          .catch(() => arrive(i));
      };
      v.onended = () => arrive(i);
      v.onerror = () => busy.current && arrive(i);
      later(() => busy.current && arrive(i), 15000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [arrive, focusPan, mediaUrl],
  );

  function onHot(h: Hotspot) {
    if (busy.current) return;
    if ("to" in h) {
      const target = idx(h.to);
      setShow(false);
      preload(h.to);
      if (prefersReduced()) return go(target);
      setFly({ x: h.x, y: h.y });
      later(() => go(target), 950);
    } else if ("building" in h) {
      setCardImg(0);
      setCard({ kind: "building", code: h.building });
    } else {
      setCard({ kind: "info", key: h.info });
    }
  }

  function step(d: number) {
    if (!started) return start();
    go((cur + d + SCENES.length) % SCENES.length);
  }

  function start(i = 0) {
    setStarted(true);
    go(i);
  }

  /* first clip loading bar + deep link (#yard) */
  useEffect(() => {
    preload("hero");
    const pv = pre.current.hero;
    const onProg = () => {
      try {
        const b = pv.buffered;
        if (b.length) setLoadPct(Math.min(100, (b.end(b.length - 1) / pv.duration) * 100));
      } catch {}
    };
    pv?.addEventListener("progress", onProg);
    const hash = window.location.hash.slice(1);
    if (hash && idx(hash) >= 0) {
      later(() => {
        setStarted(true);
        go(idx(hash));
      }, 0);
    }
    return () => {
      pv?.removeEventListener("progress", onProg);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCard(null);
      if (!started || card) return;
      if (e.key === "ArrowRight") go((cur + 1) % SCENES.length);
      if (e.key === "ArrowLeft") go((cur - 1 + SCENES.length) % SCENES.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, card, cur, go]);

  useEffect(() => {
    if (card) closeRef.current?.focus();
  }, [card]);

  useEffect(() => {
    const el = stripRef.current?.children[cur] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", inline: "center", behavior: prefersReduced() ? "auto" : "smooth" });
    if (started) window.history.replaceState(null, "", `#${SCENES[cur].id}`);
  }, [cur, started]);

  /* drag to pan */
  const drag = useRef<{ x: number; p: number } | null>(null);
  const [panHint, setPanHint] = useState(true);

  const scene = SCENES[cur];
  const sk = scene.id;
  const label = (h: Hotspot, i: number) => tsc(`${sk}.h${i}` as "hero.h0");
  const kind = (h: Hotspot) => ("to" in h ? t("go") : "building" in h ? t("bld") : h.info === "units" ? t("pickFloor") : t("info"));

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-paper [overscroll-behavior:none]">
      {/* stage */}
      <div
        className="absolute inset-0 touch-none"
        onPointerDown={(e) => {
          if (box.max < 1 || (e.target as HTMLElement).closest("button")) return;
          drag.current = { x: e.clientX, p: panX };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          setPanX(drag.current.p + (e.clientX - drag.current.x));
          setPanHint(false);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <div
          className="absolute top-0 left-0 will-change-transform"
          style={{
            width: W ? box.w : "100%",
            height: W ? box.h : "100%",
            transform: W ? `translate(${(W - box.w) / 2 + panX}px, ${(H - box.h) / 2}px)` : undefined,
          }}
        >
          <div
            className="absolute inset-0"
            style={
              fly
                ? {
                    transformOrigin: `${fly.x}% ${fly.y}%`,
                    transform: "scale(2.4)",
                    filter: "blur(3px)",
                    opacity: 0,
                    transition: "transform 1s cubic-bezier(.55,0,.8,.2), filter 1s, opacity .5s .55s",
                  }
                : undefined
            }
          >
            <div className={`absolute inset-0 ${show && !reduced ? "[animation:tour-drift_22s_cubic-bezier(.2,.6,.3,1)_forwards]" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={still} alt="" className="absolute inset-0 h-full w-full transition-opacity duration-500" />
              <video
                ref={vid}
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${videoOn ? "opacity-100" : "opacity-0"}`}
              />
              <div className="absolute inset-0">
                {scene.hots.map((h, i) => (
                  <button
                    key={`${sk}-${i}`}
                    type="button"
                    onClick={() => onHot(h)}
                    tabIndex={show ? 0 : -1}
                    className={`group absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 transition-opacity duration-500 ${
                      h.left ? "flex-row-reverse" : ""
                    } ${show ? "opacity-100" : "pointer-events-none opacity-0"}`}
                    style={{ left: `${h.x}%`, top: `${h.y}%` }}
                  >
                    <span className="relative grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-[rgba(201,164,107,.28)]">
                      <span
                        className={`block rounded-full ${"to" in h ? "h-3.5 w-3.5 bg-white" : "h-3 w-3 bg-bronze-l"} [animation:ping-soft_2.2s_infinite]`}
                      />
                    </span>
                    <span
                      className={`border border-line-d bg-[var(--glass-2)] px-3 py-2 text-[13px] whitespace-nowrap opacity-95 backdrop-blur-md transition-all group-hover:border-bronze group-hover:bg-bronze group-hover:text-white group-focus-visible:bg-bronze ${
                        h.left ? "text-right" : "text-left"
                      }`}
                    >
                      <small className="mb-0.5 block font-mono text-[9.5px] tracking-[0.18em] text-bronze-l uppercase group-hover:text-white">
                        {kind(h)}
                      </small>
                      {label(h, i)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(180deg,rgba(10,10,12,.55) 0%,rgba(10,10,12,0) 22%,rgba(10,10,12,0) 62%,rgba(10,10,12,.7) 100%)" }}
        />
      </div>

      {/* header */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-10 flex items-center justify-between gap-3.5 px-[max(18px,env(safe-area-inset-left,0px))] pt-[calc(16px+env(safe-area-inset-top,0px))]">
        <Link href="/" className="pointer-events-auto flex items-center gap-3 text-white no-underline" aria-label={t("home")}>
          <LogoMark className="h-7 w-7" />
          <LogoText short="SADAF" sub={tc("residence")} />
        </Link>
        <div className="pointer-events-auto flex gap-2">
          <Link href="/" className="btn glass hidden !min-h-0 !px-4 !py-[11px] !text-[12px] text-white hover:!bg-white hover:!text-ink-1 sm:inline-flex">
            {t("home")}
          </Link>
          <Link href="/xonadonlar" className="btn btn-fill !min-h-0 !px-4 !py-[11px] !text-[12px] hover:!border-white hover:!bg-white hover:!text-ink-1">
            {tn("apartments")}
          </Link>
        </div>
      </header>

      {/* caption */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed top-[calc(84px+env(safe-area-inset-top,0px))] left-[max(18px,env(safe-area-inset-left,0px))] z-[5] max-w-[min(440px,calc(100%-36px))] transition-all duration-500 ${
          started && show ? "opacity-100" : "-translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-center gap-3 font-mono text-[10.5px] tracking-[0.24em] text-bronze-l uppercase before:h-px before:w-7 before:bg-current">
          {String(cur + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")} · {tsc(`${sk}.k` as "hero.k")}
        </div>
        <div className={`overflow-hidden transition-all duration-700 ${mini ? "max-h-0 opacity-0" : "max-h-60 opacity-100"}`}>
          <h1 className="mt-3 mb-2.5 text-[clamp(34px,4.4vw,60px)] leading-none [text-shadow:0_2px_24px_rgba(0,0,0,.4)]">{tsc(`${sk}.t` as "hero.t")}</h1>
          <p className="m-0 max-w-[40ch] text-[15.5px] font-light [text-shadow:0_1px_12px_rgba(0,0,0,.6)]">{tsc(`${sk}.p` as "hero.p")}</p>
        </div>
      </div>

      {started && box.max > W * 0.15 && panHint && show && (
        <div className="glass pointer-events-none fixed bottom-[calc(118px+env(safe-area-inset-bottom,0px))] left-1/2 z-[6] -translate-x-1/2 px-3.5 py-2.5 font-mono text-[10.5px] tracking-[0.2em] whitespace-nowrap uppercase">
          ← {t("pan")} →
        </div>
      )}
      {skip && (
        <button
          type="button"
          onClick={() => arrive(cur)}
          className="btn glass fixed right-[max(18px,env(safe-area-inset-right,0px))] bottom-[calc(118px+env(safe-area-inset-bottom,0px))] z-[6] !min-h-0 !px-4 !py-[11px] !text-[12px] text-white"
        >
          {t("skip")} ⏭
        </button>
      )}

      {/* scene strip */}
      <nav
        aria-label={t("scenes")}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 flex items-end gap-3 px-[max(18px,env(safe-area-inset-left,0px))] pb-[calc(16px+env(safe-area-inset-bottom,0px))]"
      >
        <div className="pointer-events-auto hidden gap-1.5 md:flex">
          <button type="button" aria-label={t("prev")} onClick={() => step(-1)} className="glass grid h-11 w-11 place-items-center hover:!bg-white hover:text-ink-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" aria-label={t("next")} onClick={() => step(1)} className="glass grid h-11 w-11 place-items-center hover:!bg-white hover:text-ink-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-[18px] w-[18px]" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div ref={stripRef} className="glass pointer-events-auto mx-auto flex max-w-full min-w-0 gap-1.5 overflow-x-auto p-1.5 [scrollbar-width:none]">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-current={i === cur}
              aria-label={tsc(`${s.id}.t` as "hero.t")}
              onClick={() => (started ? go(i) : start(i))}
              className={`w-[84px] flex-none text-left transition-opacity md:w-[112px] ${i === cur ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m(`scn/${s.id}-t.webp`)}
                alt=""
                loading="lazy"
                className={`h-12 w-[84px] object-cover md:h-[63px] md:w-[112px] ${i === cur ? "outline-2 -outline-offset-1 outline-bronze-l" : ""}`}
              />
              <span className="block truncate px-0.5 pt-1.5 pb-0.5 font-mono text-[10px] tracking-[0.12em] uppercase">
                {String(i + 1).padStart(2, "0")} {tsc(`${s.id}.k` as "hero.k")}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* detail card */}
      <aside
        aria-hidden={!card}
        aria-label={t("info")}
        className={`fixed inset-y-0 right-0 z-20 flex w-[min(460px,100%)] flex-col border-l border-line-d bg-[rgba(17,18,20,.94)] pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl transition-transform duration-500 [transition-timing-function:cubic-bezier(.2,.8,.2,1)] ${
          card ? "translate-x-0" : "translate-x-[102%]"
        }`}
      >
        {card && (
          <>
            <div className="flex items-center justify-between px-[22px] pt-[18px]">
              <span className="font-mono text-[10.5px] tracking-[0.22em] text-bronze-l uppercase">
                {card.kind === "building" ? tb(`${card.code}.tag` as "b12a.tag") : tcard(`${card.key}.k` as "shops.k")}
              </span>
              <button
                ref={closeRef}
                type="button"
                aria-label={tn("close")}
                onClick={() => setCard(null)}
                className="grid h-11 w-11 place-items-center border border-line-d text-[22px] leading-none hover:bg-white hover:text-ink-1"
              >
                ×
              </button>
            </div>
            <div className="on-dark flex flex-col gap-[18px] overflow-y-auto px-[22px] pt-3.5 pb-[calc(24px+env(safe-area-inset-bottom,0px))]">
              {card.kind === "building" ? (
                <BuildingCard
                  code={card.code}
                  info={buildings.find((b) => b.code === card.code)}
                  img={cardImg}
                  setImg={setCardImg}
                  m={m}
                />
              ) : (
                <>
                  <h2 className="text-[34px] leading-[1.05]">{tcard(`${card.key}.t` as "shops.t")}</h2>
                  <div className="relative aspect-[4/3] overflow-hidden bg-ink-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m(`scn/${INFO_IMAGE[card.key]}.webp`)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <p className="m-0 text-[#cfc9bf]">{tcard(`${card.key}.p` as "shops.p")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/xonadonlar" className="btn btn-fill">
                      {card.key === "units" ? t("pickFloor") : tn("apartments")}
                    </Link>
                    <Link href="/aloqa" className="btn btn-ghost">
                      {tn("cta")}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </aside>

      {/* intro */}
      {!started && (
        <div
          className="fixed inset-0 z-30 flex items-end px-[max(18px,env(safe-area-inset-left,0px))] pb-[calc(56px+env(safe-area-inset-bottom,0px))]"
          style={{ background: "linear-gradient(180deg,rgba(10,10,12,.35),rgba(10,10,12,.2) 40%,rgba(10,10,12,.85))" }}
        >
          <div className="w-full max-w-[1320px]">
            <div className="font-mono text-[11px] tracking-[0.26em] text-bronze-l uppercase">{t("eyebrow")}</div>
            <h1 className="mt-4 mb-[18px] text-[clamp(54px,10vw,150px)] leading-[.92]">Sadaf Residence</h1>
            <p className="mt-0 mb-7 max-w-[46ch] text-[17px] font-light">{t("intro")}</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" className="btn btn-fill !px-6 !py-4" onClick={() => start()} autoFocus>
                {t("start")} →
              </button>
              <span className="font-mono text-[10.5px] tracking-[0.14em] text-muted-d uppercase">{t("hint")}</span>
            </div>
          </div>
          <div className="fixed top-0 left-0 z-40 h-0.5 bg-bronze-l transition-[width] duration-300" style={{ width: `${loadPct}%` }} />
        </div>
      )}
    </div>
  );
}

function BuildingCard({
  code,
  info,
  img,
  setImg,
  m,
}: {
  code: BuildingCode;
  info?: TourBuilding;
  img: number;
  setImg: (n: number) => void;
  m: (p: string) => string;
}) {
  const t = useTranslations("tour");
  const tb = useTranslations("building");
  const th = useTranslations("home");
  const imgs = BUILDING_IMAGES[code];
  return (
    <>
      <h2 className="text-[34px] leading-[1.05]">{tb(`${code}.name` as "b12a.name")}</h2>
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m(`img/${imgs[img]}.webp`)} alt={tb(`${code}.name` as "b12a.name")} className="h-full w-full object-cover" />
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {imgs.map((k, i) => (
          <button
            key={k}
            type="button"
            aria-current={i === img}
            aria-label={`${i + 1}`}
            onClick={() => setImg(i)}
            className={`aspect-square overflow-hidden ${i === img ? "opacity-100" : "opacity-55 hover:opacity-100"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m(`img/${k}.webp`)} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <p className="m-0 text-[#cfc9bf]">{tb(`${code}.text` as "b12a.text")}</p>
      {info && (
        <dl className="m-0 grid grid-cols-[auto_1fr] border-t border-line-d">
          {[
            [tb("floors"), info.floors],
            [tb("entrances"), info.entrances],
            [tb("onSale"), info.free],
          ].map(([k, v]) => (
            <div key={String(k)} className="contents">
              <dt className="border-b border-line-d py-[11px] pr-4 text-[14px] text-muted-d">{k}</dt>
              <dd className="m-0 border-b border-line-d py-[11px] text-right font-mono text-[13px]">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={{ pathname: "/xonadonlar", query: { bino: code } }} className="btn btn-fill">
          {th("pickInBuilding")}
        </Link>
        <Link href="/aloqa" className="btn btn-ghost">
          {t("price")}
        </Link>
      </div>
    </>
  );
}
