"use client";

import { useState } from "react";
import { LargeGraph } from "./LargeGraph";
import { ScrambleText } from "./ScrambleText";
import { useCarousel } from "@/components/carousel/CarouselContext";

/*
 * 02 · INFO — four-box grid.
 *
 *   ┌───────────────┬───────────────┐
 *   │  01 · WHAT    │  02 · HOW     │
 *   │  paragraph    │  schema       │
 *   ├───────────────┼───────────────┤
 *   │  03 · PROOF   │  04 · NEXT    │
 *   │  −73% + graph │  CTA          │
 *   └───────────────┴───────────────┘
 *
 * Thin grass-green hairlines cross the frame both ways forming the
 * gutters. Each box is frosted (low contrast, slight blur, scrim
 * overlay) at rest; hover removes the scrim and sharpens the content.
 * The hovered box reads as the "focused" one, the rest fall into the
 * background.
 */

type BoxId = "what" | "how" | "proof" | "next";

/* ---------------------------------------------------- type scale (shared)
 *
 * One scale, four boxes. Every headline uses the SAME font, weight, leading
 * and clamp; every body paragraph uses the SAME font and clamp. The boxes
 * differ in content, not in typography, so the grid reads as one piece.
 *
 *   - title  : Space Grotesk (font-display), medium, large display size
 *   - eyebrow: Geist Mono (font-mono), the 01 · WHAT corner label
 *   - body   : Inter (default), 14–17px fluid
 *   - tag    : Geist Mono (font-mono), small all-caps
 */
const TYPE = {
  title: {
    fontSize: "clamp(1.75rem, 3vw, 2.6rem)",
    lineHeight: 1.02,
    letterSpacing: "-0.025em",
  } as const,
  body: {
    fontSize: "clamp(0.95rem, 1.1vw, 1.075rem)", // ~15–17 px
    lineHeight: 1.55,
  } as const,
  tag: {
    fontSize: "clamp(10px, 0.85vw, 11.5px)",
    letterSpacing: "0.22em",
  } as const,
};

export function InfoFrame() {
  const [hovered, setHovered] = useState<BoxId | null>(null);
  const idle = hovered === null;

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      /* Base tone is INK, not PAPER. Every box on this frame is
       * darkBg (dark photo + scrim), and during the hover→idle scrim
       * transition the box's image fades through partial opacity for
       * ~500ms. With a paper base, the paper-white leaks at the seams
       * and reads as a visible white separator between cells. With an
       * ink base, the seams stay ink-on-ink and the boxes feel like a
       * single continuous surface that lights up the hovered cell.
       */
      style={{ background: "var(--ink)", color: "var(--paper)" }}
    >
      {/* 2 × 2 grid + crosshair dividers. Edge-to-edge — no outer
          padding, no frame label. Each box owns its own corner label. */}
      <div className="absolute inset-0 z-10">
        <div className="relative h-full w-full grid grid-cols-2 grid-rows-2">
          <Box
            id="what"
            label="01 · WHAT"
            hovered={hovered === "what"}
            anyHovered={!idle}
            setHovered={setHovered}
            backgroundImage="/image3.png"
            darkBg
          >
            <WhatContent active={hovered === "what"} darkBg />
          </Box>
          <Box
            id="how"
            label="02 · HOW"
            hovered={hovered === "how"}
            anyHovered={!idle}
            setHovered={setHovered}
            backgroundImage="/image1.png"
            darkBg
          >
            <HowContent active={hovered === "how"} darkBg />
          </Box>
          <Box
            id="proof"
            label="03 · PROOF"
            hovered={hovered === "proof"}
            anyHovered={!idle}
            setHovered={setHovered}
            backgroundImage="/image2.png"
            darkBg
          >
            <ProofContent active={hovered === "proof"} darkBg />
          </Box>
          <Box
            id="next"
            label="04 · WHY"
            hovered={hovered === "next"}
            anyHovered={!idle}
            setHovered={setHovered}
            backgroundImage="/image4.png"
            darkBg
          >
            <WhyContent active={hovered === "next"} darkBg />
          </Box>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Box */

interface BoxProps {
  id: BoxId;
  label: string;
  hovered: boolean;
  anyHovered: boolean;
  setHovered: (id: BoxId | null) => void;
  children: React.ReactNode;
  /**
   * Optional decorative background image for this box. Renders behind
   * the content layer, ABOVE the scrim's base background, so the scrim
   * fades the image alongside the content in lockstep.
   */
  backgroundImage?: string;
  /**
   * Flips the scrim, labels and hint to paper-toned colours for boxes
   * with dark imagery behind them. The content layer is also told (via
   * its `darkBg` prop) so its inner text can swap to paper as well.
   */
  darkBg?: boolean;
}

function Box({
  id,
  label,
  hovered,
  anyHovered,
  setHovered,
  children,
  backgroundImage,
  darkBg,
}: BoxProps) {
  // Three visual states:
  //   - idle (no box hovered):         medium scrim, slight blur
  //   - this hovered:                  no scrim, no blur, slight scale
  //   - another hovered:               heavier scrim, more blur (recedes)
  const scrim = hovered ? 0 : anyHovered ? 0.55 : 0.32;
  const blur = hovered ? 0 : anyHovered ? 3 : 1.4;

  return (
    <div
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(id)}
      onBlur={() => setHovered(null)}
      tabIndex={0}
      role="group"
      aria-label={label}
      className="relative overflow-hidden cursor-default outline-none group"
      style={{
        padding: "clamp(1.75rem, 3.2vw, 3rem)",
      }}
    >
      {/* Background image — z = 0. Behind everything, fades with the
          scrim. Slightly desaturated at idle, full saturation on hover. */}
      {backgroundImage && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: hovered ? 1 : anyHovered ? 0.6 : 0.85,
            filter: hovered
              ? "saturate(1) contrast(1)"
              : "saturate(0.55) contrast(0.95)",
            transition:
              "opacity 500ms cubic-bezier(0.19, 1, 0.22, 1), filter 500ms ease",
          }}
        />
      )}

      {/* Content layer — blurred + faded when scrimmed. (z = 1) */}
      <div
        className="relative h-full w-full"
        style={{
          zIndex: 1,
          paddingTop: "clamp(2.25rem, 3.8vw, 2.85rem)",
          filter: `blur(${blur}px)`,
          opacity: hovered ? 1 : anyHovered ? 0.5 : 0.78,
          transform: hovered ? "scale(1.0)" : "scale(0.985)",
          transition:
            "filter 500ms cubic-bezier(0.19, 1, 0.22, 1), opacity 500ms ease, transform 500ms cubic-bezier(0.19, 1, 0.22, 1)",
        }}
      >
        {children}
      </div>

      {/* Scrim overlay — white wash for paper boxes, ink wash for
          image boxes so the bright image fades to dark rather than to
          white (z = 2). */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          background: darkBg ? "var(--ink)" : "var(--paper)",
          opacity: scrim,
          transition: "opacity 500ms cubic-bezier(0.19, 1, 0.22, 1)",
        }}
      />

      {/* Label — sits above the scrim so it's always readable (z = 3). */}
      <span
        className={`absolute font-mono pointer-events-none ${
          darkBg ? "text-paper-faint" : "text-ink-faint"
        }`}
        style={{
          ...TYPE.tag,
          zIndex: 3,
          top: "clamp(1rem, 2vw, 1.5rem)",
          left: "clamp(1rem, 2vw, 1.5rem)",
        }}
      >
        {label}
      </span>

      {/* Hover hint — "HOVER ↗" in the bottom-right, fades out the
          moment ANY box (this one or another) is active. (z = 3) */}
      <span
        aria-hidden
        className={`absolute font-mono pointer-events-none transition-opacity duration-300 ${
          darkBg ? "text-paper-faint" : "text-ink-faint"
        }`}
        style={{
          ...TYPE.tag,
          zIndex: 3,
          bottom: "clamp(1rem, 2vw, 1.5rem)",
          right: "clamp(1rem, 2vw, 1.5rem)",
          opacity: hovered || anyHovered ? 0 : 0.65,
        }}
      >
        HOVER ↗
      </span>
    </div>
  );
}

/* -------------------------------------------------------- 01 WHAT box */

function WhatContent({
  active,
  darkBg,
}: {
  active: boolean;
  darkBg?: boolean;
}) {
  const fade = darkBg ? "text-paper-faint" : "text-ink-faint";
  const soft = darkBg ? "text-paper-faint" : "text-ink-soft";
  return (
    <div className="h-full w-full flex flex-col gap-6 min-h-0">
      <h2
        className={`font-display font-medium max-w-[18ch] flex-none ${
          darkBg ? "text-paper" : "text-ink"
        }`}
        style={TYPE.title}
      >
        <ScrambleText
          text="Agents that compete,"
          active={active}
          duration={1}
          className="block"
        />
        <ScrambleText
          text="so your wallet doesn't."
          active={active}
          duration={1.1}
          delay={0.15}
          className={`block ${fade}`}
        />
      </h2>

      {/* Middle stanza — fills the centre, gives the box a "magazine
          pull-quote" feel instead of empty space between title and pin. */}
      <div className="flex-1 min-h-0 flex flex-col justify-center gap-4 max-w-[52ch]">
        <div className="flex items-start gap-3">
          <img
            aria-hidden
            src="/logo.png"
            alt=""
            className="flex-none block select-none"
            style={{
              width: "clamp(18px, 1.6vw, 24px)",
              height: "clamp(18px, 1.6vw, 24px)",
              objectFit: "contain",
              filter: darkBg ? "brightness(0) invert(1)" : "brightness(0)",
              marginTop: "0.05em",
            }}
          />
          <p className={soft} style={TYPE.body}>
            Duel Agents is an IDE-native framework that runs every model
            you have access to against each other on the same prompt.
            The cheapest answer that still passes our quality checks
            wins.
          </p>
        </div>
        <p className={`pl-[calc(clamp(18px,1.6vw,24px)+0.75rem)] ${soft}`} style={TYPE.body}>
          Flagship-level results, without flagship-level bills.
        </p>
      </div>

      {/* Footer rail — three mono breadcrumbs anchor the bottom of the
          box so the composition reads as fully filled. */}
      <div
        className={`flex-none flex items-baseline gap-4 font-mono ${fade}`}
        style={TYPE.tag}
      >
        <span>/ ROUTE</span>
        <span>/ SCORE</span>
        <span>/ SPLIT</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- 02 HOW box */

function HowContent({
  active,
  darkBg,
}: {
  active: boolean;
  darkBg?: boolean;
}) {
  // Layout: a single short header rail at the top (title left, mono
  // caption right) followed by the schema filling ALL remaining
  // vertical space. The previous design wasted ~25% of the box on
  // header/paragraph/footer mono lines — the diagram is the content,
  // not a footnote.
  return (
    <div className="h-full w-full flex flex-col gap-4 min-h-0">
      <div className="flex-none flex flex-col gap-2">
        <h2
          className={`font-display font-medium max-w-[22ch] ${
            darkBg ? "text-paper" : "text-ink"
          }`}
          style={TYPE.title}
        >
          <ScrambleText
            text="One prompt."
            active={active}
            duration={0.9}
            className="block"
          />
          <ScrambleText
            text="Many tries. One bill."
            active={active}
            duration={1.1}
            delay={0.15}
            className={`block ${darkBg ? "text-paper-faint" : "text-ink-faint"}`}
          />
        </h2>

        {/* Flow legend — one line, big enough to read at a glance.
            Mono caps with arrow glyphs separating the tiers. Forced to
            pure white on the dark image background for maximum
            legibility against the photo. */}
        <p
          className={`font-mono ${darkBg ? "text-white" : "text-ink-faint"}`}
          style={{
            fontSize: "clamp(11px, 0.95vw, 13.5px)",
            letterSpacing: "0.22em",
          }}
        >
          PROMPT&nbsp;→&nbsp;MODELS&nbsp;→&nbsp;WINNER&nbsp;→&nbsp;SUB&nbsp;→&nbsp;MINI
        </p>
      </div>

      {/* Schema region — takes the entire remaining height. Aspect is
          preserved inside the SVG (xMidYMid meet) so nothing
          distorts, but the SVG itself scales up to fully fill the
          available area in whichever axis is the bottleneck. */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <Schema darkBg={darkBg} />
      </div>
    </div>
  );
}

/**
 * The HOW box's schema — a single SVG that fills its container.
 *
 *   ┌────────────────────────────────────────────────┐
 *   │                  ┌─PROMPT─┐                    │
 *   │                  └────┬───┘                    │
 *   │          ┌──────┬─────┼─────┬──────┐           │
 *   │  MODEL A  MODEL B  MODEL C★  MODEL D  MODEL n+1│
 *   │                       ↓                        │
 *   │       SUB ──── SUB ──── SUB ──── SUB           │
 *   │      ╱│╲      ╱│╲      ╱│╲      ╱│╲            │
 *   │     mini × n  mini × n mini × n  mini × n      │
 *   └────────────────────────────────────────────────┘
 *
 * Drawn as a single viewBox so the layout is fully controlled. Nodes
 * are <rect> + <text>, connectors are <line>s that anchor on the node
 * centres, so they always line up — no more "lines floating in space".
 */
function Schema({ darkBg }: { darkBg?: boolean }) {
  // ViewBox aspect ~ 5 : 2.9. The container in the HOW box is
  // wider than it is tall (a quadrant of a landscape frame), so the
  // SVG is height-bound under `xMidYMid meet`. Tightening H against
  // W lets the diagram spread to use more horizontal real-estate
  // before the height runs out.
  const W = 1000;
  const H = 580;

  // Y-positions for the three tiers + the row for mini agents +
  // a small label band beneath the mini dots so users can actually
  // identify them as "mini agents". Slightly compressed compared to
  // the previous 700-tall canvas so the whole graph still breathes
  // inside the shorter viewBox.
  const Y_PROMPT = 60;
  const Y_MODELS = 215;
  const Y_SUBS = 355;
  const Y_MINIS = 470;
  const Y_MINI_LABEL = 545;

  const promptX = W / 2;
  // Five models — A through D plus an explicit `MODEL n+1` slot that
  // makes the "and every other model you have access to" point on the
  // diagram itself. Winner is positioned dead-centre (x = W/2) so the
  // sub/mini cascade below it reads as a clean vertical drop.
  const models = [
    { x: 100, label: "MODEL A" },
    { x: 300, label: "MODEL B" },
    { x: 500, label: "MODEL C", winner: true },
    { x: 700, label: "MODEL D" },
    { x: 900, label: "MODEL n+1" },
  ];
  // Sub-agents — distributed under the winner branch (centred on
  // W/2 = 500) so they read as a fan-out from MODEL C, not a
  // free-standing row.
  const subs = [260, 420, 580, 740].map((x) => ({ x }));
  // For each sub we drop 3 mini-agent squares below it (12 total).
  // Spacing tuned so each cluster of 3 spans roughly the same width
  // as the sub-agent box above it (~160 viewBox units), making the
  // mini row visually centred with the sub row.
  const MINI_SPACING = 50;
  const miniDots: { x: number }[] = subs.flatMap((s) =>
    [-MINI_SPACING, 0, MINI_SPACING].map((dx) => ({ x: s.x + dx })),
  );

  // Winner node — the one whose answer is kept and split into sub-agents.
  const winnerX = models.find((m) => m.winner)!.x;

  const neutralStroke = darkBg
    ? "rgba(255,255,255,0.32)"
    : "rgba(10,10,10,0.22)";
  const neutralText = darkBg ? "rgba(232,232,228,0.78)" : "rgba(10,10,10,0.62)";
  const accent = "var(--rust)";

  // Sized rect helper — width/height/label/x/y, with optional accent.
  function Node({
    x,
    y,
    w,
    h,
    label,
    accentBorder,
    accentFill,
    small,
  }: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    accentBorder?: boolean;
    accentFill?: boolean;
    small?: boolean;
  }) {
    return (
      <g>
        <rect
          x={x - w / 2}
          y={y - h / 2}
          width={w}
          height={h}
          fill={accentFill ? "rgba(200,74,26,0.12)" : "transparent"}
          stroke={accentBorder ? accent : neutralStroke}
          strokeWidth={accentBorder ? 1.8 : 1.2}
          vectorEffect="non-scaling-stroke"
        />
        {/*
         * Letter-spacing reduced from 4 → 2 across the diagram so the
         * longest labels (e.g. "MODEL n+1") no longer kiss the box
         * borders. The `small` flag also drops the font size for that
         * one label to 26 (vs 34 for regular boxes), keeping a uniform
         * ~10px gutter on every side of every node.
         */}
        <text
          x={x}
          y={y + (small ? 9 : 11)}
          textAnchor="middle"
          fontSize={small ? 26 : 34}
          letterSpacing={2}
          fontFamily="var(--mono-font)"
          fill={accentBorder ? accent : neutralText}
          style={{ fontWeight: 500 }}
        >
          {label}
        </text>
      </g>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="block w-full h-full"
      role="img"
      aria-label="Duel Agents architecture: prompt fans out to four models, winning model splits into sub-agents, sub-agents split into mini-agents."
    >
      {/* ────────── connectors (drawn first so they sit behind rects) */}
      {/* prompt → each model (vertical drop then horizontal trunk) */}
      <g
        stroke={neutralStroke}
        strokeWidth={1.2}
        fill="none"
        vectorEffect="non-scaling-stroke"
      >
        {/* Vertical drop from prompt */}
        <line
          x1={promptX}
          y1={Y_PROMPT + 38}
          x2={promptX}
          y2={(Y_PROMPT + Y_MODELS) / 2}
        />
        {/* Trunk spanning the four models */}
        <line
          x1={models[0].x}
          y1={(Y_PROMPT + Y_MODELS) / 2}
          x2={models[models.length - 1].x}
          y2={(Y_PROMPT + Y_MODELS) / 2}
        />
        {/* Drop from trunk into each model */}
        {models.map((m) => (
          <line
            key={`drop-m-${m.x}`}
            x1={m.x}
            y1={(Y_PROMPT + Y_MODELS) / 2}
            x2={m.x}
            y2={Y_MODELS - 38}
          />
        ))}

        {/* winning model → subs trunk (accented) */}
        <line
          x1={winnerX}
          y1={Y_MODELS + 38}
          x2={winnerX}
          y2={(Y_MODELS + Y_SUBS) / 2}
          stroke={accent}
          strokeWidth={1.8}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={subs[0].x}
          y1={(Y_MODELS + Y_SUBS) / 2}
          x2={subs[subs.length - 1].x}
          y2={(Y_MODELS + Y_SUBS) / 2}
          stroke={accent}
          strokeWidth={1.8}
          vectorEffect="non-scaling-stroke"
        />
        {subs.map((s) => (
          <line
            key={`drop-s-${s.x}`}
            x1={s.x}
            y1={(Y_MODELS + Y_SUBS) / 2}
            x2={s.x}
            y2={Y_SUBS - 30}
            stroke={accent}
            strokeWidth={1.8}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* subs → minis: each sub fans out into 3 mini-agent squares.
            Lines stop just above the squares so they don't visually
            spike INTO the rect. */}
        {subs.map((s) =>
          [-MINI_SPACING, 0, MINI_SPACING].map((dx) => (
            <line
              key={`drop-mini-${s.x}-${dx}`}
              x1={s.x}
              y1={Y_SUBS + 30}
              x2={s.x + dx}
              y2={Y_MINIS - 20}
            />
          )),
        )}
      </g>

      {/* ────────── nodes */}
      <Node x={promptX} y={Y_PROMPT} w={260} h={76} label="PROMPT" accentBorder />
      {models.map((m) => (
        <Node
          key={m.label}
          x={m.x}
          y={Y_MODELS}
          w={180}
          h={76}
          label={m.label}
          accentBorder={m.winner}
          accentFill={m.winner}
          small={m.label === "MODEL n+1"}
        />
      ))}
      {subs.map((s, i) => (
        <Node
          key={`sub-${i}`}
          x={s.x}
          y={Y_SUBS}
          w={160}
          h={60}
          label="SUB"
          small
        />
      ))}
      {/* mini agents — twelve small squares carrying the white Duel
          Agents logo. The accent fill makes them read as a
          continuation of the winning branch; the embedded logo
          identifies them concretely as "agents" instead of an
          abstract mark. */}
      {(() => {
        const SQUARE = 38; // viewBox units per side
        const PAD = 4; // inner padding around the logo (smaller pad = bigger logo)
        return miniDots.map((m, i) => (
          <g key={`mini-${i}`}>
            <rect
              x={m.x - SQUARE / 2}
              y={Y_MINIS - SQUARE / 2}
              width={SQUARE}
              height={SQUARE}
              fill={accent}
              stroke={accent}
              strokeWidth={1.2}
              vectorEffect="non-scaling-stroke"
            />
            <image
              href="/logo.png"
              x={m.x - SQUARE / 2 + PAD}
              y={Y_MINIS - SQUARE / 2 + PAD}
              width={SQUARE - PAD * 2}
              height={SQUARE - PAD * 2}
              preserveAspectRatio="xMidYMid meet"
              style={{
                // Render the logo white regardless of source PNG colour.
                filter: "brightness(0) invert(1)",
              }}
            />
          </g>
        ));
      })()}

      {/* MINI-AGENTS row label — short mono tag below the squares. */}
      <text
        x={W / 2}
        y={Y_MINI_LABEL}
        textAnchor="middle"
        fontSize={28}
        letterSpacing={5}
        fontFamily="var(--mono-font)"
        fill={accent}
        style={{ fontWeight: 500 }}
      >
        MINI-AGENTS
      </text>

    </svg>
  );
}

/* ------------------------------------------------------- 03 PROOF box */

function ProofContent({
  active,
  darkBg,
}: {
  active: boolean;
  darkBg?: boolean;
}) {
  return (
    <div className="h-full w-full flex flex-col gap-5 min-h-0">
      <div className="flex-none">
        <h2
          className={`font-display font-medium max-w-[18ch] ${
            darkBg ? "text-paper" : "text-ink"
          }`}
          style={TYPE.title}
        >
          <ScrambleText
            text="Same answer."
            active={active}
            duration={0.9}
            className="block"
          />
          <ScrambleText
            text="A fraction of the bill."
            active={active}
            duration={1.05}
            delay={0.15}
            className={`block ${darkBg ? "text-paper-faint" : "text-ink-faint"}`}
          />
        </h2>
        <div
          className={`mt-3 font-mono ${
            darkBg ? "text-paper-faint" : "text-ink-faint"
          }`}
          style={TYPE.tag}
        >
          <span style={{ color: "var(--rust)" }}>−73%</span> SPEND VS FLAGSHIP-ONLY, SAME TASK SET
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <LargeGraph darkBg={darkBg} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------- 04 WHY box
 *
 * "Why this, not the existing tools." A short scrambled headline and
 * a list of three concrete differentiators with mono lead-ins, then a
 * quiet `request access` link in the footer (no longer the focus of
 * the box — supporting action, not the headline).
 */

function WhyContent({
  active,
  darkBg,
}: {
  active: boolean;
  darkBg?: boolean;
}) {
  const { goTo, frames } = useCarousel();
  const accessIndex = frames.findIndex((f) => f.id === "04-access");
  const heading = darkBg ? "text-white" : "text-ink";
  // On the dark photo background the original paper-faint hairlines
  // were too low-contrast to read against the noise of the image, so
  // we promote both the tag column and the body copy to pure white.
  const fade = darkBg ? "text-white" : "text-ink-faint";
  const soft = darkBg ? "text-white" : "text-ink-soft";

  return (
    <div className="h-full w-full flex flex-col gap-6 min-h-0">
      <h2
        className={`font-display font-medium flex-none max-w-[20ch] ${heading}`}
        style={TYPE.title}
      >
        <ScrambleText
          text="Built for the IDE,"
          active={active}
          duration={1}
          className="block"
        />
        <ScrambleText
          text="priced for indie devs."
          active={active}
          duration={1.1}
          delay={0.15}
          className={`block ${fade}`}
        />
      </h2>

      <ul className="flex-1 min-h-0 flex flex-col gap-4 justify-center">
        {WHY_POINTS.map((point) => (
          <li key={point.tag} className="flex items-baseline gap-4">
            <span
              className={`font-mono flex-none ${fade}`}
              style={{
                ...TYPE.tag,
                width: "clamp(5.5rem, 7vw, 7rem)",
              }}
            >
              {point.tag}
            </span>
            <p className={`min-w-0 ${soft}`} style={TYPE.body}>
              {point.body}
            </p>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => accessIndex >= 0 && goTo(accessIndex)}
        className={`group self-start inline-flex items-baseline gap-2 font-mono pointer-events-auto flex-none ${heading}`}
        style={TYPE.tag}
      >
        <span className="relative whitespace-nowrap">
          request access
          <span
            aria-hidden
            className="absolute left-0 right-0 -bottom-1 origin-left transition-all duration-300 group-hover:-bottom-1.5"
            style={{ background: "var(--rust)", height: 1 }}
          />
        </span>
        <span
          aria-hidden
          className="translate-x-0 group-hover:translate-x-1 transition-transform"
          style={{ color: "var(--rust)" }}
        >
          ↗
        </span>
      </button>
    </div>
  );
}

const WHY_POINTS = [
  {
    tag: "/ NATIVE",
    body: "Plugs into Cursor, Claude Code, Codex, OpenClaw and other agent IDEs as a drop-in router. No new shell, no new contract.",
  },
  {
    tag: "/ MERIT",
    body: "Models are picked by public benchmarks plus our private eval suite, scored in real-time on the actual task you sent.",
  },
  {
    tag: "/ SPLIT",
    body: "Recursive decomposition: jobs fan out into sub-agents, sub-agents into mini-agents on the cheapest tier that still wins.",
  },
];
