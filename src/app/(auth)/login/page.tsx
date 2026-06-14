"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/actions/auth";

function LighthouseIcon({ size = 20, color = "#eafff4" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 9.5 8 20"/><path d="M14.5 9.5 16 20"/><path d="M7.5 20h9"/>
      <path d="M9 9.5h6"/><path d="M10 9.5V7h4v2.5"/>
      <path d="M12 4.2v1.6"/><path d="M5.4 7.1l2.6 1"/><path d="M18.6 7.1l-2.6 1"/>
      <path d="M9 15h6"/>
    </svg>
  );
}

const FEATURES = [
  { title: "Four-eyes approval", body: "No payment leaves without a second authorised signature." },
  { title: "CAC / NUBAN KYB", body: "Every vendor name-matched against CAC records before payout." },
  { title: "NIP reconciliation", body: "Settlements matched to the kobo; mismatches auto-flagged." },
];

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans), system-ui, sans-serif" }}>

      {/* ── Left panel: dark harbor ── */}
      <div style={{ width: "36%", flexShrink: 0, background: "#0c1d2e", display: "flex", flexDirection: "column", padding: "36px 40px", position: "relative", overflow: "hidden" }}>
        {/* subtle beam glow */}
        <div style={{ position: "absolute", top: -80, left: "50%", transform: "translateX(-50%)", width: 320, height: 320, background: "radial-gradient(ellipse at center, rgba(14,122,90,.28) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, position: "relative" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(160deg,#12936c,#0b5e44)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(11,94,68,.4)" }}>
            <LighthouseIcon size={20} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.02em", color: "#fff" }}>Watchtower</span>
        </div>

        {/* Feature list */}
        <div style={{ marginTop: "auto", marginBottom: "auto", paddingTop: 48, position: "relative" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0e7a5a", marginBottom: 20, letterSpacing: ".02em" }}>
            What Watchtower enforces
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid #0e7a5a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0e7a5a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#e8f5f0" }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: "#6b8fa0", marginTop: 3, lineHeight: 1.5 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "#4a6272", position: "relative" }}>
          Secure payment operations for Nigerian SMEs
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6f8", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Card header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(160deg,#12936c,#0b5e44)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LighthouseIcon size={18} />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em", color: "#0c1d2e" }}>Watchtower</span>
            </div>
            <div style={{ fontSize: 12.5, color: "#8a97a6" }}>Secure payment operations for Nigerian SMEs</div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(12,29,46,.06)" }}>
            {error && (
              <div style={{ marginBottom: 16, padding: "10px 13px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 9, fontSize: 12.5, color: "#b3261e" }}>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 6 }}>Work Email</label>
                <input name="email" type="email" required placeholder="ada@brightpath.ng"
                  style={{ width: "100%", height: 42, border: "1px solid #dce1e6", borderRadius: 9, padding: "0 13px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 6 }}>Password</label>
                <input name="password" type="password" required placeholder="••••••••"
                  style={{ width: "100%", height: 42, border: "1px solid #dce1e6", borderRadius: 9, padding: "0 13px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: "100%", height: 44, background: loading ? "#5aad8e" : "#0e7a5a", color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background .15s" }}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <div style={{ textAlign: "center", marginTop: 18, fontSize: 12.5, color: "#8a97a6" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "#0e7a5a", fontWeight: 600, textDecoration: "none" }}>
              Register your business
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
