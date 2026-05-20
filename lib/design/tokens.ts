/**
 * TypeScript mirror of styles/tokens.css.
 * Use these for JS-side animations and conditional logic.
 * Keep in sync with the CSS file by hand — there are no other consumers.
 */

export const color = {
  paper: "#d6d5d0",
  paperEdge: "#c2c1bc",
  ink: "#2a2a28",
  inkSoft: "#6a6a66",
  inkFaint: "#8a8a86",
  inkTrue: "#0e0e0c",
  rust: "#c84a1a",
  rustDeep: "#7a2e10",
} as const;

export const ease = {
  outQuart: [0.25, 1, 0.5, 1] as const,
  outExpo: [0.19, 1, 0.22, 1] as const,
  inOutSoft: [0.65, 0, 0.35, 1] as const,
} as const;

export const duration = {
  fast: 0.3,
  base: 0.6,
  slow: 1.0,
  reveal: 1.2,
} as const;

export const layout = {
  frameCount: 10,
  reducedMotionBreakpoint: 768,
} as const;
