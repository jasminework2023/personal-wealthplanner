import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { TourStep } from "../lib/tourSteps";
import { getTourSteps } from "../lib/tourSteps";

type StartDetail = { type?: "main" | "page"; route?: string };

const DONE_KEY = "wp_tour_done_v1";

function storageDone() {
  try { return localStorage.getItem(DONE_KEY) === "1"; } catch { return false; }
}

function storageSetDone() {
  try { localStorage.setItem(DONE_KEY, "1"); } catch {}
}

function selectorFor(step: TourStep) {
  return window.matchMedia("(min-width: 768px)").matches ? step.selectorDesktop : step.selectorMobile;
}

export function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [waiting, setWaiting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const startRequestRef = useRef<StartDetail | null>(null);

  const start = (detail: StartDetail = { type: "main" }) => {
    const nextType = detail.type || "main";
    const nextRoute = detail.route || location.pathname;
    const nextSteps = getTourSteps(nextType, nextRoute);
    if (!nextSteps.length) return;
    startRequestRef.current = { type: nextType, route: nextRoute };
    setSteps(nextSteps);
    setIndex(0);
    setActive(true);
  };

  useEffect(() => {
    const handler = (event: Event) => start((event as CustomEvent<StartDetail>).detail || { type: "main" });
    window.addEventListener("wealthplanner:start-tour", handler);
    return () => window.removeEventListener("wealthplanner:start-tour", handler);
  }, [location.pathname]);

  useEffect(() => {
    if (active) return;
    if (location.pathname !== "/") return;
    if (storageDone()) return;
    const timer = window.setTimeout(() => {
      if (document.querySelector('[role="dialog"]:not([data-tour-dialog="true"])')) return;
      start({ type: "main", route: "/" });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [active, location.pathname]);

  useEffect(() => {
    if (!active || !steps[index]) return;
    const step = steps[index];
    const desiredRoute = step.route;
    if (location.pathname !== desiredRoute && !(desiredRoute === "/calculator" && location.pathname.startsWith("/calculator/"))) {
      navigate(desiredRoute);
      return;
    }

    let elapsed = 0;
    let poll = 0;
    setWaiting(true);
    setTarget(null);
    setRect(null);

    const find = () => {
      const element = document.querySelector(selectorFor(step)) as HTMLElement | null;
      const modalOpen = !!document.querySelector('[role="dialog"]:not([data-tour-dialog="true"])');
      if (element && !modalOpen) {
        setTarget(element);
        window.setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          window.setTimeout(() => {
            setWaiting(false);
            setRect(element.getBoundingClientRect());
          }, 260);
        }, 20);
        return;
      }
      if (elapsed >= 2000) {
        setWaiting(false);
        setIndex((value) => Math.min(value + 1, steps.length - 1));
        return;
      }
      elapsed += 100;
      poll = window.setTimeout(find, 100);
    };

    find();
    return () => window.clearTimeout(poll);
  }, [active, index, steps, location.pathname, navigate]);

  useEffect(() => {
    if (!active || !target) return;
    const update = () => setRect(target.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [active, target]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [active]);

  useEffect(() => {
    if (active && !waiting) dialogRef.current?.focus();
  }, [active, waiting, index]);

  function finish(markDone: boolean) {
    if (markDone) storageSetDone();
    setActive(false);
    setTarget(null);
    setRect(null);
    setSteps([]);
    setIndex(0);
  }

  function skip() {
    finish(true);
  }

  function next() {
    if (index >= steps.length - 1) {
      finish(true);
      return;
    }
    setIndex((value) => value + 1);
  }

  function back() {
    if (index > 0) setIndex((value) => value - 1);
  }

  if (!active || !steps[index]) return null;

  const step = steps[index];
  const safeRect = rect;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const padding = 6;
  const highlight = safeRect ? {
    left: Math.max(0, safeRect.left - padding),
    top: Math.max(0, safeRect.top - padding),
    width: Math.min(viewportW, safeRect.width + padding * 2),
    height: Math.min(viewportH, safeRect.height + padding * 2),
  } : null;

  const cardWidth = Math.min(300, viewportW - 24);
  let cardLeft = highlight ? highlight.left + highlight.width / 2 - cardWidth / 2 : (viewportW - cardWidth) / 2;
  let cardTop = highlight ? highlight.top + highlight.height + 12 : 80;
  const cardHeightEstimate = 180;
  if (highlight && cardTop + cardHeightEstimate > viewportH - 12) {
    cardTop = highlight.top - cardHeightEstimate - 12;
  }
  if (highlight && highlight.top > viewportH * 0.68 && viewportW < 768) {
    cardTop = viewportH - 184;
  }
  cardLeft = Math.max(12, Math.min(cardLeft, viewportW - cardWidth - 12));
  cardTop = Math.max(12, Math.min(cardTop, viewportH - 12 - cardHeightEstimate));

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" aria-hidden={false}>
      <div className="absolute inset-0 bg-black/55" />
      {highlight && <div
        className="absolute rounded-[14px] outline outline-2 outline-[#6EE7A8] shadow-[0_0_0_9999px_rgba(0,0,0,.55)]"
        style={{ left: highlight.left, top: highlight.top, width: highlight.width, height: highlight.height }}
      />}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        data-tour-dialog="true"
        tabIndex={-1}
        className="pointer-events-auto absolute rounded-[14px] bg-white p-[14px] shadow-[0_18px_60px_rgba(0,0,0,.18)] text-forest-900 dark:bg-[rgb(var(--c-surface))] dark:text-white transition-opacity duration-200"
        style={{ left: cardLeft, top: cardTop, width: cardWidth }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold leading-5">{step.title}</h2>
            <p className="mt-1 text-[13px] leading-5 text-charcoal/65 dark:text-[rgb(var(--c-charcoal))]/65">{step.description}</p>
          </div>
          <span className="shrink-0 pt-0.5 text-[11px] text-charcoal/40 dark:text-[rgb(var(--c-charcoal))]/45">{index + 1}/{steps.length}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <button type="button" onClick={skip} className="min-h-10 rounded-lg px-2 text-[12px] font-medium text-charcoal/55 hover:text-forest-700 dark:text-[rgb(var(--c-charcoal))]/60">Lewati</button>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={back} disabled={index === 0} className="min-h-10 rounded-lg border border-charcoal/10 px-3 text-[12px] font-semibold text-charcoal/65 disabled:opacity-30 dark:border-white/10 dark:text-white/70">Kembali</button>
            <button type="button" onClick={next} className="min-h-10 rounded-lg bg-[#0B6B47] px-3.5 text-[12px] font-semibold text-white">{index === steps.length - 1 ? "Selesai" : "Lanjut"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
