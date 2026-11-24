// Schematic floor plan drawn from room count and area until real 2D plans
// (plan_2d_url) are uploaded. Proportions are indicative only.
export type RoomKey = "living" | "bedroom" | "kids" | "kitchen" | "bath" | "wc" | "hall" | "balcony";
type Room = { x: number; y: number; w: number; h: number; label: RoomKey };

const LAYOUTS: Record<number, Room[]> = {
  1: [
    { x: 0, y: 0, w: 60, h: 62, label: "living" },
    { x: 60, y: 0, w: 40, h: 40, label: "kitchen" },
    { x: 60, y: 40, w: 40, h: 22, label: "bath" },
    { x: 0, y: 62, w: 100, h: 24, label: "hall" },
    { x: 0, y: 86, w: 100, h: 14, label: "balcony" },
  ],
  2: [
    { x: 0, y: 0, w: 50, h: 56, label: "living" },
    { x: 50, y: 0, w: 50, h: 56, label: "bedroom" },
    { x: 0, y: 56, w: 40, h: 30, label: "kitchen" },
    { x: 40, y: 56, w: 30, h: 30, label: "hall" },
    { x: 70, y: 56, w: 30, h: 30, label: "bath" },
    { x: 0, y: 86, w: 100, h: 14, label: "balcony" },
  ],
  3: [
    { x: 0, y: 0, w: 40, h: 50, label: "living" },
    { x: 40, y: 0, w: 30, h: 50, label: "bedroom" },
    { x: 70, y: 0, w: 30, h: 50, label: "kids" },
    { x: 0, y: 50, w: 36, h: 36, label: "kitchen" },
    { x: 36, y: 50, w: 34, h: 36, label: "hall" },
    { x: 70, y: 50, w: 30, h: 18, label: "bath" },
    { x: 70, y: 68, w: 30, h: 18, label: "wc" },
    { x: 0, y: 86, w: 100, h: 14, label: "balcony" },
  ],
};

export function PlanSchematic({ rooms, label, names }: { rooms: number; label: string; names: Record<RoomKey, string> }) {
  const layout = LAYOUTS[Math.min(Math.max(rooms, 1), 3)];
  return (
    <svg viewBox="-4 -4 108 108" role="img" aria-label={label} className="h-auto w-full bg-paper-3">
      {layout.map((r, i) => (
        <g key={i}>
          <rect
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            fill={r.label === "balcony" ? "rgba(168,131,79,.12)" : "#fff"}
            stroke="#1b1c1e"
            strokeWidth={r.label === "balcony" ? 0.4 : 0.9}
          />
          <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 1.2} textAnchor="middle" className="fill-[#6f695f] font-mono text-[3.2px] tracking-wider uppercase">
            {names[r.label]}
          </text>
        </g>
      ))}
      {/* door + windows hints */}
      <path d="M44 86 h12" stroke="#a8834f" strokeWidth="1.4" />
      <path d="M8 0 h20 M72 0 h20" stroke="#c9a46b" strokeWidth="1.6" />
    </svg>
  );
}
