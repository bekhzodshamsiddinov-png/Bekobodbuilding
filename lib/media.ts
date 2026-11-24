// Large media (video, renders, frame sequences) lives on a CDN, never in git.
// Until Cloudflare R2/Stream is connected, the Webuy GitHub Pages build serves it.
export const MEDIA_URL = (
  process.env.NEXT_PUBLIC_MEDIA_URL ?? "https://bekhzodshamsiddinov-png.github.io/Webuy/assets"
).replace(/\/$/, "");

export function media(path: string): string {
  return `${MEDIA_URL}/${path.replace(/^\//, "")}`;
}
