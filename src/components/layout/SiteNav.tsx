"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/auth/AccountMenu";

const items = [
  { href: "/", label: "Hub" },
  { href: "/lobby", label: "Lobby" },
  { href: "/placement", label: "Placement" },
  { href: "/game", label: "Game" },
  { href: "/scoreboard", label: "Scoreboard" },
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
      className="sticky top-0 z-40 border-b border-white/10 bg-[#030614]/90 px-4 py-3 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                active
                  ? "bg-[#00CED1] text-[#041218]"
                  : "text-cyan-100 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
        <AccountMenu />
      </div>
    </nav>
  );
}
