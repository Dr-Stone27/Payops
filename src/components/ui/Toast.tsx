"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, kind: "success" | "error" = "success") => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 300, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} className="wt-toast" style={{
            display: "flex", alignItems: "center", gap: 9,
            background: "#0c1d2e", color: "#fff",
            borderRadius: 11, padding: "11px 16px",
            fontSize: 13, fontWeight: 500,
            boxShadow: "0 12px 32px rgba(12,29,46,.28)",
            maxWidth: 420,
          }}>
            {t.kind === "success"
              ? <CheckCircle2 size={16} color="#34d399" strokeWidth={2.2} style={{ flexShrink: 0 }} />
              : <XCircle size={16} color="#f87171" strokeWidth={2.2} style={{ flexShrink: 0 }} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
