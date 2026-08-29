"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { HudButton } from "@/components/ui/HudButton";
import { HudPanel } from "@/components/ui/HudPanel";

export type ToastTone = "info" | "success" | "error";

export type Toast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  resolve: (value: boolean) => void;
};

type ToastContextValue = {
  toasts: Toast[];
  pushToast: (message: string, tone?: ToastTone) => void;
  confirmAction: (input: {
    title: string;
    message: string;
    confirmLabel?: string;
  }) => Promise<boolean>;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const pushToast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const confirmAction = useCallback(
    (input: { title: string; message: string; confirmLabel?: string }) =>
      new Promise<boolean>((resolve) => {
        setConfirm({ ...input, resolve });
      }),
    []
  );

  const value = useMemo(
    () => ({ toasts, pushToast, confirmAction }),
    [toasts, pushToast, confirmAction]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--nav-offset-bottom)+1rem)] z-50 flex justify-center px-4 md:bottom-8"
        data-testid="toast-stack"
      >
        <div className="flex w-full max-w-md flex-col gap-2.5">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              data-testid="app-toast"
              className={[
                "pointer-events-auto flex items-center gap-3 rounded-[var(--radius-hud)] border px-4 py-3.5 text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200",
                toast.tone === "error"
                  ? "border-rose-500/50 bg-rose-950/90 text-rose-100 shadow-[0_0_20px_rgba(255,46,99,0.3)]"
                  : toast.tone === "success"
                    ? "border-emerald-500/50 bg-emerald-950/90 text-emerald-100 shadow-[0_0_20px_rgba(0,245,160,0.3)]"
                    : "border-cyan-500/40 bg-[#060f1e]/95 text-cyan-100 shadow-[0_0_20px_rgba(0,242,254,0.25)]",
              ].join(" ")}
            >
              <span className="text-base">
                {toast.tone === "error" ? "⚠️" : toast.tone === "success" ? "✓" : "📡"}
              </span>
              <p className="flex-1 font-mono text-xs leading-relaxed">{toast.message}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md animate-in fade-in duration-150">
          <HudPanel
            corners
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md space-y-4 p-7 text-white"
            data-testid="confirm-dialog"
          >
            <div className="flex items-center gap-2 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              <p className="text-xs uppercase tracking-[0.3em] font-mono">
                TACTICAL CONFIRMATION REQUIRED
              </p>
            </div>
            <h2 id="confirm-title" className="text-2xl font-black uppercase tracking-[0.04em] text-white">
              {confirm.title}
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">{confirm.message}</p>
            <div className="flex justify-end gap-3 pt-3">
              <HudButton
                data-testid="confirm-cancel"
                variant="ghost"
                onClick={() => {
                  confirm.resolve(false);
                  setConfirm(null);
                }}
              >
                Cancel
              </HudButton>
              <HudButton
                data-testid="confirm-accept"
                variant="danger"
                onClick={() => {
                  confirm.resolve(true);
                  setConfirm(null);
                }}
              >
                {confirm.confirmLabel ?? "Confirm"}
              </HudButton>
            </div>
          </HudPanel>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      pushToast: () => undefined,
      confirmAction: async () => true,
    };
  }
  return context;
}
