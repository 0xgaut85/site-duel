/**
 * Dashboard chrome — auth gate + topbar shell + main scrollable area.
 */

import Link from "next/link";
import { requireSession, isAdminEmail } from "@/lib/session";
import { DashboardTopbar } from "@/components/dashboard/DashboardTopbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const isAdmin = isAdminEmail(session.user.email);

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <DashboardTopbar email={session.user.email} isAdmin={isAdmin} />
      <main className="flex-1 px-6 md:px-10 lg:px-16 py-10 max-w-[1240px] w-full mx-auto">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer
      className="border-t border-ink/10 px-6 md:px-10 lg:px-16 py-5 font-mono text-ink-faint flex items-center justify-between max-w-[1240px] w-full mx-auto"
      style={{ fontSize: "10px", letterSpacing: "0.28em" }}
    >
      <span>© DUEL AGENTS 2026</span>
      <Link href="/" className="hover:text-ink transition-colors">
        ← BACK TO SITE
      </Link>
    </footer>
  );
}
