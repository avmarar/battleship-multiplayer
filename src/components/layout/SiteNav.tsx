"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/AccountMenu";

const items = [
  { href: "/", label: "Hub", icon: "⌂" },
  { href: "/lobby", label: "Lobby", icon: "▣" },
  { href: "/placement", label: "Placement", icon: "▦" },
  { href: "/game", label: "Game", icon: "◎" },
  { href: "/scoreboard", label: "Scoreboard", icon: "★" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-[#060c18]/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.7)] transition-all duration-300"
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-2.5 md:px-6 md:py-3">
        {/* Brand / Radar Status Indicator */}
        <Link
          href="/"
          className="hidden items-center gap-2.5 rounded-lg px-2 py-1 text-xs uppercase tracking-[0.2em] font-semibold text-white/90 transition hover:text-cyan-300 md:inline-flex"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]" />
          </span>
          <span className="bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text font-bold text-transparent tracking-[0.25em]">
            BATTLESHIP CIC
          </span>
        </Link>

        {/* Navigation Items */}
        <div className="flex flex-1 items-stretch justify-around gap-1 md:flex-none md:justify-start md:gap-2">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "relative inline-flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-hud)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-all duration-200 sm:px-3 md:min-w-0 md:flex-row md:gap-2 md:px-4 md:py-2 md:text-sm md:normal-case md:tracking-normal",
                  active
                    ? "bg-gradient-to-r from-[#00CED1] to-[#00F2FE] text-[#041218] shadow-[0_0_18px_rgba(0,242,254,0.45)] font-bold"
                    : "text-white/70 hover:bg-sky-500/10 hover:text-cyan-200",
                ].join(" ")}
              >
                <span className="font-mono text-sm md:text-base opacity-80">{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-[#00F2FE] shadow-[0_0_8px_#00f2fe] md:hidden" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Account / Commander Profile Trigger */}
        <AccountMenu />
      </div>
    </nav>
  );
}
