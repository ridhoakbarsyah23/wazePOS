import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";
import { MarketingPage } from "@/components/marketing/marketing-page";

let reduced = false;
let listeners: Array<{ query: string; listener: EventListener }> = [];
const matches = (query: string) => query.includes("prefers-reduced-motion: reduce") ? reduced
  : query.includes("prefers-reduced-motion: no-preference") ? !reduced
  : query.includes("max-width") ? false : true;

beforeEach(() => { vi.useFakeTimers();
  reduced = false;
  listeners = [];
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    get matches() { return matches(query); },
    addEventListener: (_: string, listener: EventListener) => { listeners.push({ query, listener }); },
    removeEventListener: (_: string, listener: EventListener) => { listeners = listeners.filter((item) => item.listener !== listener); },
    addListener: (listener: EventListener) => { listeners.push({ query, listener }); },
    removeListener: (listener: EventListener) => { listeners = listeners.filter((item) => item.listener !== listener); },
  }));
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const page = <MarketingPage trialUrl="/register" whatsappGeneralUrl="https://example.com/contact" whatsappTrialUrl="https://example.com/trial" />;

describe("GSAP landing lifecycle", () => {
  it("tidak mengiklankan QRIS sebelum integrasi pembayaran resmi tersedia", () => {
    reduced = true;
    const view = render(page);

    expect(view.container.textContent).not.toContain("QRIS");
    view.unmount();
  });

  it("membersihkan ScrollTrigger dan style saat unmount, termasuk StrictMode", () => {
    const baseline = ScrollTrigger.getAll().length;
    const view = render(<StrictMode>{page}</StrictMode>);
    const hero = view.container.querySelector<HTMLElement>(".hero-visual")!;
    expect(ScrollTrigger.getAll().length).toBeGreaterThan(baseline);
    view.unmount();
    expect(ScrollTrigger.getAll().length).toBe(baseline);
    expect(gsap.getTweensOf(hero)).toHaveLength(0);
    expect(hero.style.opacity).toBe("");
    expect(hero.style.transform).toBe("");
  }, 30_000);

  it("reduced motion tidak menyembunyikan konten atau membuat ScrollTrigger", () => {
    reduced = true;
    const baseline = ScrollTrigger.getAll().length;
    const view = render(page);
    expect(ScrollTrigger.getAll().length).toBe(baseline);
    view.container.querySelectorAll<HTMLElement>("[data-reveal], .hero-visual").forEach((element) => {
      expect(element.style.opacity).not.toBe("0");
      expect(element.style.visibility).not.toBe("hidden");
    });
    view.unmount();
  });

  it("menghentikan gerakan ketika preferensi reduced motion berubah", () => {
    const baseline = ScrollTrigger.getAll().length;
    const view = render(page);
    expect(ScrollTrigger.getAll().length).toBeGreaterThan(baseline);
    act(() => {
      reduced = true;
      // Force the same responsive rebuild GSAP uses for live media changes.
      gsap.matchMediaRefresh();
    });
    expect(ScrollTrigger.getAll().length).toBe(baseline);
    expect(view.container.querySelector<HTMLElement>(".hero-visual")!.style.opacity).toBe("");
    view.unmount();
  });
});
