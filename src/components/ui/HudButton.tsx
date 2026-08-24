import type { ButtonHTMLAttributes, ReactNode } from "react";

type HudButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "gold";

type HudButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: HudButtonVariant;
  fullWidth?: boolean;
};

const variantClass: Record<HudButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#00CED1] to-[#00F2FE] text-[#041218] shadow-[0_0_20px_rgba(0,242,254,0.35)] hover:shadow-[0_0_28px_rgba(0,242,254,0.55)] hover:brightness-110 disabled:bg-none disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none",
  secondary:
    "border border-[#00CED1]/50 bg-[#101b2d]/85 text-cyan-100 shadow-[0_0_15px_rgba(0,206,209,0.15)] hover:border-[#00CED1] hover:bg-[#16243c] hover:text-white hover:shadow-[0_0_20px_rgba(0,242,254,0.25)]",
  danger:
    "bg-gradient-to-r from-[#FF4500] to-[#FF2E63] text-white shadow-[0_0_20px_rgba(255,46,99,0.35)] hover:shadow-[0_0_28px_rgba(255,46,99,0.55)] hover:brightness-110 disabled:bg-none disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none",
  ghost:
    "border border-white/15 bg-white/5 text-white/80 backdrop-blur-md hover:border-cyan-400/50 hover:bg-cyan-950/30 hover:text-cyan-100 hover:shadow-[0_0_15px_rgba(0,242,254,0.15)]",
  gold:
    "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] text-[#1a1003] shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_28px_rgba(245,158,11,0.55)] hover:brightness-110 disabled:bg-none disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none",
};

export function HudButton({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  type = "button",
  ...rest
}: HudButtonProps) {
  return (
    <button
      type={type}
      className={[
        "relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 overflow-hidden",
        "rounded-[var(--radius-hud)] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.08em]",
        "transition-all duration-150 enabled:active:scale-95 enabled:active:brightness-95",
        "disabled:cursor-not-allowed disabled:active:scale-100",
        fullWidth ? "w-full" : "",
        variantClass[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
