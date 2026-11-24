// One entry point for analytics events: GA4, Meta Pixel and Yandex Metrika
// receive the same event when their snippets are present on the page.
type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    ym?: (id: number, method: string, goal: string, params?: Props) => void;
  }
}

export function track(event: string, props: Props = {}): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, props);
    window.fbq?.("trackCustom", event, props);
    const ymId = Number(process.env.NEXT_PUBLIC_YM_ID);
    if (ymId) window.ym?.(ymId, "reachGoal", event, props);
  } catch {
    // Analytics must never break the page.
  }
}
