"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Panel3D, type FaceVariant } from "./Panel3D";
import { ScrambleText } from "./ScrambleText";

/*
 * Ecosystem frame — three logo cubes that live as static editorial
 * elements until the cursor first nudges one. At that moment all three
 * eject into a shared physics layer with their current screen
 * positions and live as 6-face rigid bodies that:
 *
 *   - drift with linear + angular velocity
 *   - bounce off the frame edges (lossy)
 *   - collide with each other (circle-circle approx, mass = side³)
 *   - receive impulses from the cursor when it moves through them,
 *     scaled by the cursor's instantaneous velocity (fast brush =
 *     small impulse, slow drag-through = bigger sustained push)
 *
 * The captions stay anchored in the original grid layout regardless of
 * where the cubes have drifted, so the editorial reading order is
 * preserved even after activation.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  03                          ┌─┐    PAYMENTS            │
 *   │                              └─┘    Pay with any …       │
 *   │                                                          │
 *   │                            ┌─────┐  MODELS               │
 *   │                            │ BIG │  Duel runs …          │
 *   │                            └─────┘                       │
 *   │                                                          │
 *   │                              ┌─┐    PLATFORMS            │
 *   │  03                          └─┘    Use Duel with …      │
 *   │                                                          │
 *   │                                NOW SHOWING · Claude      │
 *   └─────────────────────────────────────────────────────────┘
 */

const FACES = 4;
const STEP_DEG = 360 / FACES;

/* ─────────────── at-rest motion (pre-activation, stepped spin) ───────────
 *
 * Before the cursor first pushes a cube, each one steps 90° on Y, dwells,
 * then steps again — same machine as the original Ecosystem cubes. Hover
 * pauses the step cycle. No vertical float or X wobble at rest.
 */
const STEP_DURATION_S = 2.0;
const DWELL_DURATION_S = 2.4;

/* ───────────────────── physics tuning constants ─────────────────────
 * All in px / px·per-frame at 60 Hz. The integrator is time-scaled by
 * (dt / 16.67), so values stay stable if the browser drops frames.
 */

// Per-frame multiplicative damping. 1.0 = frictionless, <1.0 = drag.
const LINEAR_DAMPING = 0.992;
const ANGULAR_DAMPING = 0.992;

// Edge collision restitution (0 = stick, 1 = perfect bounce).
const EDGE_RESTITUTION = 0.7;

// Cube↔cube collision restitution.
const CUBE_RESTITUTION = 0.78;

// Fraction of cursor velocity transferred to a cube per frame while
// the cursor is inside it. Higher = "stickier" — sustained contact
// shoves the cube hard. Lower = brushes barely register.
const CURSOR_IMPULSE_GAIN = 0.55;

// Off-center cursor hits also spin the cube. Scaled relative to its
// half-side so big and small cubes spin similarly per unit offset.
const CURSOR_ANG_GAIN = 0.18;

// Speed caps so a chaotic flick of the mouse doesn't launch a cube
// across the screen in one frame.
const MAX_LINEAR_SPEED = 28;
const MAX_ANGULAR_SPEED = 9; // deg / frame

// Hysteresis: a cube needs at least this much cursor speed (px/frame)
// inside its bbox before it activates the swarm. Stops single
// stationary hovers from triggering the physics mode by accident.
const ACTIVATION_SPEED_THRESHOLD = 1.2;

interface FaceContent {
  /** Display name; alt + text fallback. */
  name: string;
  /** Optional image path. */
  src?: string;
  /**
   * Per-brand optical-size override (fraction of face side).
   * Default 0.5. Used to compensate for source PNGs that ship with
   * different internal padding ratios — Tether has lots of canvas
   * padding, USDC fills edge-to-edge, etc., so equal `width: 50%`
   * makes them look different sizes on screen.
   */
  scale?: number;
}

// First 4 entries land on the cube faces.
//
// `scale` compensates for source-PNG padding so every mark reads at
// the same optical weight on the cube face. The default (no scale)
// is 0.5 — sized for icons that fill ~85% of their canvas. Icons
// with extra built-in padding (Tether) need a larger scale; icons
// that fill canvas edge-to-edge (USDC, Gemini) need a smaller one.
const MODELS: FaceContent[] = [
  { name: "ChatGPT", src: "/chatgpt.png" },
  { name: "Claude", src: "/claude.png" },
  { name: "Gemini", src: "/gemini.png", scale: 0.44 },
  { name: "DeepSeek", src: "/deepseek.png" },
  { name: "Llama", src: "/meta.png" },
  { name: "Mistral", src: "/mistral.svg" },
  { name: "Perplexity", src: "/perpexlity.png" },
];

const PLATFORMS: FaceContent[] = [
  { name: "Venice", src: "/veniceai.png" },
  { name: "Nous Research", src: "/nousresearch.png", scale: 0.46 },
  { name: "OpenClaw", src: "/openclaw.png" },
  { name: "Cursor", src: "/cursor.png" },
  { name: "Codex", src: "/codex.png" },
];

const PAYMENTS: FaceContent[] = [
  { name: "Ethereum", src: "/ethereum.png", scale: 0.6 },
  { name: "Solana", src: "/Solana.png" },
  { name: "USDC", src: "/usdc.png", scale: 0.46 },
  { name: "USDT", src: "/tether.png", scale: 0.66 },
];

/* ───────────────────────────── frame ───────────────────────────── */

interface CubeSpec {
  id: "payments" | "models" | "platforms";
  faces: FaceContent[];
  variant: FaceVariant;
  /** CSS size expression — passed through to `--side`. */
  size: string;
  /**
   * +1 or -1 — direction of the at-rest Y rotation. The big cube
   * counter-rotates against the small ones so the trio reads as
   * three independent objects, not one rigid system.
   */
  spinDirection: 1 | -1;
  /**
   * Optional cap-face content. Most cubes leave the top + bottom
   * blank (just the material surface) so the silhouette reads as
   * a clean solid; the big MODELS cube uses them to surface two
   * additional model logos (Mistral on top, Llama on bottom) since
   * its side faces only cover the first four.
   */
  topFace?: FaceContent;
  bottomFace?: FaceContent;
}

const CUBE_SPECS: CubeSpec[] = [
  {
    id: "payments",
    faces: PAYMENTS,
    variant: "glass",
    size: "min(15vh, 13.5vw)",
    spinDirection: -1,
  },
  {
    id: "models",
    faces: MODELS,
    variant: "matte",
    size: "min(38vh, 34vw)",
    spinDirection: +1,
    /*
     * Sides cover ChatGPT / Claude / Gemini / DeepSeek. The two caps
     * surface the remaining flagship models so the black cube reads
     * as carrying six brands, not four. Top + bottom use the same
     * white logo treatment the sides use so the cube's material
     * stays uniform across all six faces.
     */
    topFace: { name: "Mistral", src: "/mistral.png" },
    bottomFace: { name: "Llama", src: "/llama.png" },
  },
  {
    id: "platforms",
    faces: PLATFORMS,
    variant: "paper",
    size: "min(15vh, 13.5vw)",
    spinDirection: -1,
    /*
     * Sides cover Venice / Nous Research / OpenClaw / Cursor. The
     * caps surface Codex (top) and Claude Code (bottom) so the
     * white cube carries six platforms like the black MODELS cube.
     */
    topFace: { name: "Codex", src: "/codex.png" },
    bottomFace: { name: "Claude Code", src: "/claudecode.png" },
  },
];

export function EcosystemFrame() {
  // Front-face indices for each cube → drives the live-face caption.
  const [topFront, setTopFront] = useState(0);
  const [midFront, setMidFront] = useState(0);
  const [botFront, setBotFront] = useState(0);

  // ─────────── physics activation + slot-rect tracking ───────────
  //
  // `activated` flips on the first time a moving cursor crosses any
  // cube's bbox. Pre-activation: cubes render inside their grid slots
  // (CSS layout). Post-activation: cubes detach into the physics
  // layer; the grid slots remain as invisible placeholders so the
  // captions stay aligned.
  const [activated, setActivated] = useState(false);

  /*
   * Refs to the three grid slot DOM nodes — we read their bounding
   * boxes at the moment of activation to seed each cube's initial
   * position. Indexed by spec.id.
   */
  const slotRefs = {
    payments: useRef<HTMLDivElement | null>(null),
    models: useRef<HTMLDivElement | null>(null),
    platforms: useRef<HTMLDivElement | null>(null),
  } as const;

  const containerRef = useRef<HTMLDivElement | null>(null);

  /*
   * Live rotation of each cube DURING the at-rest phase. The
   * RestingCubes write to this every animation frame; when physics
   * activates, the seeder reads from here to hand off rotations
   * without a visual snap.
   */
  const restRotRef = useRef<
    Record<CubeSpec["id"], { rotX: number; rotY: number }>
  >({
    payments: { rotX: 0, rotY: 0 },
    models: { rotX: 0, rotY: 0 },
    platforms: { rotX: 0, rotY: 0 },
  });

  const setFrontFor = useMemo(
    () => ({
      payments: setTopFront,
      models: setMidFront,
      platforms: setBotFront,
    }),
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      {/* Frame label. */}
      <div
        className="absolute font-mono text-[10px] tracking-[0.22em] text-ink-faint z-30"
        style={{ top: "var(--frame-padding)", left: "var(--frame-padding)" }}
      >
        03 · ECOSYSTEM
      </div>

      {/* Big faded "03" ornament on the left — matches the InfoFrame
          per-face numerals and anchors the asymmetric composition. */}
      <span
        aria-hidden
        className="absolute font-display font-medium tabular-nums leading-none select-none pointer-events-none z-0"
        style={{
          top: "50%",
          left: "calc(var(--frame-padding) - 0.05em)",
          transform: "translateY(-50%)",
          fontSize: "clamp(12rem, 30vw, 28rem)",
          letterSpacing: "-0.06em",
          color: "rgba(10,10,10,0.05)",
        }}
      >
        03
      </span>

      {/* Two-column grid:
            - col 1 ▸ cube stack, taking the lion's share of width
            - col 2 ▸ caption stack, ~34ch wide
            - three rows ▸ small / big / small (mirrors the cube sizes)
          The grid slots are always rendered; they hold the cube DOM
          pre-activation, and become invisible placeholders post. */}
      <div
        className="absolute inset-0 z-10 grid"
        style={{
          padding: "var(--frame-padding)",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 34ch)",
          gridTemplateRows: "1fr 2.6fr 1fr",
          columnGap: "clamp(2rem, 5vw, 5rem)",
          rowGap: "clamp(1.5rem, 3vw, 2.5rem)",
        }}
      >
        <div
          ref={slotRefs.payments}
          className="flex items-center justify-center"
        >
          {!activated && (
            <RestingCube spec={CUBE_SPECS[0]} rotRef={restRotRef} />
          )}
        </div>
        <div className="flex items-center justify-end text-right">
          <CubeCaption
            tag="PAYMENTS"
            body="Pay with any crypto. Ethereum, Solana, USDC, USDT, and more."
            liveName={PAYMENTS[topFront]?.name}
          />
        </div>

        <div
          ref={slotRefs.models}
          className="flex items-center justify-center"
        >
          {!activated && (
            <RestingCube spec={CUBE_SPECS[1]} rotRef={restRotRef} />
          )}
        </div>
        <div className="flex items-center justify-end text-right">
          <CubeCaption
            tag="MODELS"
            body="Duel runs ChatGPT, Claude, Gemini, DeepSeek, Llama, Mistral, Perplexity. Whichever wins your task."
            liveName={MODELS[midFront]?.name}
          />
        </div>

        <div
          ref={slotRefs.platforms}
          className="flex items-center justify-center"
        >
          {!activated && (
            <RestingCube spec={CUBE_SPECS[2]} rotRef={restRotRef} />
          )}
        </div>
        <div className="flex items-center justify-end text-right">
          <CubeCaption
            tag="PLATFORMS"
            body="Use Duel with Claude Code, Venice, Nous Research, OpenClaw, Cursor, Codex."
            liveName={PLATFORMS[botFront]?.name}
          />
        </div>
      </div>

      {/*
       * Physics layer. Always mounted so cursor tracking is
       * continuous; activates the simulation on first qualifying
       * cursor contact with any cube.
       */}
      <PhysicsLayer
        containerRef={containerRef}
        slotRefs={slotRefs}
        restRotRef={restRotRef}
        activated={activated}
        onActivate={() => setActivated(true)}
        onFrontChange={setFrontFor}
      />
    </div>
  );
}

/* ─────────────────────────── CubeCaption ─────────────────────────── */

function CubeCaption({
  tag,
  body,
  liveName,
}: {
  tag: string;
  body: string;
  liveName?: string;
}) {
  return (
    <div className="flex flex-col gap-3 items-end text-right">
      <span className="font-mono text-[10px] tracking-[0.3em] text-ink-faint">
        / {tag}
      </span>
      <p
        className="font-display font-medium text-ink leading-[1.15] tracking-[-0.015em]"
        style={{ fontSize: "clamp(1rem, 1.55vw, 1.45rem)" }}
      >
        {body}
      </p>
      {liveName && (
        <span className="font-mono text-[9px] tracking-[0.3em] text-ink-faint/70 flex items-baseline gap-2">
          <span className="opacity-60">NOW SHOWING ·</span>
          {/* Re-scramble each time the front face changes. */}
          <ScrambleText
            key={liveName}
            text={liveName}
            active={true}
            duration={0.6}
            className="text-ink"
          />
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────── useCubeSidePx ─────────────────────────
 *
 * Measures the rendered cube width once and feeds it to `--side` only.
 * Width/height stay on the original `min(vh, vw)` CSS so layout, gap,
 * and perceived size in the grid are unchanged. The px value just keeps
 * 3D face depth in sync with the painted square (no deformation).
 */
function useCubeSidePx(sizeCss: string): {
  ref: (node: HTMLDivElement | null) => void;
  sideVar: string;
} {
  const [sidePx, setSidePx] = useState<number | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return;
    const w = node.offsetWidth;
    if (w > 0) setSidePx(Math.round(w));
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) {
        const next = Math.round(e.contentRect.width);
        if (next > 0) setSidePx(next);
      }
    });
    obs.observe(node);
    observerRef.current = obs;
  }, []);

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

  return {
    ref,
    sideVar: sidePx !== null ? `${sidePx}px` : sizeCss,
  };
}

/* ─────────────────────────── RestingCube ───────────────────────────
 *
 * Pre-activation: stepped 90° Y rotation with dwell, hover pauses.
 * Mirrors the original Ecosystem cube behaviour before physics.
 */
function RestingCube({
  spec,
  rotRef,
}: {
  spec: CubeSpec;
  rotRef: React.RefObject<
    Record<CubeSpec["id"], { rotX: number; rotY: number }>
  >;
}) {
  const rotY = useMotionValue(0);
  const { ref: measureRef, sideVar } = useCubeSidePx(spec.size);
  const hoveredRef = useRef(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let currentTween: ReturnType<typeof animate> | null = null;

    const scheduleNext = (delayMs: number) => {
      timer = setTimeout(() => {
        if (cancelled) return;
        if (hoveredRef.current) {
          scheduleNext(150);
          return;
        }
        const target = rotY.get() + spec.spinDirection * STEP_DEG;
        currentTween = animate(rotY, target, {
          duration: STEP_DURATION_S,
          ease: [0.65, 0, 0.35, 1],
          onComplete: () => {
            if (cancelled) return;
            scheduleNext(DWELL_DURATION_S * 1000);
          },
        });
      }, delayMs);
    };

    scheduleNext(800);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      currentTween?.stop();
    };
  }, [rotY, spec.spinDirection]);

  useEffect(() => {
    const id = spec.id;
    const writeY = () => {
      rotRef.current[id].rotY = rotY.get();
      rotRef.current[id].rotX = 0;
    };
    writeY();
    return rotY.on("change", writeY);
  }, [spec.id, rotRef, rotY]);

  const handleEnter = useCallback(() => {
    hoveredRef.current = true;
    setHovered(true);
  }, []);
  const handleLeave = useCallback(() => {
    hoveredRef.current = false;
    setHovered(false);
  }, []);

  return (
    <div
      ref={measureRef}
      className="relative flex-none"
      style={{ width: spec.size, height: spec.size }}
    >
      <CubeFloorShadow tone={spec.variant === "paper" ? "warm" : "cool"} />
      <div
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        tabIndex={0}
        aria-label="Logo cube, hover to pause"
        className="absolute inset-0 outline-none"
        style={{
          ["--side" as string]: sideVar,
          perspective: spec.variant === "matte" ? 1400 : 700,
          opacity: hovered ? 0.97 : 1,
          transition: "opacity 200ms ease",
        }}
      >
        <RestingCubeMesh
          rotY={rotY}
          faces={spec.faces}
          variant={spec.variant}
          topFace={spec.topFace}
          bottomFace={spec.bottomFace}
        />
      </div>
    </div>
  );
}

/* ───────────────────────── PhysicsLayer ─────────────────────────── */

/**
 * Per-body simulation state. Position is in container-relative px
 * (origin = top-left of the frame). Rotation is in degrees.
 */
interface Body {
  id: CubeSpec["id"];
  spec: CubeSpec;
  /** Half-side of the cube in px — also the collision radius. */
  half: number;
  /** Center position. */
  x: number;
  y: number;
  /** Linear velocity (px / 16.67ms). */
  vx: number;
  vy: number;
  /** Rotation (deg). */
  rotX: number;
  rotY: number;
  /** Angular velocity (deg / 16.67ms). */
  angX: number;
  angY: number;
  /** Mass ≈ side³, normalized so smallest = 1. Used in collisions. */
  mass: number;
  /** Was the cursor inside this body on the previous frame? */
  cursorWasInside: boolean;
}

function PhysicsLayer({
  containerRef,
  slotRefs,
  restRotRef,
  activated,
  onActivate,
  onFrontChange,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  slotRefs: {
    payments: React.RefObject<HTMLDivElement | null>;
    models: React.RefObject<HTMLDivElement | null>;
    platforms: React.RefObject<HTMLDivElement | null>;
  };
  restRotRef: React.RefObject<
    Record<CubeSpec["id"], { rotX: number; rotY: number }>
  >;
  activated: boolean;
  onActivate: () => void;
  onFrontChange: Record<
    CubeSpec["id"],
    React.Dispatch<React.SetStateAction<number>>
  >;
}) {
  /*
   * Bodies live in a ref, not in state — the simulation mutates them
   * 60 times per second and we don't want React rerenders for that.
   * Per-body motion values drive the actual DOM transforms so only
   * the GPU pays the cost per frame.
   */
  const bodiesRef = useRef<Body[] | null>(null);

  /* Per-body motion values. Created on activation, kept stable for
   * the rest of the component's life. */
  const motionRefs = useRef<
    Record<
      CubeSpec["id"],
      {
        x: ReturnType<typeof useMotionValue<number>>;
        y: ReturnType<typeof useMotionValue<number>>;
        rotX: ReturnType<typeof useMotionValue<number>>;
        rotY: ReturnType<typeof useMotionValue<number>>;
      }
    >
  >(null as unknown as Record<CubeSpec["id"], never>);

  /* Allocate motion values once at top-level so hooks rule passes. */
  const pmx = useMotionValue(0);
  const pmy = useMotionValue(0);
  const pmrx = useMotionValue(0);
  const pmry = useMotionValue(0);
  const mmx = useMotionValue(0);
  const mmy = useMotionValue(0);
  const mmrx = useMotionValue(0);
  const mmry = useMotionValue(0);
  const lmx = useMotionValue(0);
  const lmy = useMotionValue(0);
  const lmrx = useMotionValue(0);
  const lmry = useMotionValue(0);

  if (motionRefs.current === null) {
    motionRefs.current = {
      payments: { x: pmx, y: pmy, rotX: pmrx, rotY: pmry },
      models: { x: mmx, y: mmy, rotX: mmrx, rotY: mmry },
      platforms: { x: lmx, y: lmy, rotX: lmrx, rotY: lmry },
    };
  }

  /* ──── cursor tracking ────
   *
   * We track cursor position in container-relative coords plus its
   * per-frame velocity. The velocity is what gets transferred into a
   * cube's linear velocity on contact.
   */
  const cursorRef = useRef({
    /** Has the cursor ever been seen in this frame? */
    present: false,
    /** Container-relative position last frame. */
    x: 0,
    y: 0,
    /** Per-frame velocity. */
    vx: 0,
    vy: 0,
    /** Raw last-event position + timestamp for velocity calculation. */
    lastEventX: 0,
    lastEventY: 0,
    lastEventT: 0,
  });

  /*
   * Mouse listener installed on the FRAME (not on each cube), so we
   * can read cursor velocity continuously even between cube touches,
   * and so the first touch activation fires reliably regardless of
   * which cube was hit.
   */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onMove = (e: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();
      const c = cursorRef.current;
      if (c.present) {
        const dt = Math.max(now - c.lastEventT, 1);
        // Normalize velocity to "px per 16.67ms" (1 frame at 60Hz).
        c.vx = ((x - c.lastEventX) * 16.67) / dt;
        c.vy = ((y - c.lastEventY) * 16.67) / dt;
      }
      c.lastEventX = x;
      c.lastEventY = y;
      c.lastEventT = now;
      c.x = x;
      c.y = y;
      c.present = true;
    };

    const onLeave = () => {
      cursorRef.current.present = false;
      cursorRef.current.vx = 0;
      cursorRef.current.vy = 0;
    };

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
    };
  }, [containerRef]);

  /*
   * The activation snapshot. When the cursor first crosses a cube
   * while moving, we:
   *   1) measure all three slot bounding boxes,
   *   2) instantiate the bodies at those positions,
   *   3) flip the activated flag so React unmounts the StaticCubes,
   *   4) seed the touched cube's velocity from the cursor velocity.
   *
   * Done in a RAF loop so we have access to the cursor velocity
   * (pointermove alone doesn't tell us "is the cursor currently
   * moving" — only when it last moved).
   */
  const seedBodiesIfNeeded = useCallback(
    (touchedId: CubeSpec["id"]) => {
      if (bodiesRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();

      const bodies: Body[] = CUBE_SPECS.map((spec) => {
        const slot =
          spec.id === "payments"
            ? slotRefs.payments.current
            : spec.id === "models"
              ? slotRefs.models.current
              : slotRefs.platforms.current;
        if (!slot) {
          throw new Error(`Slot not mounted for ${spec.id}`);
        }
        /*
         * The slot itself is the flex container; the RestingCube it
         * holds is a `min(...)` square sitting inside it. We need
         * the inner cube's rect, not the slot. Falling back to the
         * slot rect if no child exists.
         */
        const childRect = (slot.firstElementChild as HTMLElement | null)?.getBoundingClientRect();
        const rect = childRect ?? slot.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - containerRect.left;
        const cy = rect.top + rect.height / 2 - containerRect.top;
        const half = rect.width / 2;
        /*
         * Hand off the at-rest rotation. The RestingCube has been
         * updating `restRotRef.current[spec.id]` every animation
         * frame; by reading it here we ensure the physics cube
         * begins at exactly the same orientation, so the activation
         * doesn't snap the rotation back to 0.
         *
         * The at-rest Y motion is a constant-velocity loop. Inject
         * its current angular velocity (in deg/frame) so the cube
         * doesn't lose its existing spin momentum on handoff either.
         */
        const restRot = restRotRef.current[spec.id];
        // Match stepped-spin angular speed during the 90° turn.
        const restAngY =
          (spec.spinDirection * STEP_DEG) / (STEP_DURATION_S * 60);
        // Mass proportional to (side)³; normalized so smallest = 1.
        // Big cube ends up ~(2.5)³ ≈ 15.6× heavier — it barely
        // budges when the small cubes hit it.
        return {
          id: spec.id,
          spec,
          half,
          x: cx,
          y: cy,
          vx: 0,
          vy: 0,
          rotX: restRot.rotX,
          rotY: restRot.rotY,
          angX: 0,
          angY: restAngY,
          mass: Math.pow(rect.width, 3),
          cursorWasInside: false,
        };
      });

      // Normalize masses to small=1 for nicer numbers in the solver.
      const minMass = Math.min(...bodies.map((b) => b.mass));
      bodies.forEach((b) => {
        b.mass = b.mass / minMass;
      });

      // Initial kick on the touched body from the current cursor velocity.
      const cursor = cursorRef.current;
      const touched = bodies.find((b) => b.id === touchedId);
      if (touched) {
        touched.vx = clamp(
          cursor.vx * CURSOR_IMPULSE_GAIN,
          -MAX_LINEAR_SPEED,
          MAX_LINEAR_SPEED,
        );
        touched.vy = clamp(
          cursor.vy * CURSOR_IMPULSE_GAIN,
          -MAX_LINEAR_SPEED,
          MAX_LINEAR_SPEED,
        );
        // Off-center hit → angular kick. Cursor offset from center.
        const dx = cursor.x - touched.x;
        const dy = cursor.y - touched.y;
        touched.angY = clamp(
          (cursor.vx * dy) / touched.half * CURSOR_ANG_GAIN,
          -MAX_ANGULAR_SPEED,
          MAX_ANGULAR_SPEED,
        );
        touched.angX = clamp(
          (-cursor.vy * dx) / touched.half * CURSOR_ANG_GAIN,
          -MAX_ANGULAR_SPEED,
          MAX_ANGULAR_SPEED,
        );
      }

      // Seed the per-body motion values to the slot positions AND
      // current at-rest rotations so the first rendered frame in
      // physics mode matches the last rendered frame in rest mode —
      // no visual jump on activation.
      const m = motionRefs.current;
      bodies.forEach((b) => {
        const mv = m[b.id];
        mv.x.set(b.x);
        mv.y.set(b.y);
        mv.rotX.set(b.rotX);
        mv.rotY.set(b.rotY);
      });

      bodiesRef.current = bodies;
      onActivate();
    },
    [containerRef, slotRefs, restRotRef, onActivate],
  );

  /* Main RAF simulation loop. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let raf = 0;
    let lastT = performance.now();

    const tick = (now: number) => {
      const dt = Math.max(now - lastT, 1);
      lastT = now;
      // Scale all per-frame quantities by (real ms / 16.67ms). At
      // 60 Hz this is ~1; at 30 Hz it's ~2 (so two frames' worth of
      // motion happen in one tick), keeping motion frame-rate
      // independent.
      const step = dt / 16.67;

      const cursor = cursorRef.current;

      const containerRect = container.getBoundingClientRect();
      const W = containerRect.width;
      const H = containerRect.height;

      /* ── Pre-activation: watch for cursor crossing any static cube
       *    while in motion. If found, snapshot all bodies & seed. */
      if (!bodiesRef.current) {
        if (cursor.present) {
          const speed = Math.hypot(cursor.vx, cursor.vy);
          if (speed >= ACTIVATION_SPEED_THRESHOLD) {
            for (const spec of CUBE_SPECS) {
              const slot =
                spec.id === "payments"
                  ? slotRefs.payments.current
                  : spec.id === "models"
                    ? slotRefs.models.current
                    : slotRefs.platforms.current;
              if (!slot) continue;
              const childRect = (
                slot.firstElementChild as HTMLElement | null
              )?.getBoundingClientRect();
              const r = childRect ?? slot.getBoundingClientRect();
              const cxAbs = r.left + r.width / 2;
              const cyAbs = r.top + r.height / 2;
              const cx = cxAbs - containerRect.left;
              const cy = cyAbs - containerRect.top;
              const half = r.width / 2;
              if (
                cursor.x >= cx - half &&
                cursor.x <= cx + half &&
                cursor.y >= cy - half &&
                cursor.y <= cy + half
              ) {
                seedBodiesIfNeeded(spec.id);
                break;
              }
            }
          }
        }
        // Decay cursor velocity slightly each frame even before
        // activation so a stationary cursor doesn't carry stale
        // velocity from a fast prior move.
        cursor.vx *= 0.9;
        cursor.vy *= 0.9;
        raf = requestAnimationFrame(tick);
        return;
      }

      const bodies = bodiesRef.current;

      /* ── 1) Cursor → impulse */
      if (cursor.present) {
        for (const b of bodies) {
          const inside =
            cursor.x >= b.x - b.half &&
            cursor.x <= b.x + b.half &&
            cursor.y >= b.y - b.half &&
            cursor.y <= b.y + b.half;
          if (inside) {
            // Transfer a fraction of cursor velocity into the cube's
            // velocity each frame the cursor is inside. Mass-scaled so
            // the big cube doesn't get launched.
            const gain = CURSOR_IMPULSE_GAIN / b.mass * step;
            b.vx += cursor.vx * gain;
            b.vy += cursor.vy * gain;

            // Off-center hits spin the cube.
            const dx = cursor.x - b.x;
            const dy = cursor.y - b.y;
            b.angY += ((cursor.vx * dy) / b.half) * CURSOR_ANG_GAIN * step / b.mass;
            b.angX +=
              ((-cursor.vy * dx) / b.half) * CURSOR_ANG_GAIN * step / b.mass;

            b.cursorWasInside = true;
          } else {
            b.cursorWasInside = false;
          }
        }
      }

      /* ── 2) Integrate */
      for (const b of bodies) {
        b.x += b.vx * step;
        b.y += b.vy * step;
        b.rotX += b.angX * step;
        b.rotY += b.angY * step;

        // Damping
        const ld = Math.pow(LINEAR_DAMPING, step);
        const ad = Math.pow(ANGULAR_DAMPING, step);
        b.vx *= ld;
        b.vy *= ld;
        b.angX *= ad;
        b.angY *= ad;

        // Clamp speeds.
        const sp = Math.hypot(b.vx, b.vy);
        if (sp > MAX_LINEAR_SPEED) {
          b.vx = (b.vx / sp) * MAX_LINEAR_SPEED;
          b.vy = (b.vy / sp) * MAX_LINEAR_SPEED;
        }
        b.angX = clamp(b.angX, -MAX_ANGULAR_SPEED, MAX_ANGULAR_SPEED);
        b.angY = clamp(b.angY, -MAX_ANGULAR_SPEED, MAX_ANGULAR_SPEED);
      }

      /* ── 3) Edge collisions */
      for (const b of bodies) {
        if (b.x - b.half < 0) {
          b.x = b.half;
          b.vx = Math.abs(b.vx) * EDGE_RESTITUTION;
          b.angY += b.vy * 0.4; // glancing edge nudges spin
        } else if (b.x + b.half > W) {
          b.x = W - b.half;
          b.vx = -Math.abs(b.vx) * EDGE_RESTITUTION;
          b.angY -= b.vy * 0.4;
        }
        if (b.y - b.half < 0) {
          b.y = b.half;
          b.vy = Math.abs(b.vy) * EDGE_RESTITUTION;
          b.angX -= b.vx * 0.4;
        } else if (b.y + b.half > H) {
          b.y = H - b.half;
          b.vy = -Math.abs(b.vy) * EDGE_RESTITUTION;
          b.angX += b.vx * 0.4;
        }
      }

      /* ── 4) Cube↔cube collisions (circle-circle approx).
       *
       * We use the cube's half-side as a collision radius — slightly
       * over-conservative on the corners (cubes would visually
       * intersect a touch at 45° angles) but for impulse-feel
       * purposes it reads as "they bump" and that's enough.
       */
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i];
          const b = bodies[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy;
          const r = a.half + b.half;
          if (distSq < r * r && distSq > 0.0001) {
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = r - dist;

            // Positional correction split by inverse mass so the big
            // cube barely shifts when bumped by a small one.
            const invA = 1 / a.mass;
            const invB = 1 / b.mass;
            const invSum = invA + invB;
            a.x -= nx * overlap * (invA / invSum);
            a.y -= ny * overlap * (invA / invSum);
            b.x += nx * overlap * (invB / invSum);
            b.y += ny * overlap * (invB / invSum);

            // Relative velocity along the normal.
            const relVx = b.vx - a.vx;
            const relVy = b.vy - a.vy;
            const relAlongN = relVx * nx + relVy * ny;
            // Already separating — don't add energy.
            if (relAlongN > 0) continue;
            const e = CUBE_RESTITUTION;
            const jImp = (-(1 + e) * relAlongN) / invSum;
            const impulseX = jImp * nx;
            const impulseY = jImp * ny;
            a.vx -= impulseX * invA;
            a.vy -= impulseY * invA;
            b.vx += impulseX * invB;
            b.vy += impulseY * invB;

            // Spin transfer — tangential component of impulse drives
            // angular velocity. Cheap heuristic, looks right.
            const tx = -ny;
            const ty = nx;
            const relAlongT = relVx * tx + relVy * ty;
            a.angY += relAlongT * 0.06 * invA;
            b.angY -= relAlongT * 0.06 * invB;
          }
        }
      }

      /* ── 5) Push motion values out to the DOM */
      const m = motionRefs.current;
      for (const b of bodies) {
        const mv = m[b.id];
        mv.x.set(b.x);
        mv.y.set(b.y);
        mv.rotX.set(b.rotX);
        mv.rotY.set(b.rotY);

        // Front-face caption update.
        const setter = onFrontChange[b.id];
        if (setter) {
          // Same logic as the original stepped rotation: face N is
          // front when rotY ≡ -N · STEP (mod 360).
          const normalized = -b.rotY;
          const idx =
            (((4 - Math.round(normalized / STEP_DEG)) % FACES) + FACES) %
            FACES;
          setter((prev) => (prev === idx ? prev : idx));
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [containerRef, slotRefs, seedBodiesIfNeeded, onFrontChange]);

  /*
   * Reset motion values when the layer un-activates (e.g. parent
   * unmount + remount). With the current spec this never happens once
   * the user activates the swarm — but we keep the contract clean.
   */
  useLayoutEffect(() => {
    if (!activated) {
      bodiesRef.current = null;
    }
  }, [activated]);

  /*
   * Render the bodies post-activation. Pre-activation, render
   * nothing — the StaticCubes inside the grid slots are visible.
   */
  if (!activated) return null;

  return (
    <div
      aria-hidden={false}
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ contain: "layout paint" }}
    >
      {CUBE_SPECS.map((spec) => (
        <PhysicsCube
          key={spec.id}
          spec={spec}
          motion={motionRefs.current[spec.id]}
        />
      ))}
    </div>
  );
}

/** Float clamp helper. */
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/* ───────────────────────── PhysicsCube ───────────────────────── */

function PhysicsCube({
  spec,
  motion: mv,
}: {
  spec: CubeSpec;
  motion: {
    x: ReturnType<typeof useMotionValue<number>>;
    y: ReturnType<typeof useMotionValue<number>>;
    rotX: ReturnType<typeof useMotionValue<number>>;
    rotY: ReturnType<typeof useMotionValue<number>>;
  };
}) {
  const { ref: measureRef, sideVar } = useCubeSidePx(spec.size);
  /*
   * Translate from container-relative center coords to top-left
   * positioning. We use `top: 0; left: 0` + translate so a single
   * GPU transform drives everything.
   */
  const translate = useTransform(
    [mv.x, mv.y],
    ([x, y]: number[]) => `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
  );

  return (
    <motion.div
      ref={measureRef}
      className="absolute"
      style={{
        top: 0,
        left: 0,
        width: spec.size,
        height: spec.size,
        transform: translate,
        willChange: "transform",
        // Re-enable pointer events on the cube itself so the cursor
        // can interact with it; the outer physics layer is
        // `pointer-events-none` so the layer doesn't shadow the
        // grid captions or frame label sitting beneath it.
        pointerEvents: "auto",
      }}
    >
      <CubeFloorShadow tone={spec.variant === "paper" ? "warm" : "cool"} />
      <div
        className="absolute inset-0 outline-none"
        style={{
          ["--side" as string]: sideVar,
          perspective: spec.variant === "matte" ? 1400 : 700,
        }}
      >
        <PhysicsCubeMesh
          rotX={mv.rotX}
          rotY={mv.rotY}
          faces={spec.faces}
          variant={spec.variant}
          topFace={spec.topFace}
          bottomFace={spec.bottomFace}
        />
      </div>
    </motion.div>
  );
}

/* ───────────────────────── RestingCubeMesh ─────────────────────
 *
 * Six-face cube used pre-activation. Stepped spin on Y only.
 */
function RestingCubeMesh({
  rotY,
  faces,
  variant,
  topFace,
  bottomFace,
}: {
  rotY: ReturnType<typeof useMotionValue<number>>;
  faces: FaceContent[];
  variant: FaceVariant;
  topFace?: FaceContent;
  bottomFace?: FaceContent;
}) {
  const transform = useTransform(
    rotY,
    (ry) => `translateZ(calc(var(--side) / -2)) rotateY(${ry}deg)`,
  );
  return (
    <div className="relative h-full w-full">
      <motion.div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform,
          willChange: "transform",
        }}
      >
        <CubeFaces
          faces={faces}
          variant={variant}
          topFace={topFace}
          bottomFace={bottomFace}
        />
      </motion.div>
    </div>
  );
}

/* ───────────────────── CubeMesh (animated/physics) ───────────────── */
function PhysicsCubeMesh({
  rotX,
  rotY,
  faces,
  variant,
  topFace,
  bottomFace,
}: {
  rotX: ReturnType<typeof useMotionValue<number>>;
  rotY: ReturnType<typeof useMotionValue<number>>;
  faces: FaceContent[];
  variant: FaceVariant;
  topFace?: FaceContent;
  bottomFace?: FaceContent;
}) {
  const transform = useTransform(
    [rotX, rotY],
    ([rx, ry]: number[]) =>
      `translateZ(calc(var(--side) / -2)) rotateX(${rx}deg) rotateY(${ry}deg)`,
  );
  return (
    <div className="relative h-full w-full">
      <motion.div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform,
          willChange: "transform",
        }}
      >
        <CubeFaces
          faces={faces}
          variant={variant}
          topFace={topFace}
          bottomFace={bottomFace}
        />
      </motion.div>
    </div>
  );
}

/* ────────────────────────────── CubeFaces
 *
 * The six face elements. The four sides carry the brand logos; the
 * top and bottom carry no logo, just the surface material — this
 * keeps the cube SOLID at every orientation without visual clutter
 * on the caps. (Putting a logo on the top would look noisy when the
 * cube tilts toward the camera.)
 */
function CubeFaces({
  faces,
  variant,
  topFace,
  bottomFace,
}: {
  faces: FaceContent[];
  variant: FaceVariant;
  /**
   * Optional logo content for the top / bottom caps. When omitted
   * the cap renders as bare material (the original behaviour). When
   * provided, the cap shows the brand mark exactly like a side face.
   */
  topFace?: FaceContent;
  bottomFace?: FaceContent;
}) {
  return (
    <>
      {/* Side faces — 0/1/2/3 around the Y axis. */}
      {faces.slice(0, FACES).map((face, i) => (
        <SideFace key={`${face.name}-${i}`} index={i} variant={variant}>
          <LogoFace face={face} variant={variant} />
        </SideFace>
      ))}
      {/* Top + bottom caps. */}
      <CapFace position="top" variant={variant} face={topFace} />
      <CapFace position="bottom" variant={variant} face={bottomFace} />
    </>
  );
}

/* ───────────────────────── side face ───────────────────────── */
function SideFace({
  index,
  variant,
  children,
}: {
  index: number;
  variant: FaceVariant;
  children: React.ReactNode;
}) {
  const angle = index * STEP_DEG;
  return (
    <div
      className="absolute inset-0"
      style={{
        transform: `rotateY(${angle}deg) translateZ(calc(var(--side) / 2))`,
        backfaceVisibility: "hidden",
        transformStyle: "preserve-3d",
      }}
    >
      <Panel3D variant={variant}>
        <div className="h-full w-full flex items-center justify-center">
          {children}
        </div>
      </Panel3D>
    </div>
  );
}

/* ───────────────────────── cap face (top/bottom) ─────────────────
 *
 * Top and bottom faces seal the cube volume. When `face` is set, the
 * cap carries a brand logo (MODELS + PLATFORMS cubes). Orientation
 * must face outward — see rotateXDeg comment below.
 */
function CapFace({
  position,
  variant,
  face,
}: {
  position: "top" | "bottom";
  variant: FaceVariant;
  /**
   * Optional brand mark for the cap. Omitted on most cubes so the
   * cap is just material — kept clean. Provided on the big MODELS
   * cube so the top/bottom carry the two remaining flagship logos.
   */
  face?: FaceContent;
}) {
  /*
   * Cap orientation must face OUTWARD from the cube centre. A div's
   * front (+Z) must point away from the volume, not into it — with
   * `backfaceVisibility: hidden`, an inward-facing cap renders its
   * logo on the back face, which is never visible from outside.
   *
   *   top    ▸ rotateX(-90°) then translateZ(+half) → normal +Y
   *   bottom ▸ rotateX(+90°) then translateZ(+half) → normal −Y
   *
   * (The previous sign flip used +90° on top and −90° on bottom,
   * which pointed both caps inward — logos were mounted but hidden.)
   */
  const rotateXDeg = position === "top" ? -90 : 90;
  return (
    <div
      // Marked aria-hidden only when there is no logo content — once
      // there is a brand on the cap, the LogoFace's own <img alt>
      // becomes meaningful and we let it through to assistive tech.
      aria-hidden={face ? undefined : true}
      className="absolute inset-0"
      style={{
        transform: `rotateX(${rotateXDeg}deg) translateZ(calc(var(--side) / 2))`,
        backfaceVisibility: "hidden",
        transformStyle: "preserve-3d",
      }}
    >
      <Panel3D variant={variant}>
        <div className="h-full w-full flex items-center justify-center">
          {face ? <LogoFace face={face} variant={variant} /> : null}
        </div>
      </Panel3D>
    </div>
  );
}

/* ---------------------------------------------------------- floor shadow */
function CubeFloorShadow({ tone }: { tone: "warm" | "cool" }) {
  // Paper-variant cube sits literally on the paper, so its shadow is
  // even softer. The matte/glass shadows are slightly cooler/darker.
  const colour =
    tone === "warm" ? "rgba(10,10,10,0.08)" : "rgba(10,10,10,0.14)";
  return (
    <div
      aria-hidden
      className="absolute pointer-events-none"
      style={{
        left: "50%",
        bottom: "-4%",
        transform: "translateX(-50%)",
        width: "108%",
        height: "10%",
        background: `radial-gradient(50% 50% at 50% 50%, ${colour}, rgba(10,10,10,0) 70%)`,
        filter: "blur(5px)",
      }}
    />
  );
}

/* --------------------------------------------------------------- LogoFace */
function LogoFace({
  face,
  variant,
}: {
  face: FaceContent;
  variant: FaceVariant;
}) {
  // Paper-variant face → black text fallback; everything else → paper-toned.
  const fallbackClass = variant === "paper" ? "text-ink" : "text-paper";
  const sizePct = `${Math.round((face.scale ?? 0.5) * 100)}%`;

  if (face.src) {
    return (
      <img
        src={face.src}
        alt={face.name}
        className="select-none block"
        draggable={false}
        style={{ width: sizePct, height: sizePct, objectFit: "contain" }}
      />
    );
  }
  return (
    <span
      className={`font-display font-medium select-none text-center leading-[1] ${fallbackClass}`}
      style={{
        fontSize: "clamp(0.8rem, 3.2vmin, 1.8rem)",
        letterSpacing: "-0.02em",
      }}
    >
      {face.name}
    </span>
  );
}
