"use client";

import { useEffect } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel = "Go back", danger, loading, onConfirm, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ position: "fixed", inset: 0, background: "rgba(12,29,46,.5)", zIndex: 250, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={() => { if (!loading) onClose(); }}
    >
      <div
        className="wt-pop"
        onClick={e => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 16, padding: "26px 26px 22px", maxWidth: 400, width: "100%", boxShadow: "0 24px 64px rgba(12,29,46,.24)" }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 11, background: danger ? "#fdeceb" : "#ecf6f1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          {danger
            ? <AlertTriangle size={19} color="#dc4338" strokeWidth={2} />
            : <HelpCircle size={19} color="#0e7a5a" strokeWidth={2} />}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#0c1d2e", letterSpacing: "-.01em", marginBottom: 7 }}>{title}</div>
        <p style={{ fontSize: 13, color: "#6b7785", lineHeight: 1.6, margin: "0 0 20px" }}>{body}</p>
        <div style={{ display: "flex", gap: 9 }}>
          <button onClick={onClose} disabled={loading} className="wt-btn"
            style={{ flex: 1, height: 42, background: "#fff", color: "#3f4d5a", border: "1px solid #dce1e6", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading} autoFocus className="wt-btn"
            style={{ flex: 1, height: 42, background: danger ? "#dc4338" : "#0e7a5a", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
