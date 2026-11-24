// Cinematic tour structure (ported from Webuy sayohat.html). Texts live in
// messages/*.json under `scenes.<id>` and `tourCards.<key>`; media on the CDN:
//   scn/<id>.webp (final frame), scn/<id>-t.webp (thumb), vid/<id>.mp4 (transition clip)

export type BuildingCode = "b12a" | "b12b" | "b16";
export type InfoKey = "shops" | "parking" | "play" | "entr" | "units";

export type Hotspot = {
  /** Position in % of the 16:9 frame. */
  x: number;
  y: number;
  left?: boolean;
} & ({ to: SceneId } | { building: BuildingCode } | { info: InfoKey });

export type SceneId = "hero" | "street" | "shops" | "facade" | "yard" | "play" | "arch" | "aerial" | "back";

export const SCENES: { id: SceneId; hots: Hotspot[] }[] = [
  { id: "hero", hots: [{ x: 55, y: 38, building: "b16" }, { x: 83, y: 57, building: "b12b" }, { x: 22, y: 80, to: "street", left: true }, { x: 62, y: 83, to: "yard" }] },
  { id: "street", hots: [{ x: 24, y: 56, to: "shops", left: true }, { x: 66, y: 68, info: "parking" }, { x: 50, y: 22, building: "b16" }] },
  { id: "shops", hots: [{ x: 52, y: 46, info: "shops" }, { x: 62, y: 20, to: "facade" }, { x: 30, y: 76, to: "yard", left: true }] },
  { id: "facade", hots: [{ x: 46, y: 70, info: "units" }, { x: 50, y: 46, building: "b12a" }] },
  { id: "yard", hots: [{ x: 19, y: 55, to: "play", left: true }, { x: 48, y: 14, to: "aerial" }, { x: 86, y: 76, info: "entr" }, { x: 40, y: 30, building: "b12b" }] },
  { id: "play", hots: [{ x: 69, y: 68, info: "play" }, { x: 22, y: 52, to: "arch", left: true }, { x: 86, y: 30, to: "aerial" }] },
  { id: "arch", hots: [{ x: 40, y: 36, building: "b12a" }, { x: 86, y: 44, to: "back" }, { x: 14, y: 62, to: "play", left: true }] },
  { id: "aerial", hots: [{ x: 58, y: 56, to: "play" }, { x: 26, y: 22, info: "parking", left: true }, { x: 12, y: 62, to: "yard", left: true }] },
  { id: "back", hots: [{ x: 55, y: 38, building: "b12a" }, { x: 14, y: 84, to: "hero", left: true }] },
];

export const BUILDING_IMAGES: Record<BuildingCode, string[]> = {
  b16: ["b16-hero", "b16-tower", "b16-street", "b16-far", "b16-pano"],
  b12b: ["b12b-wide", "b12b-corner", "b12b-yard", "b12b-court"],
  b12a: ["b12a-front", "b12a-lawn", "b12a-side", "b12a-back"],
};

/** Scene still used as the picture of an info card. */
export const INFO_IMAGE: Record<InfoKey, string> = {
  shops: "shops",
  parking: "aerial",
  play: "play",
  entr: "yard",
  units: "facade",
};
