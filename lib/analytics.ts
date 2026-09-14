export type MarketingEvent =
  | "click_try_free"
  | "click_whatsapp"
  | "click_pricing"
  | "click_demo"
  | "click_feature"
  | "submit_lead_form";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function trackEvent(event: MarketingEvent, detail: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...detail });
  window.dispatchEvent(new CustomEvent("wazepos:analytics", { detail: { event, ...detail } }));
}
