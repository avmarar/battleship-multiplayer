import type { HTMLAttributes, ReactNode } from "react";

type HudPanelProps = {
  children: ReactNode;
  className?: string;
  tone?: "default" | "accent" | "danger" | "gold";
  corners?: boolean;
} & HTMLAttributes<HTMLDivElement>;

const toneClass: Record<NonNullable<HudPanelProps["tone"]>, string> = {
  default:
    "border-[var(--panel-border)] bg-[var(--panel)] shadow-[0_18px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08),0_0_20px_rgba(0,206,209,0.05)]",
  accent:
    "border-cyan-400/40 bg-cyan-950/20 shadow-[0_18px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(0,242,254,0.2),0_0_30px_rgba(0,242,254,0.1)]",
  danger:
    "border-rose-500/40 bg-rose-950/25 shadow-[0_18px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,46,99,0.2),0_0_30px_rgba(255,46,99,0.12)]",
  gold:
    "border-amber-400/40 bg-amber-950/20 shadow-[0_18px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(245,158,11,0.2),0_0_30px_rgba(245,158,11,0.12)]",
};

export function HudPanel({
  children,
  className = "",
  tone = "default",
  corners = false,
  ...rest
}: HudPanelProps) {
  return (
    <div
      className={[
        "relative rounded-[var(--radius-hud)] border backdrop-blur-xl transition-all duration-200",
        corners ? "hud-corners" : "",
        toneClass[tone],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
