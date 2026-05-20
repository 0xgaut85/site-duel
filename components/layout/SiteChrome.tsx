/*
 * Fixed chrome visible on every carousel frame — top-right social link.
 * Sits above the slide content (z-60) but below the page transition (z-200).
 */

const X_URL = "https://x.com/duelagentscom";

export function SiteChrome() {
  return (
    <a
      href={X_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed z-[60] pointer-events-auto font-mono text-[10px] tracking-[0.28em] transition-opacity hover:opacity-70"
      style={{
        top: "var(--frame-padding)",
        right: "var(--frame-padding)",
        mixBlendMode: "difference",
        color: "rgba(220,220,220,0.92)",
      }}
    >
      X / TWITTER
    </a>
  );
}
