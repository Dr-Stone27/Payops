"use client";

import { useState } from "react";
import { setupPin } from "@/actions/auth";
import { COMMON_PINS } from "@/lib/walkthrough";

function LighthouseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eafff4" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 9.5 8 20"/><path d="M14.5 9.5 16 20"/><path d="M7.5 20h9"/>
      <path d="M9 9.5h6"/><path d="M10 9.5V7h4v2.5"/>
      <path d="M12 4.2v1.6"/><path d="M5.4 7.1l2.6 1"/><path d="M18.6 7.1l-2.6 1"/>
      <path d="M9 15h6"/>
    </svg>
  );
}

export default function SetupPinPage() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateClient(): string | null {
    if (pin.length !== 4) return "PIN must be exactly 4 digits.";
    if (COMMON_PINS.has(pin)) return "That PIN is too easy to guess. Choose something less predictable.";
    if (pin !== confirmPin) return "Those PINs don't match. Try again.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const clientError = validateClient();
    if (clientError) { setError(clientError); return; }
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const result = await setupPin(fd);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 52, border: "1px solid #dce1e6", borderRadius: 10,
    fontSize: 22, textAlign: "center", letterSpacing: "0.4em",
    fontFamily: "var(--font-mono)", boxSizing: "border-box", background: "#fff",
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6f8", padding: 24, fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(160deg,#12936c,#0b5e44)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LighthouseIcon />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em", color: "#0c1d2e" }}>Watchtower</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0c1d2e", margin: "0 0 8px", letterSpacing: "-.02em" }}>Set your approval PIN</h1>
          <p style={{ fontSize: 12.5, color: "#8a97a6", margin: 0, lineHeight: 1.6, maxWidth: 280, marginInline: "auto" }}>
            Your PIN is your authorisation signature. Every payment you approve is recorded with your PIN confirmation — it&apos;s your name on the decision. Keep it private.
          </p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(12,29,46,.06)" }}>
          {error && (
            <div style={{ marginBottom: 16, padding: "10px 13px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 9, fontSize: 12.5, color: "#b3261e" }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 8 }}>New PIN</label>
              <input name="pin" type="password" inputMode="numeric" maxLength={4} required placeholder="• • • •"
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={inputStyle} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 8 }}>Confirm PIN</label>
              <input name="confirmPin" type="password" inputMode="numeric" maxLength={4} required placeholder="• • • •"
                value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={inputStyle} />
            </div>
            <div style={{ fontSize: 11.5, color: "#9aa6b2", marginBottom: 20, lineHeight: 1.5 }}>
              Avoid obvious sequences like 1234, 0000, or repeating digits.
            </div>
            <button type="submit" disabled={loading}
              style={{ width: "100%", height: 44, background: "#0e7a5a", color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Setting PIN…" : "Set PIN"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
