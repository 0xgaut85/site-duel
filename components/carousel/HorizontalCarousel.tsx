"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { animate, motion, useMotionValue } from "motion/react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  CarouselContext,
  type CarouselValue,
  type FrameMeta,
  type NestedScrollHandler,
} from "./CarouselContext";
import { useKeyboardNav } from "./useKeyboardNav";
import { useTouchSwipe } from "./useTouchSwipe";
import { PageTransition } from "./PageTransition";

interface FrameEntry extends FrameMeta {
  element: React.ReactNode;
}

interface Props {
  frames: FrameEntry[];
  children?: React.ReactNode;
}

// Cooldown between gesture-triggered advancements (ms). Matches the
// full duration of the PageTransition overlay so a second flick can't
// queue up while one is mid-flight.
const TRANSITION_MS = 1500;
const COOLDOWN_MS = TRANSITION_MS + 100;
// When inside the transition's black hold we want the slide to land. The
// wrapper opacity hits ~1 at 10% (≈150ms into a 1.5s transition), so we
// kick the slide animation just after that.
const SLIDE_DELAY_MS = 220;
// Wheel deltaY total required to count as one tick.
const WHEEL_TICK = 50;
const WHEEL_IDLE_MS = 180;

export function HorizontalCarousel({ frames, children }: Props) {
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const frameCount = frames.length;

  const trackX = useMotionValue(0);
  const viewportWidthRef = useRef(0);
  const cooldownUntilRef = useRef(0);

  // Map: parent-frame-index -> nested handler.
  const nestedHandlersRef = useRef<Map<number, NestedScrollHandler>>(new Map());

  const registerNested = useCallback(
    (index: number, handler: NestedScrollHandler) => {
      nestedHandlersRef.current.set(index, handler);
      return () => {
        nestedHandlersRef.current.delete(index);
      };
    },
    [],
  );

  const goTo = useCallback(
    (rawIndex: number) => {
      const target = Math.max(0, Math.min(frameCount - 1, rawIndex));
      if (target === activeIndexRef.current) return;

      // Reset the destination's nested handler so it starts on its first
      // sub-panel each time the user enters it.
      nestedHandlersRef.current.get(target)?.reset?.();

      activeIndexRef.current = target;
      setActiveIndex(target);

      if (reducedMotion) {
        const node = document.querySelector<HTMLElement>(
          `[data-carousel-track] > section[data-frame-index="${target}"]`,
        );
        node?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      // Cooldown spans the full transition overlay (900ms) plus a bit so
      // a quick second flick doesn't queue up a chain of transitions.
      cooldownUntilRef.current = performance.now() + COOLDOWN_MS;

      // Delay the slide motion so it happens behind the black hold of the
      // transition overlay — the new page is in place by the time the
      // overlay starts to fade out.
      setTimeout(() => {
        animate(trackX, -target * viewportWidthRef.current, {
          type: "spring",
          stiffness: 200,
          damping: 30,
          mass: 0.9,
          restDelta: 0.001,
        });
      }, SLIDE_DELAY_MS);
    },
    [frameCount, reducedMotion, trackX],
  );

  // Measure viewport + re-snap on resize.
  useEffect(() => {
    const measure = () => {
      viewportWidthRef.current = window.innerWidth;
      trackX.set(-activeIndexRef.current * window.innerWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [trackX]);

  // Wheel / trackpad input.
  useEffect(() => {
    if (reducedMotion) return;

    let acc = 0;
    let lastTs = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now < cooldownUntilRef.current) return;
      if (now - lastTs > WHEEL_IDLE_MS) acc = 0;
      lastTs = now;

      const delta = e.deltaY + e.deltaX;
      acc += delta;

      if (Math.abs(acc) >= WHEEL_TICK) {
        const dir: 1 | -1 = acc > 0 ? 1 : -1;
        acc = 0;

        // Nested handler gets first dibs.
        const nested = nestedHandlersRef.current.get(activeIndexRef.current);
        if (nested && nested.tryAdvance(dir)) {
          // Small cooldown so a single trackpad flick doesn't blast through
          // multiple sub-panels.
          cooldownUntilRef.current = now + COOLDOWN_MS;
          return;
        }

        goTo(activeIndexRef.current + dir);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goTo, reducedMotion]);

  // Mobile / reduced-motion: IntersectionObserver tracks active section.
  useEffect(() => {
    if (!reducedMotion) return;
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-carousel-track] > section[data-frame-index]",
      ),
    );
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.frameIndex ?? 0,
            );
            activeIndexRef.current = idx;
            setActiveIndex((prev) => (prev === idx ? prev : idx));
          }
        }
      },
      { threshold: 0.5 },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [reducedMotion]);

  // URL hash sync.
  useEffect(() => {
    const frame = frames[activeIndex];
    if (!frame) return;
    const desired = `#${frame.id}`;
    if (window.location.hash !== desired) {
      history.replaceState(null, "", desired);
    }
  }, [activeIndex, frames]);

  // Honour incoming hash on mount.
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    const idx = frames.findIndex((f) => f.id === id);
    if (idx >= 0) {
      activeIndexRef.current = idx;
      setActiveIndex(idx);
      trackX.set(-idx * (window.innerWidth || 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: CarouselValue = useMemo(
    () => ({
      frameCount,
      frames,
      activeIndex,
      goTo,
      nestedHandlersRef,
      registerNested,
    }),
    [frameCount, frames, activeIndex, goTo, registerNested],
  );

  return (
    <CarouselContext.Provider value={value}>
      <CarouselInputs />
      {children}
      <main
        data-carousel-proxy=""
        className="relative w-full h-screen overflow-hidden"
        aria-label="Duel Agents, horizontal carousel"
      >
        <div
          data-carousel-viewport=""
          className="fixed inset-0 overflow-hidden z-10"
        >
          <motion.div
            data-carousel-track=""
            className="flex h-screen"
            style={{
              width: `${frameCount * 100}vw`,
              x: trackX,
              willChange: "transform",
            }}
          >
            {frames.map((f, i) => (
              <section
                key={f.id}
                id={f.id}
                data-frame-index={i}
                aria-label={`Frame ${i + 1} of ${frameCount}: ${f.title}`}
                className="relative shrink-0"
                style={{ width: "100vw", height: "100vh" }}
              >
                {f.element}
              </section>
            ))}
          </motion.div>

        </div>
      </main>

      {/* Depixelize page-transition overlay. Sits above everything; plays
          on every activeIndex change. */}
      <PageTransition trigger={activeIndex} duration={TRANSITION_MS} />

      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {`Frame ${activeIndex + 1} of ${frameCount}: ${frames[activeIndex]?.title ?? ""}`}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselInputs() {
  useKeyboardNav();
  useTouchSwipe();
  return null;
}
