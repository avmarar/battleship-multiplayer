"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

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
    }, 4000);
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
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2"
        data-testid="toast-stack"
      >
        {toasts.map((toast) => (
          <p
            key={toast.id}
            data-testid="app-toast"
            className={[
              "pointer-events-auto rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg",
              toast.tone === "error"
                ? "border-red-400/40 bg-[#2a1010] text-red-100"
                : toast.tone === "success"
                  ? "border-emerald-400/40 bg-[#102418] text-emerald-100"
                  : "border-white/15 bg-[#0b1220] text-white",
            ].join(" ")}
          >
            {toast.message}
          </p>
        ))}
      </div>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md space-y-4 rounded-3xl border border-white/10 bg-[#0b1220] p-6 text-white"
            data-testid="confirm-dialog"
          >
            <h2 id="confirm-title" className="text-xl font-semibold">
              {confirm.title}
            </h2>
            <p className="text-sm text-white/70">{confirm.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                data-testid="confirm-cancel"
                className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold"
                onClick={() => {
                  confirm.resolve(false);
                  setConfirm(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-accept"
                className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-semibold"
                onClick={() => {
                  confirm.resolve(true);
                  setConfirm(null);
                }}
              >
                {confirm.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
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
