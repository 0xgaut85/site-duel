"use client";

import { GithubIcon } from "@/components/icons/GithubIcon";
import { XIcon } from "@/components/icons/XIcon";
import { LiquidButton } from "@/components/ui/LiquidButton";
import { GITHUB_URL, X_TWITTER_URL } from "@/lib/site-links";

export type SiteTopActionsVariant = "light" | "dark" | "difference";

export interface SiteTopActionsProps {
  variant?: SiteTopActionsVariant;
  showDuelApp?: boolean;
  className?: string;
}

const iconLinkBase =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-70";

function iconStyles(variant: SiteTopActionsVariant): string {
  switch (variant) {
    case "dark":
      return `${iconLinkBase} text-paper`;
    case "difference":
      return `${iconLinkBase} text-[rgba(220,220,220,0.92)]`;
    default:
      return `${iconLinkBase} text-ink`;
  }
}

export function SiteTopActions({
  variant = "light",
  showDuelApp = true,
  className = "",
}: SiteTopActionsProps) {
  const iconClass = iconStyles(variant);
  const differenceBlend = variant === "difference";

  return (
    <div
      data-site-chrome=""
      className={`flex items-center gap-2.5 ${className}`}
      style={differenceBlend ? { mixBlendMode: "difference" } : undefined}
    >
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={iconClass}
        aria-label="GitHub"
        style={differenceBlend ? { mixBlendMode: "difference" } : undefined}
      >
        <GithubIcon />
      </a>
      <a
        href={X_TWITTER_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={iconClass}
        aria-label="X (Twitter)"
        style={differenceBlend ? { mixBlendMode: "difference" } : undefined}
      >
        <XIcon />
      </a>
      {showDuelApp && (
        <LiquidButton href="/dashboard" darkBg={variant === "dark"} size="compact">
          DUEL APP
        </LiquidButton>
      )}
    </div>
  );
}
