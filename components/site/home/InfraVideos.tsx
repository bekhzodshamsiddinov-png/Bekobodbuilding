"use client";

import { useEffect, useRef } from "react";

export type InfraCard = { id: string; wide: boolean; eyebrow: string; title: string; text: string };

/** Video cards that load and play only while on screen (paused otherwise). */
export function InfraVideos({ cards, mediaUrl }: { cards: InfraCard[]; mediaUrl: string }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting) {
            if (!v.src) v.src = v.dataset.src!;
            v.play().catch(() => {});
          } else v.pause();
        }),
      { rootMargin: "200px 0px" },
    );
    root.current?.querySelectorAll("video").forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root} className="grid grid-cols-12 gap-1.5">
      {cards.map((c) => (
        <article
          key={c.id}
          className={`rv group relative col-span-12 min-h-[300px] overflow-hidden bg-ink-2 text-white md:min-h-[360px] ${c.wide ? "lg:col-span-8" : "lg:col-span-4"}`}
        >
          <video
            data-src={`${mediaUrl}/vid/${c.id}.mp4`}
            poster={`${mediaUrl}/vid/${c.id}.jpg`}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.4s] group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(15,16,18,.85)] to-transparent to-60%" />
          <div className="absolute right-6 bottom-6 left-6 z-[2]">
            <div className="eyebrow !text-bronze-l">{c.eyebrow}</div>
            <h3 className="mt-2.5 mb-1.5 text-[clamp(24px,2.3vw,32px)] leading-[1.1]">{c.title}</h3>
            <p className="m-0 max-w-[44ch] text-[14px] opacity-85">{c.text}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
