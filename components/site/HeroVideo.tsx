"use client";

import { useEffect, useRef } from "react";

/**
 * Background hero video. The poster is a plain <img> rendered by the server
 * (fast LCP); the video fades in once it actually plays and is skipped for
 * reduced-motion and data-saver users.
 */
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (reduce || saveData) return;
    v.src = src;
    const onPlaying = () => v.classList.remove("opacity-0");
    v.addEventListener("playing", onPlaying, { once: true });
    v.play().catch(() => {});
    return () => v.removeEventListener("playing", onPlaying);
  }, [src]);

  return (
    <video
      ref={ref}
      muted
      playsInline
      loop
      preload="none"
      poster={poster}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700"
    />
  );
}
