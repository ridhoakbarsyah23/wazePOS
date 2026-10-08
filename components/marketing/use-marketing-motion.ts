"use client";

import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type MotionOptions = {
  root: RefObject<HTMLDivElement | null>;
  feature: string;
  showcase: string;
  comparisonOpen: boolean;
};

export function useMarketingMotion({ root, feature, showcase, comparisonOpen }: MotionOptions) {
  useLayoutEffect(() => {
    const page = root.current;
    if (!page) return;
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    let disposed = false;

    media.add({
      motion: "(prefers-reduced-motion: no-preference)",
      reduced: "(prefers-reduced-motion: reduce)",
      desktop: "(min-width: 821px)",
      pointer: "(hover: hover) and (pointer: fine)",
    }, (context) => {
      const { reduced, desktop, pointer } = context.conditions!;
      const select = gsap.utils.selector(page);
      if (reduced) {
        gsap.set(select(".site-progress-bar"), { scaleX: 1 });
        return;
      }

      const distance = desktop ? 26 : 14;
      gsap.timeline({ defaults: { duration: 0.65, ease: "power3.out", clearProps: "opacity,transform" } })
        .from(select(".hero-copy > *"), { opacity: 0, y: distance, stagger: 0.065 })
        .from(select(".hero-visual"), { opacity: 0, y: distance, duration: 0.85 }, 0.15);

      // Every anchored section owns a distinct entrance; unlisted reveals keep the generic fade-up.
      const groupTimelines = new Map<HTMLElement, gsap.core.Timeline>();
      const isFresh = (element: HTMLElement) => element.getBoundingClientRect().bottom >= 0;
      const choreography: Record<string, string> = {
        fitur: ".section-heading, .feature-tabs, .feature-panel",
        "cara-kerja": ".steps-intro, .steps-list article",
        harga: ".pricing-heading, .pricing-card",
        faq: ".faq-intro, .faq-item",
      };
      const routed = new Set<HTMLElement>();
      select("[data-motion]").forEach((section: HTMLElement) => {
        const kind = section.dataset.motion ?? "";
        if (!choreography[kind]) return;
        const within = (selector: string) => Array.from(section.querySelectorAll<HTMLElement>(selector)).filter(isFresh);
        const targets = within(choreography[kind]);
        if (!targets.length) return;
        targets.forEach((element) => routed.add(element));
        gsap.set(targets, { transition: "none" });
        // A paused timeline plus an explicit trigger keeps creation synchronous: a
        // timeline-based scrollTrigger defers its first refresh by a tick, which corrupts
        // ScrollTrigger's refresh loop while later triggers are still being created.
        const timeline = gsap.timeline({
          paused: true,
          defaults: { ease: "power3.out", immediateRender: true, clearProps: "opacity,transform,clipPath,transition" },
        });
        groupTimelines.set(section, timeline);

        if (kind === "fitur") {
          const heading = within(".section-heading")[0];
          const tabs = within(".feature-tabs")[0];
          const terminal = section.querySelector<HTMLElement>(".terminal-card");
          const copy = section.querySelector<HTMLElement>(".feature-copy");
          if (heading) timeline.from(heading, { opacity: 0, y: distance, duration: 0.6 }, 0);
          if (tabs) timeline.from(tabs, { opacity: 0, y: distance * 0.6, duration: 0.5 }, 0.15);
          // Receipt-print wipe: the terminal "prints" downward while the copy slides in from the left.
          if (terminal) timeline.fromTo(terminal,
            { clipPath: "inset(0% 0% 100% 0% round 16px)", y: 18, opacity: 0.5 },
            { clipPath: "inset(0% 0% 0% 0% round 16px)", duration: 0.8, ease: "power2.out" }, 0.45);
          if (copy) timeline.from(Array.from(copy.children), { opacity: 0, x: -24, stagger: 0.07, duration: 0.5 }, 0.6);
        }

        if (kind === "cara-kerja") {
          const intro = within(".steps-intro")[0];
          const list = section.querySelector<HTMLElement>(".steps-list");
          if (intro) timeline.from(intro, { opacity: 0, y: distance, duration: 0.6 }, 0);
          // The connector line draws itself before each step pops in sequence.
          if (list) timeline.fromTo(list, { "--steps-line": 0 }, { "--steps-line": 1, duration: 1, ease: "power2.inOut" }, 0.2);
          within(".steps-list article").forEach((step, index) => {
            const at = 0.45 + index * 0.22;
            timeline.from(step, { opacity: 0, y: 20, duration: 0.5 }, at);
            const number = step.querySelector<HTMLElement>(".step-number");
            if (number) timeline.from(number, { scale: 0.4, duration: 0.5, ease: "back.out(1.7)" }, at + 0.05);
          });
        }

        if (kind === "harga") {
          const heading = within(".pricing-heading")[0];
          if (heading) timeline.from(heading, { opacity: 0, y: distance, duration: 0.6 }, 0);
          within(".pricing-card").forEach((card, index) => {
            const at = 0.2 + index * 0.14;
            timeline.from(card, { opacity: 0, x: desktop ? (index % 2 === 0 ? -48 : 48) : 0, y: desktop ? 0 : 20, duration: 0.7 }, at);
            const badge = card.querySelector<HTMLElement>(".pricing-badge");
            if (badge) timeline.from(badge, { opacity: 0, scale: 0, duration: 0.45, ease: "back.out(2)" }, at + 0.45);
            const features = card.querySelectorAll<HTMLElement>(".plan-features li");
            if (features.length) timeline.from(Array.from(features), { opacity: 0, x: -10, stagger: 0.03, duration: 0.35 }, at + 0.35);
          });
        }

        if (kind === "faq") {
          const intro = within(".faq-intro")[0];
          const items = within(".faq-item");
          if (intro) timeline.from(intro, { opacity: 0, y: distance, duration: 0.6 }, 0);
          if (items.length) timeline.from(items, { opacity: 0, y: 18, rotation: -1.5, scale: 0.98, transformOrigin: "left top", stagger: 0.07, duration: 0.55 }, 0.2);
        }

        ScrollTrigger.create({ trigger: targets[0], start: kind === "faq" ? "top 92%" : "top 85%", once: true, onEnter: () => timeline.play() });
      });

      select("[data-reveal]").forEach((element: HTMLElement) => {
        // Elements already above the viewport remain visible on restored scroll positions.
        if (routed.has(element) || element.getBoundingClientRect().bottom < 0) return;
        gsap.from(element, {
          opacity: 0, y: distance, duration: 0.65, ease: "power3.out",
          clearProps: "opacity,transform,transition",
          onStart: () => { element.style.transition = "none"; },
          scrollTrigger: { trigger: element, start: "top 92%", once: true },
        });
      });

      gsap.fromTo(select(".site-progress-bar"), { scaleX: 0 }, {
        scaleX: 1, ease: "none",
        scrollTrigger: { trigger: page, start: "top top", end: "bottom bottom", scrub: true },
      });

      gsap.from(select(".hero-flow li"), {
        opacity: 0, x: -12, stagger: 0.08, duration: 0.55, delay: 0.4, ease: "power3.out", clearProps: "opacity,transform",
      });
      gsap.from(select(".receipt-paper"), {
        opacity: 0, y: -24, rotate: -4, duration: 0.75, delay: 0.5, ease: "back.out(1.35)", clearProps: "opacity,transform",
      });

      // Decorative loops only run while their section is visible and the tab is active.
      const heroLoop = gsap.timeline({ paused: true, repeat: -1, yoyo: true })
        .to(select(".hero-orb"), { x: -16, y: 12, scale: 1.04, duration: 5, ease: "sine.inOut" }, 0)
        .to(select(".floating-card"), { y: -8, stagger: 0.25, duration: 2.5, ease: "sine.inOut" }, 0)
        .to(select(".receipt-stack"), { y: -6, rotate: -1.2, duration: 2.8, ease: "sine.inOut" }, 0.1)
        .to(select(".product-shot--hero .product-shot-frame"), { y: -5, rotate: 0.45, duration: 3.2, ease: "sine.inOut" }, 0.2)
        .to(select(".visual-backdrop"), { scale: 1.015, opacity: 0.86, duration: 3.6, ease: "sine.inOut" }, 0)
        .to(select(".live-dot"), { opacity: 0.45, duration: 2.5, ease: "sine.inOut" }, 0);
      const flowItems = select(".hero-flow li") as HTMLElement[];
      const flowBadges = select(".hero-flow span") as HTMLElement[];
      const receiptTotal = select(".receipt-paper strong")[0] as HTMLElement | undefined;
      const cardIcons = select(".floating-card > span") as HTMLElement[];
      const productCaption = select(".product-shot--hero figcaption")[0] as HTMLElement | undefined;
      const transactionLoop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.5, defaults: { ease: "power2.inOut" } });
      const [flowOne, flowTwo, flowThree, flowFour] = flowItems;
      const [badgeOne, badgeTwo, badgeThree, badgeFour] = flowBadges;
      const [cardOne, cardTwo] = cardIcons;
      if (flowOne && flowTwo && flowThree && flowFour && badgeOne && badgeTwo && badgeThree && badgeFour && cardOne && cardTwo && receiptTotal && productCaption) {
        gsap.set([...flowItems, ...flowBadges, ...cardIcons, ...(productCaption ? [productCaption] : []), ...(receiptTotal ? [receiptTotal] : [])], {
          willChange: "transform, opacity, box-shadow",
        });
        transactionLoop
          .to(flowItems, { opacity: 0.72, scale: 0.985, duration: 0.2 }, 0)
          .to(productCaption, { y: -4, scale: 1.025, duration: 0.38 }, 0.15)
          .to(flowOne, { opacity: 1, y: -3, scale: 1.035, boxShadow: "0 18px 38px rgba(10,67,48,.18)", duration: 0.42 }, 0.2)
          .to(badgeOne, { scale: 1.12, backgroundColor: "#198760", duration: 0.36 }, 0.2)
          .to(flowOne, { y: 0, scale: 1, boxShadow: "0 12px 28px rgba(10,67,48,.1)", duration: 0.42 }, 0.9)
          .to(productCaption, { y: 0, scale: 1, duration: 0.34 }, 0.92)
          .to(flowTwo, { opacity: 1, y: -3, scale: 1.035, boxShadow: "0 18px 38px rgba(10,67,48,.18)", duration: 0.42 }, 1.05)
          .to(badgeTwo, { scale: 1.12, backgroundColor: "#198760", duration: 0.36 }, 1.05)
          .to(cardOne, { scale: 1.12, duration: 0.34 }, 1.18)
          .to([flowTwo, cardOne], { y: 0, scale: 1, boxShadow: "0 12px 28px rgba(10,67,48,.1)", duration: 0.42 }, 1.72)
          .to(flowThree, { opacity: 1, y: -3, scale: 1.035, boxShadow: "0 18px 38px rgba(10,67,48,.18)", duration: 0.42 }, 1.85)
          .to(badgeThree, { scale: 1.12, backgroundColor: "#198760", duration: 0.36 }, 1.85)
          .to(receiptTotal, { scale: 1.08, color: "#0f8b61", duration: 0.38 }, 2)
          .to([flowThree, receiptTotal], { y: 0, scale: 1, color: "#147554", boxShadow: "0 12px 28px rgba(10,67,48,.1)", duration: 0.42 }, 2.52)
          .to(flowFour, { opacity: 1, y: -3, scale: 1.035, boxShadow: "0 18px 38px rgba(10,67,48,.18)", duration: 0.42 }, 2.66)
          .to(badgeFour, { scale: 1.12, backgroundColor: "#198760", duration: 0.36 }, 2.66)
          .to(cardTwo, { scale: 1.12, duration: 0.34 }, 2.8)
          .to([flowFour, cardTwo], { y: 0, scale: 1, boxShadow: "0 12px 28px rgba(10,67,48,.1)", duration: 0.42 }, 3.32)
          .to(flowItems, { opacity: 1, scale: 1, duration: 0.28 }, 3.75);
      }
      const track = select(".business-strip-track")[0] as HTMLElement | undefined;
      const strip = select(".business-strip")[0] as HTMLElement | undefined;
      let stripHovered = false;
      const marquee = track ? gsap.to(track, {
        xPercent: -100 / track.children.length, duration: desktop ? 28 : 34,
        repeat: -1, ease: "none", paused: true,
      }) : null;
      // Initialized before callbacks read it; onToggle may fire during creation.
      const triggers: { strip?: ScrollTrigger; hero?: ScrollTrigger } = {};
      function syncLoops() {
        const shouldPauseHero = document.hidden || !triggers.hero?.isActive;
        heroLoop.paused(shouldPauseHero);
        transactionLoop.paused(shouldPauseHero);
        marquee?.paused(document.hidden || !triggers.strip?.isActive || stripHovered || Boolean(strip?.matches(":focus-within")));
      }
      triggers.hero = ScrollTrigger.create({ trigger: select(".hero")[0], start: "top bottom", end: "bottom top", onToggle: syncLoops });
      triggers.strip = strip ? ScrollTrigger.create({ trigger: strip, start: "top bottom", end: "bottom top", onToggle: syncLoops }) : undefined;
      const pauseStrip = () => { stripHovered = true; syncLoops(); };
      const resumeStrip = () => { stripHovered = false; syncLoops(); };
      strip?.addEventListener("pointerenter", pauseStrip);
      strip?.addEventListener("pointerleave", resumeStrip);
      strip?.addEventListener("focusin", syncLoops);
      strip?.addEventListener("focusout", syncLoops);
      document.addEventListener("visibilitychange", syncLoops);
      syncLoops();

      const visual = select(".hero-visual")[0] as HTMLElement;
      const tilt = select(".hero-tilt")[0] as HTMLElement;
      let move: ((event: PointerEvent) => void) | undefined;
      let reset: (() => void) | undefined;
      if (desktop && pointer && visual && tilt) {
        gsap.set(tilt, { transformPerspective: 1000 });
        const rotateX = gsap.quickTo(tilt, "rotationX", { duration: 0.45, ease: "power3.out" });
        const rotateY = gsap.quickTo(tilt, "rotationY", { duration: 0.45, ease: "power3.out" });
        move = (event) => {
          const bounds = visual.getBoundingClientRect();
          rotateX(-((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 5);
          rotateY(((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 5);
        };
        reset = () => { rotateX(0); rotateY(0); };
        visual.addEventListener("pointermove", move);
        visual.addEventListener("pointerleave", reset);
      }

      // Keyboard navigation must never focus an invisible reveal target.
      const revealFocus = (event: FocusEvent) => {
        const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-reveal]") : null;
        if (!target) return;
        const section = target.closest<HTMLElement>("[data-motion]");
        const group = section ? groupTimelines.get(section) : undefined;
        if (group) { group.progress(1); return; }
        gsap.getTweensOf(target).forEach((tween) => tween.progress(1));
      };
      page.addEventListener("focusin", revealFocus);
      return () => {
        document.removeEventListener("visibilitychange", syncLoops);
        strip?.removeEventListener("pointerenter", pauseStrip);
        strip?.removeEventListener("pointerleave", resumeStrip);
        strip?.removeEventListener("focusin", syncLoops);
        strip?.removeEventListener("focusout", syncLoops);
        if (move) visual.removeEventListener("pointermove", move);
        if (reset) visual.removeEventListener("pointerleave", reset);
        page.removeEventListener("focusin", revealFocus);
      };
    }, page);

    // FAQ expansion and responsive text wrapping change the scroll distances.
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let previousHeight = page.offsetHeight;
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (page.offsetHeight === previousHeight) return;
      previousHeight = page.offsetHeight;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { if (!disposed) ScrollTrigger.refresh(); }, 120);
    });
    resizeObserver?.observe(page);
    void document.fonts?.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
    return () => {
      disposed = true;
      clearTimeout(refreshTimer);
      resizeObserver?.disconnect();
      media.revert();
    };
  }, [root]);

  useLayoutEffect(() => {
    const page = root.current;
    if (!page) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const select = gsap.utils.selector(page);
      gsap.from(select(".feature-panel .panel-swap"), {
        opacity: 0, y: 12, duration: 0.4, stagger: 0.06, ease: "power2.out", clearProps: "opacity,transform",
      });
    }, page);
    ScrollTrigger.refresh();
    return () => media.revert();
  }, [root, feature]);

  useLayoutEffect(() => {
    const page = root.current;
    if (!page) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const select = gsap.utils.selector(page);
      gsap.from(select(".showcase-frame .product-shot"), { opacity: 0, y: 12, scale: 0.985, duration: 0.42, ease: "power2.out", clearProps: "opacity,transform" });
      gsap.from(select(".showcase-frame figcaption"), { opacity: 0, y: 8, duration: 0.32, delay: 0.08, ease: "power2.out", clearProps: "opacity,transform" });
    }, page);
    ScrollTrigger.refresh();
    return () => media.revert();
  }, [root, showcase]);

  useLayoutEffect(() => {
    const page = root.current;
    if (!page) return;
    const media = gsap.matchMedia();
    if (comparisonOpen) media.add("(max-width: 820px) and (prefers-reduced-motion: no-preference)", () => {
      gsap.from(page.querySelector("#pricing-comparison-body"), { opacity: 0, y: 8, duration: 0.3, clearProps: "opacity,transform", onComplete: () => ScrollTrigger.refresh() });
    });
    ScrollTrigger.refresh();
    return () => media.revert();
  }, [root, comparisonOpen]);
}
