import Image from "next/image";
import Link from "next/link";

export function DashboardLogo({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 group shrink-0"
      aria-label="Duel Agents dashboard home"
    >
      <Image
        src="/logo.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
        priority
      />
      <span
        className="font-display font-medium text-ink group-hover:opacity-80 transition-opacity"
        style={{
          fontSize: "1.05rem",
          letterSpacing: "-0.02em",
        }}
      >
        Duel Agents
      </span>
    </Link>
  );
}
