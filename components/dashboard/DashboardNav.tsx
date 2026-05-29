"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "OVERVIEW", exact: true },
  { href: "/dashboard/settings", label: "SETTINGS", exact: false },
  { href: "/dashboard/billing", label: "BILLING", exact: false },
] as const;

function NavLink({
  href,
  label,
  exact,
  onNavigate,
}: {
  href: string;
  label: string;
  exact: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`relative py-1 transition-opacity hover:opacity-70 ${
        active ? "text-ink" : "text-ink-faint"
      }`}
      style={{ fontSize: "11px", letterSpacing: "0.22em" }}
    >
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 right-0 -bottom-0.5"
          style={{ height: 1, background: "var(--rust)" }}
        />
      )}
    </Link>
  );
}

export function DashboardNavDesktop({ isAdmin }: { isAdmin: boolean }) {
  return (
    <nav
      className="hidden md:flex items-center gap-8 font-mono"
      aria-label="Dashboard"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
      {isAdmin && (
        <Link
          href="/admin"
          className="text-rust hover:opacity-70 transition-opacity py-1"
          style={{ fontSize: "11px", letterSpacing: "0.22em" }}
        >
          ADMIN
        </Link>
      )}
    </nav>
  );
}

export function DashboardNavMobile({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-ink-faint hover:text-ink transition-colors px-2 py-1"
        style={{ fontSize: "10px", letterSpacing: "0.22em" }}
        aria-expanded={open}
        aria-controls="dashboard-mobile-nav"
      >
        {open ? "CLOSE" : "MENU"}
      </button>
      {open && (
        <nav
          id="dashboard-mobile-nav"
          className="absolute left-0 right-0 top-full border-b border-ink/10 bg-paper px-6 py-4 flex flex-col gap-4 font-mono z-50"
          aria-label="Dashboard mobile"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              onNavigate={() => setOpen(false)}
            />
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className={`py-1 ${
                pathname.startsWith("/admin") ? "text-rust" : "text-ink-faint"
              }`}
              style={{ fontSize: "11px", letterSpacing: "0.22em" }}
            >
              ADMIN
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
