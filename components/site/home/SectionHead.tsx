/** Numbered section rule: "LOYIHA HAQIDA ———————— 01". */
export function SectionHead({ n, label, dark = false }: { n: number; label: string; dark?: boolean }) {
  return (
    <div
      className={`mb-[clamp(36px,5vw,64px)] flex items-center justify-between border-b pb-3.5 font-mono text-[11px] tracking-[0.24em] uppercase ${
        dark ? "border-line-d text-muted-d" : "border-line text-muted"
      }`}
    >
      <span className={dark ? "text-bronze-l" : "text-bronze"}>{label}</span>
      <span>{String(n).padStart(2, "0")}</span>
    </div>
  );
}
