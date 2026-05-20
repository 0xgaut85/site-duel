"use client";

import {
  createContext,
  useContext,
  type MutableRefObject,
} from "react";

export interface FrameMeta {
  /** Slug used in URL hash, e.g. "01-landing". */
  id: string;
  /** Title for accessibility/announcements. */
  title: string;
}

export interface NestedScrollHandler {
  /**
   * Called by the parent carousel before advancing. Return true if the
   * gesture was absorbed by the child (e.g. moved to an adjacent sub-panel).
   * Return false if the child is at its edge — parent will advance frame.
   */
  tryAdvance: (dir: 1 | -1) => boolean;
  /** Reset to first sub-panel — called when this frame becomes active. */
  reset?: () => void;
}

export interface CarouselValue {
  frameCount: number;
  frames: FrameMeta[];
  activeIndex: number;
  goTo: (index: number) => void;
  /**
   * Registry of nested scroll handlers keyed by parent frame index. The
   * carousel consults `nestedHandlersRef.current[activeIndex]` on each
   * wheel tick before advancing.
   */
  nestedHandlersRef: MutableRefObject<Map<number, NestedScrollHandler>>;
  registerNested: (index: number, handler: NestedScrollHandler) => () => void;
}

export const CarouselContext = createContext<CarouselValue | null>(null);

export function useCarousel(): CarouselValue {
  const v = useContext(CarouselContext);
  if (!v) {
    throw new Error("useCarousel must be used inside <HorizontalCarousel>");
  }
  return v;
}
