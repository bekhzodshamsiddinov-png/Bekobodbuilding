"use client";

import { useEffect, useRef, useState } from "react";

export type FilmCaption = { from: number; to: number; eyebrow: string; title: string; text: string };

/**
 * Scroll-scrubbed film (from Webuy): a sticky canvas draws frame N of an image
 * sequence according to scroll progress. Frames load coarse-to-fine so the film
 * is scrubbable almost immediately. Reduced motion → a single still frame.
 */
export function ScrollFilm({
  base,
  count,
  heightVh,
  label,
  meter,
  captions,
}: {
  base: string;
  count: number;
  heightVh: number;
  label: string;
  meter: string;
  captions: FilmCaption[];
}) {
  const sec = useRef<HTMLElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const bar = useRef<HTMLElement>(null);
  const [p, setP] = useState(0);

  useEffect(() => {
    const section = sec.current!;
    const canvas = cv.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const imgs: (HTMLImageElement | undefined)[] = new Array(count);
    let cur = -1;
    let want = 0;
    let started = false;
    let raf = 0;
    const url = (i: number) => `${base}${String(i + 1).padStart(3, "0")}.webp`;

    const nearest = (t: number) => {
      for (let r = 0; r < count; r++) {
        if (imgs[t - r]) return t - r;
        if (imgs[t + r]) return t + r;
      }
      return -1;
    };
    const draw = (force = false) => {
      const i = nearest(want);
      if (i < 0 || (!force && i === cur)) return;
      cur = i;
      const im = imgs[i]!;
      const W = canvas.width;
      const H = canvas.height;
      const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
      const w = im.naturalWidth * s;
      const h = im.naturalHeight * s;
      ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    };
    const resize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * d;
      canvas.height = window.innerHeight * d;
      draw(true);
    };
    const start = () => {
      if (started) return;
      started = true;
      const order: number[] = [];
      const seen = new Set<number>();
      const steps = reduce ? [count] : [16, 8, 4, 2, 1];
      for (const step of steps)
        for (let i = 0; i < count; i += step) {
          if (seen.has(i)) continue;
          seen.add(i);
          order.push(i);
        }
      let k = 0;
      const next = () => {
        if (k >= order.length) return;
        const i = order[k++];
        const im = new Image();
        im.decoding = "async";
        im.onload = () => {
          imgs[i] = im;
          if (cur < 0 || Math.abs(i - want) <= Math.abs(cur - want)) draw(true);
          next();
        };
        im.onerror = next;
        im.src = url(i);
      };
      for (let c = 0; c < 6; c++) next();
    };
    const update = () => {
      raf = 0;
      const r = section.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (r.top < window.innerHeight * 2.5 && r.bottom > -window.innerHeight) start();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      const prog = Math.min(1, Math.max(0, -r.top / total));
      want = reduce ? 0 : Math.round(prog * (count - 1));
      draw();
      if (bar.current) bar.current.style.width = `${prog * 100}%`;
      setP(prog);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    resize();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [base, count]);

  return (
    <section ref={sec} className="relative bg-ink-1 text-white" style={{ height: `${heightVh}vh` }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <canvas ref={cv} aria-label={label} role="img" className="absolute inset-0 h-full w-full" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg,rgba(15,16,18,.62) 0%,rgba(15,16,18,.15) 50%,rgba(15,16,18,0) 70%),linear-gradient(0deg,rgba(15,16,18,.5),rgba(15,16,18,0) 40%)",
          }}
        />
        {captions.map((c) => {
          const on = p >= c.from && p < c.to;
          return (
            <div
              key={c.title}
              aria-hidden={!on}
              className={`absolute bottom-[calc(12vh+env(safe-area-inset-bottom,0px))] left-[var(--gut)] max-w-[min(560px,calc(100%-40px))] transition-all duration-700 ${
                on ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <div className="eyebrow !text-bronze-l">{c.eyebrow}</div>
              <h2 className="mt-4 mb-3.5 text-[clamp(36px,5.4vw,78px)] leading-none">{c.title}</h2>
              <p className="m-0 max-w-[42ch] text-[17px] font-light opacity-90">{c.text}</p>
            </div>
          );
        })}
        <div className="absolute right-[var(--gut-r)] bottom-[calc(12vh+env(safe-area-inset-bottom,0px))] hidden items-center gap-3.5 font-mono text-[11px] tracking-[0.2em] opacity-85 md:flex">
          <span>{meter}</span>
          <i className="relative block h-px w-[120px] bg-white/25">
            <b ref={bar} className="absolute inset-y-0 left-0 w-0 bg-bronze-l" />
          </i>
        </div>
      </div>
    </section>
  );
}
