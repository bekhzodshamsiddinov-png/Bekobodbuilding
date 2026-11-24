"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

/** Masonry gallery + full-screen lightbox (keyboard, swipe, focus return). */
export function Gallery({ items, mediaUrl }: { items: { key: string; caption: string }[]; mediaUrl: string }) {
  const tn = useTranslations("nav");
  const tt = useTranslations("tour");
  const [open, setOpen] = useState<number | null>(null);
  const [xl, setXl] = useState<string | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const touch = useRef<number | null>(null);
  const n = items.length;
  const show = (i: number) => {
    setXl(null);
    setOpen(((i % n) + n) % n);
  };

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open !== null && !d.open) d.showModal();
    if (open === null && d.open) d.close();
    if (open === null) return;
    const key = items[open].key;
    const im = new window.Image();
    im.onload = () => setXl(key);
    im.src = `${mediaUrl}/img/${key}-xl.webp`;
  }, [open, items, mediaUrl]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") show(open - 1);
      if (e.key === "ArrowRight") show(open + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const cur = open !== null ? items[open] : null;

  return (
    <>
      <div className="columns-1 gap-3.5 sm:columns-2 lg:columns-3">
        {items.map((it, i) => (
          <button
            key={it.key}
            type="button"
            onClick={() => show(i)}
            aria-label={it.caption}
            className="group relative mb-3.5 block w-full cursor-zoom-in overflow-hidden bg-paper-2 [break-inside:avoid]"
          >
            <Image
              src={`${mediaUrl}/img/${it.key}.webp`}
              alt={it.caption}
              width={1100}
              height={i % 3 === 1 ? 1400 : 760}
              sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
              className={`w-full object-cover transition-transform duration-1000 group-hover:scale-[1.03] ${i % 3 === 1 ? "aspect-[4/5]" : "aspect-[16/11]"}`}
            />
            <span className="absolute bottom-3 left-3 bg-[rgba(27,28,30,.6)] px-2.5 py-1.5 font-mono text-[10.5px] tracking-[0.14em] text-white uppercase">
              {it.caption}
            </span>
          </button>
        ))}
      </div>
      <dialog
        ref={dlg}
        onClose={() => setOpen(null)}
        aria-label={cur?.caption}
        className="m-0 h-full max-h-none w-full max-w-none bg-[rgba(14,15,16,.97)] p-0 text-white backdrop:bg-black/60"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null || open === null) return;
          const d = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(d) > 50) show(open + (d < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        {cur && open !== null && (
          <div className="grid h-full grid-rows-[auto_1fr_auto]">
            <div className="flex items-center justify-between px-[var(--gut)] pt-[calc(14px+env(safe-area-inset-top,0px))] pb-3.5 font-mono text-[12px] tracking-[0.12em]">
              <span>
                {open + 1} / {n}
              </span>
              <button type="button" onClick={() => setOpen(null)} aria-label={tn("close")} className="grid h-11 w-11 place-items-center text-[28px] leading-none" autoFocus>
                ×
              </button>
            </div>
            <div className="relative grid min-h-0 place-items-center px-2 md:px-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${mediaUrl}/img/${xl === cur.key ? `${cur.key}-xl` : cur.key}.webp`}
                alt={cur.caption}
                className="max-h-[calc(100svh-130px)] w-auto max-w-full object-contain"
              />
              {[
                [-1, tt("prev"), "left-2.5", "←"],
                [1, tt("next"), "right-2.5", "→"],
              ].map(([d, l, pos, ch]) => (
                <button
                  key={String(d)}
                  type="button"
                  aria-label={String(l)}
                  onClick={() => show(open + Number(d))}
                  className={`absolute top-1/2 ${pos} hidden h-[52px] w-[52px] -translate-y-1/2 place-items-center rounded-full border border-white/30 hover:bg-white hover:text-ink-1 md:grid`}
                >
                  {ch}
                </button>
              ))}
            </div>
            <p className="m-0 px-[var(--gut)] pt-3.5 pb-[calc(18px+env(safe-area-inset-bottom,0px))] text-center text-[14px] opacity-80">{cur.caption}</p>
          </div>
        )}
      </dialog>
    </>
  );
}
