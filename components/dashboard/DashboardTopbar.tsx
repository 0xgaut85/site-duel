"use client";

import { SiteTopActions } from "@/components/layout/SiteTopActions";
import { DashboardLogo } from "@/components/dashboard/DashboardLogo";
import { DashboardNavDesktop, DashboardNavMobile } from "@/components/dashboard/DashboardNav";
import { SignOutButton } from "@/app/dashboard/SignOutButton";

export function DashboardTopbar({
  email,
  isAdmin,
}: {
  email: string;
  isAdmin: boolean;
}) {
  const displayEmail =
    email.length > 28 ? `${email.slice(0, 24)}…` : email;

  return (
    <header className="relative border-b border-ink/10 bg-paper/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-[1240px] w-full mx-auto px-6 md:px-10 lg:px-16 h-[4.25rem] flex items-center justify-between gap-4">
        <DashboardLogo />

        <DashboardNavDesktop isAdmin={isAdmin} />

        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <DashboardNavMobile isAdmin={isAdmin} />
          <SiteTopActions variant="light" showDuelApp={false} />
          <span
            className="hidden lg:inline font-mono text-ink-faint max-w-[12rem] truncate"
            style={{ fontSize: "10.5px", letterSpacing: "0.18em" }}
            title={email}
          >
            {displayEmail.toUpperCase()}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
