import type { ReactNode } from "react";
import {
  Atmosphere,
  type AtmosphereVariant,
} from "@/components/visual/Atmosphere";

type CommandShellProps = {
  variant: AtmosphereVariant;
  children: ReactNode;
  className?: string;
  showSonar?: boolean;
};

export function CommandShell({
  variant,
  children,
  className = "",
  showSonar = true,
}: CommandShellProps) {
  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-[#050b14] text-white selection:bg-cyan-500/30 selection:text-cyan-100 ${className}`}
    >
      <Atmosphere variant={variant} showSonar={showSonar} />
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 md:py-10">
        {children}
      </div>
    </div>
  );
}
