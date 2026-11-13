import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { TourStep } from "../lib/tourSteps";
import { getTourSteps } from "../lib/tourSteps";

type StartDetail = { type?: "main" | "page" | "usage"; route?: string };

const DONE_KEY = "wp_tour_done_v4";
const ACTIVE_TOUR_KEY = "wp_active_tour_v1";

function storageDone() {
  try { return localStorage.getItem(DONE_KEY) === "1"; } catch { return false; }
}

function storageSetDone() {
  try { localStorage.setItem(DONE_KEY, "1"); } catch {}
}

function selectorFor(step: TourStep) {
  return window.matchMedia("(min-width: 768px)").matches ? step.selectorDesktop : step.selectorMobile;
}

function stepsForDevice(steps: TourStep[]) {
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  return steps.filter((step) => !step.mobileOnly && !step.desktopOnly || (mobile && step.mobileOnly) || (!mobile && step.desktopOnly));
}

export function GuidedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [tourType, setTourType] = useState<"main" | "page" | "usage">("main");
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [usagePrompt, setUsagePrompt] = useState(false);
  const [completionPrompt, setCompletionPrompt] = useState(false);
  const [welcomePrompt, setWelcomePrompt] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const startRequestRef = useRef<StartDetail | null>(null);

  const start = (detail: StartDetail = { type: "main" }) => {
    const nextType = detail.type || "main";
    const nextRoute = detail.route || location.pathname;
    let nextSteps = stepsForDevice(getTourSteps(nextType, nextRoute));
    if (!nextSteps.length && nextType === "page") nextSteps = getTourSteps("main", "/");
    if (!nextSteps.length) return;
    startRequestRef.current = { type: nextType, route: nextRoute };
    setSteps(nextSteps);
    setTourType(nextType);
    setIndex(0);
    setActive(true);
    try {
      sessionStorage.setItem(ACTIVE_TOUR_KEY, JSON.stringify({ type: nextType, route: nextRoute, index: 0 }));
    } catch {}
    if (nextType === "usage" && location.pathname !== nextRoute) {
      navigate(nextRoute);
    }
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<StartDetail>).detail || { type: "main" };
      if (detail.type === "main") {
        setUsagePrompt(false);
        setCompletionPrompt(false);
        setWelcomePrompt(true);
        return;
      }
      start(detail);
    };
    window.addEventListener("wealthplanner:start-tour", handler);
    return () => window.removeEventListener("wealthplanner:start-tour", handler);
  }, [location.pathname]);

  useEffect(() => {
    // Restore Tour 2 after a route change/remount so navigation does not restart
    // the tour from step 1.
    try {
      const saved = JSON.parse(sessionStorage.getItem(ACTIVE_TOUR_KEY) || "null");
      if (saved?.type === "usage" && Number.isInteger(saved.index)) {
        const restoredSteps = stepsForDevice(getTourSteps("usage", saved.route || "/"));
        if (restoredSteps.length) {
          setSteps(restoredSteps);
          setTourType("usage");
          setIndex(Math.min(saved.index, restoredSteps.length - 1));
          setActive(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!active || tourType !== "usage") return;
    try {
      sessionStorage.setItem(ACTIVE_TOUR_KEY, JSON.stringify({
        type: "usage",
        route: steps[index]?.route || "/",
        index,
      }));
    } catch {}
  }, [active, tourType, index, steps]);

  useEffect(() => {
    if (!active || !steps[index]) return;
    const step = steps[index];
    const desiredRoute = step.route;
    const routeMatches = location.pathname === desiredRoute || (desiredRoute === "/calculator" && location.pathname.startsWith("/calculator/"));

    // Never move the user to another page just because they pressed "Lanjut".
    // A cross-page step must be opened explicitly by the user.
    if (!routeMatches) {
      setWaiting(false);
      setTarget(null);
      setRect(null);
      return;
    }

    let elapsed = 0;
    let poll = 0;
    setWaiting(true);
    setTarget(null);
    setRect(null);

    const find = () => {
      // Action steps can point to a navigation control on the current page
      // even when clicking it will navigate to the route of the next screen.
      // The target must be visible first; the route change happens from the
      // user's actual click on that highlighted control.
      const targetMayBeOnCurrentRoute = step.advanceOnTargetClick || routeMatches;
      const element = targetMayBeOnCurrentRoute
        ? document.querySelector(selectorFor(step)) as HTMLElement | null
        : null;
      const elementRect = element?.getBoundingClientRect();
      const styles = element ? window.getComputedStyle(element) : null;
      const elementVisible = !!element &&
        !!elementRect &&
        elementRect.width > 0 &&
        elementRect.height > 0 &&
        styles?.display !== "none" &&
        styles?.visibility !== "hidden" &&
        styles?.opacity !== "0";

      // Only block the tour when a real, visible modal is open. Hidden dialogs
      // mounted elsewhere in the app must not prevent spotlight detection.
      const modalOpen = Array.from(document.querySelectorAll('[role="dialog"]:not([data-tour-dialog="true"])'))
        .some((dialog) => {
          const r = (dialog as HTMLElement).getBoundingClientRect();
          const s = window.getComputedStyle(dialog);
          return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
        });

      if (elementVisible && !modalOpen) {
        setTarget(element);
        window.setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          window.setTimeout(() => {
            const nextRect = element.getBoundingClientRect();
            if (nextRect.width > 0 && nextRect.height > 0) {
              setWaiting(false);
              setRect(nextRect);
            } else {
              find();
            }
          }, 260);
        }, 20);
        return;
      }
      if (elapsed >= 5000) {
        setWaiting(false);
        // Do not silently skip a step when its target is temporarily unavailable.
        // Keep the explanation card visible so the user can still retry the step.
        setTarget(null);
        setRect(null);
        return;
      }
      elapsed += 100;
      poll = window.setTimeout(find, 100);
    };

    find();
    return () => window.clearTimeout(poll);
  }, [active, index, steps, location.pathname, navigate]);

  useEffect(() => {
    if (!active || !target || !steps[index]?.advanceOnTargetClick) return;

    const handleTargetClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || !target.contains(event.target)) return;

      const nextStep = steps[index + 1];
      if (!nextStep) {
        if (tourType === "usage") {
          finish(true);
          setCompletionPrompt(true);
        }
        return;
      }

      // Action steps should advance only after the UI action has actually
      // produced the next target/page. This prevents the tour from jumping
      // ahead before the Profile menu or Settings page is ready.
      let elapsed = 0;
      let poll = 0;

      const waitForNextStep = () => {
        const currentPath = window.location.pathname;
        const routeMatches =
          currentPath === nextStep.route ||
          (nextStep.route === "/calculator" && currentPath.startsWith("/calculator/"));

        const nextTarget = routeMatches
          ? document.querySelector(selectorFor(nextStep)) as HTMLElement | null
          : null;

        const rect = nextTarget?.getBoundingClientRect();
        const styles = nextTarget ? window.getComputedStyle(nextTarget) : null;
        const visible =
          !!nextTarget &&
          !!rect &&
          rect.width > 0 &&
          rect.height > 0 &&
          styles?.display !== "none" &&
          styles?.visibility !== "hidden" &&
          styles?.opacity !== "0";

        if (routeMatches && visible) {
          window.clearTimeout(poll);
          setIndex((value) => Math.min(value + 1, steps.length - 1));
          return;
        }

        if (elapsed >= 3000) {
          window.clearTimeout(poll);
          // If the next UI is still not ready, keep the current step instead
          // of jumping to an unrelated page/slide.
          return;
        }

        elapsed += 100;
        poll = window.setTimeout(waitForNextStep, 100);
      };

      window.setTimeout(waitForNextStep, 50);
    };

    target.addEventListener("click", handleTargetClick);
    return () => target.removeEventListener("click", handleTargetClick);
  }, [active, target, steps, index, location.pathname]);

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

  // The tour must not lock the page. Users need to scroll while the spotlight
  // guides them to controls that may be below the fold.
  useEffect(() => {
    if (active && !waiting) dialogRef.current?.focus();
  }, [active, waiting, index]);

  function finish(markDone: boolean) {
    if (markDone || tourType === "usage") storageSetDone();
    setActive(false);
    setTarget(null);
    try { sessionStorage.removeItem(ACTIVE_TOUR_KEY); } catch {}
    setRect(null);
    setSteps([]);
    setTourType("main");
    setIndex(0);
  }

  function skip() {
    finish(true);
  }

  function openStepPage() {
    const step = steps[index];
    if (!step || !step.route) return;
    navigate(step.route);
  }

  function next() {
    if (index >= steps.length - 1) {
      if (tourType === "main") {
        storageSetDone();
        setActive(false);
        setTarget(null);
        setRect(null);
        setSteps([]);
        try { sessionStorage.removeItem(ACTIVE_TOUR_KEY); } catch {}
        setTourType("main");
        setIndex(0);
        setUsagePrompt(true);
        return;
      }
      if (tourType === "usage") {
        finish(true);
        setCompletionPrompt(true);
        return;
      }
      finish(true);
      return;
    }
    setIndex((value) => value + 1);
  }

  function back() {
    if (index > 0) setIndex((value) => value - 1);
  }

  if (welcomePrompt && !active) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4">
        <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[18px] bg-white p-5 shadow-[0_18px_60px_rgba(0,0,0,.2)] text-forest-900 dark:bg-[rgb(var(--c-surface))] dark:text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#0B6B47] text-xl">👋</div>
          <h2 className="mt-3 text-[16px] font-bold">Selamat datang di Tour 1, Pengenalan Aplikasi</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-charcoal/65 dark:text-white/65">Kita kenalan dulu dengan navigasi dan bagian utama Wealthplanner. Setelah ini selesai, kamu akan ditawarkan Tour 2 untuk belajar cara menggunakan aplikasinya dari awal.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => { storageSetDone(); setWelcomePrompt(false); }} className="flex-1 min-h-10 rounded-xl border border-charcoal/10 px-3 text-[12px] font-semibold text-charcoal/65 dark:border-white/10 dark:text-white/70">Nanti</button>
            <button type="button" onClick={() => { setWelcomePrompt(false); start({ type: "main", route: "/" }); }} className="flex-1 min-h-10 rounded-xl bg-[#0B6B47] px-3 text-[12px] font-semibold text-white">Mulai Tour 1</button>
          </div>
        </div>
      </div>
    );
  }

  if (completionPrompt && !active) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4">
        <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[18px] bg-white p-5 shadow-[0_18px_60px_rgba(0,0,0,.2)] text-forest-900 dark:bg-[rgb(var(--c-surface))] dark:text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#0B6B47] text-xl">🎉</div>
          <h2 className="mt-3 text-[16px] font-bold">Selamat! Kamu sudah selesai 🎉</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-charcoal/65 dark:text-white/65">Sekarang kamu sudah mengenal alur utama Wealthplanner — mulai dari setup, mencatat kondisi keuangan, membuat perencanaan, sampai memantau progress.</p>
          <p className="mt-2 text-[13px] leading-5 text-charcoal/65 dark:text-white/65">Yuk, mulai atur keuanganmu.</p>
          <div className="mt-4">
            <button type="button" onClick={() => setCompletionPrompt(false)} className="w-full min-h-10 rounded-xl bg-[#0B6B47] px-3 text-[12px] font-semibold text-white">Mulai Sekarang</button>
          </div>
        </div>
      </div>
    );
  }

  if (usagePrompt && !active) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4">
        <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[18px] bg-white p-5 shadow-[0_18px_60px_rgba(0,0,0,.2)] text-forest-900 dark:bg-[rgb(var(--c-surface))] dark:text-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DDF7E8] text-[#0B6B47] text-xl">✓</div>
          <h2 className="mt-3 text-[16px] font-bold">Tour pertama selesai 🎉</h2>
          <p className="mt-1.5 text-[13px] leading-5 text-charcoal/65 dark:text-white/65">Sekarang kita lanjut ke tour kedua: cara menggunakan Wealthplanner dari awal sampai evaluasi.</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setUsagePrompt(false)} className="flex-1 min-h-10 rounded-xl border border-charcoal/10 px-3 text-[12px] font-semibold text-charcoal/65 dark:border-white/10 dark:text-white/70">Nanti</button>
            <button type="button" onClick={() => start({ type: "usage", route: "/" })} className="flex-1 min-h-10 rounded-xl bg-[#0B6B47] px-3 text-[12px] font-semibold text-white">Lanjut Tour 2</button>
          </div>
        </div>
      </div>
    );
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
  const cardHeightEstimate = 190;
  const gap = 14;
  const actionStep = !!step.advanceOnTargetClick;
  let cardLeft = highlight ? highlight.left + highlight.width / 2 - cardWidth / 2 : (viewportW - cardWidth) / 2;
  let cardTop = highlight ? highlight.top + highlight.height + gap : 80;

  // For click-to-navigate steps, keep the guidance card visually attached to
  // the highlighted navigation item. This makes it obvious what to click.
  if (highlight && actionStep) {
    const spaceRight = viewportW - (highlight.left + highlight.width);
    const spaceLeft = highlight.left;
    if (spaceRight >= cardWidth + gap) {
      cardLeft = highlight.left + highlight.width + gap;
      cardTop = highlight.top + highlight.height / 2 - cardHeightEstimate / 2;
    } else if (spaceLeft >= cardWidth + gap) {
      cardLeft = highlight.left - cardWidth - gap;
      cardTop = highlight.top + highlight.height / 2 - cardHeightEstimate / 2;
    }
  }

  // Keep the explanation card completely outside the spotlight target.
  // Prefer below the target, otherwise place it above. On mobile, if neither
  // side has enough room, use the side with more available space.
  if (highlight && !actionStep) {
    const spaceBelow = viewportH - (highlight.top + highlight.height);
    const spaceAbove = highlight.top;
    if (spaceBelow < cardHeightEstimate + gap && spaceAbove >= cardHeightEstimate + gap) {
      cardTop = highlight.top - cardHeightEstimate - gap;
    } else if (spaceBelow < cardHeightEstimate + gap && spaceAbove < cardHeightEstimate + gap) {
      cardTop = spaceBelow >= spaceAbove
        ? Math.max(12, viewportH - cardHeightEstimate - 12)
        : Math.max(12, highlight.top - cardHeightEstimate - gap);
    }
  }

  cardLeft = Math.max(12, Math.min(cardLeft, viewportW - cardWidth - 12));
  cardTop = Math.max(12, Math.min(cardTop, viewportH - 12 - cardHeightEstimate));

  // Directional pointer between the guidance card and the highlighted control.
  let pointerLeft = highlight ? highlight.left + highlight.width / 2 - 14 : 0;
  let pointerTop = highlight ? highlight.top + highlight.height + 4 : 0;
  let pointerGlyph = "↓";
  if (highlight && actionStep) {
    const cardIsRight = cardLeft > highlight.left + highlight.width;
    const cardIsLeft = cardLeft + cardWidth < highlight.left;
    if (cardIsRight) {
      pointerLeft = highlight.left + highlight.width + gap / 2 - 14;
      pointerTop = highlight.top + highlight.height / 2 - 14;
      pointerGlyph = "←";
    } else if (cardIsLeft) {
      pointerLeft = highlight.left - gap / 2 - 14;
      pointerTop = highlight.top + highlight.height / 2 - 14;
      pointerGlyph = "→";
    } else if (cardTop < highlight.top) {
      pointerLeft = highlight.left + highlight.width / 2 - 14;
      pointerTop = highlight.top - gap / 2 - 14;
      pointerGlyph = "↑";
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" aria-hidden={false}>
      <style>{`
        @keyframes wp-tour-fade{from{opacity:0}to{opacity:1}}
        @keyframes wp-tour-pulse{
          0%,100%{transform:scale(1);box-shadow:0 0 0 9999px rgba(0,0,0,.55),0 0 0 2px #6EE7A8,0 0 0 6px rgba(110,231,168,.18)}
          50%{transform:scale(1.015);box-shadow:0 0 0 9999px rgba(0,0,0,.55),0 0 0 2px #6EE7A8,0 0 0 10px rgba(110,231,168,.06)}
        }
        @keyframes wp-tour-arrow{
          0%,100%{transform:translateY(0);opacity:.65}
          50%{transform:translateY(5px);opacity:1}
        }
        @media(prefers-reduced-motion:reduce){
          .wp-tour-fade,.wp-tour-pulse,.wp-tour-arrow{animation:none!important}
        }
      `}</style>
      {!highlight && !waiting && (
        <div className="absolute inset-0 z-0 bg-black/55 wp-tour-fade" style={{ animation: "wp-tour-fade 180ms ease-out" }} />
      )}
      {highlight && <div
        className="absolute z-10 rounded-[14px] outline outline-2 outline-[#6EE7A8] wp-tour-pulse"
        style={{ left: highlight.left, top: highlight.top, width: highlight.width, height: highlight.height, animation: "wp-tour-pulse 1.6s ease-in-out infinite" }}
      />}
      {highlight && (
        <div
          aria-hidden="true"
          className="absolute z-[25] flex h-7 w-7 items-center justify-center rounded-full bg-[#0B6B47] text-white shadow-lg wp-tour-arrow"
          style={{
            left: Math.max(10, Math.min(pointerLeft, viewportW - 38)),
            top: Math.max(10, Math.min(pointerTop, viewportH - 38)),
            animation: "wp-tour-arrow 1s ease-in-out infinite",
          }}
        >{pointerGlyph}</div>
      )}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        data-tour-dialog="true"
        tabIndex={-1}
        className="pointer-events-auto absolute z-20 rounded-[14px] bg-white p-[14px] shadow-[0_18px_60px_rgba(0,0,0,.18)] text-forest-900 dark:bg-[rgb(var(--c-surface))] dark:text-white transition-opacity duration-200"
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
            <button type="button" onClick={next} className="min-h-10 rounded-lg bg-[#0B6B47] px-4 py-2 text-[12px] font-semibold text-white">{index === steps.length - 1 ? "Selesai" : "Lanjut"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
