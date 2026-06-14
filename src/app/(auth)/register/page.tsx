"use client";

import { useState } from "react";
import Link from "next/link";
import { register } from "@/actions/auth";

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

const INPUT = { width: "100%", height: 42, border: "1px solid #dce1e6", borderRadius: 9, padding: "0 13px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" as const };
const LABEL = { display: "block", fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 6 } as const;

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await register(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f6f8", padding: "40px 24px", fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(160deg,#12936c,#0b5e44)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LighthouseIcon />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.02em", color: "#0c1d2e" }}>Watchtower</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0c1d2e", margin: "0 0 4px", letterSpacing: "-.02em" }}>Register your business</h1>
          <div style={{ fontSize: 12.5, color: "#8a97a6" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#0e7a5a", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 14, padding: 28, boxShadow: "0 1px 4px rgba(12,29,46,.06)" }}>
          {error && (
            <div style={{ marginBottom: 16, padding: "10px 13px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 9, fontSize: 12.5, color: "#b3261e" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid #f1f3f5" }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#8a97a6", marginBottom: 14 }}>Your details</div>
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL}>Full Name</label>
                <input name="fullName" required placeholder="Ada Okonkwo" style={INPUT} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL}>Work Email</label>
                <input name="email" type="email" required placeholder="ada@company.com" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>Password</label>
                <input name="password" type="password" required placeholder="Min. 8 characters" style={INPUT} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: "#8a97a6", marginBottom: 14 }}>Business details</div>
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL}>Business Name</label>
                <input name="businessName" required placeholder="Zenith Logistics Ltd" style={INPUT} />
              </div>
              <div>
                <label style={LABEL}>CAC Registration Number</label>
                <input name="cacNumber" required placeholder="RC-1234567" style={{ ...INPUT, fontFamily: "var(--font-mono)" }} />
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: "100%", height: 44, background: loading ? "#5aad8e" : "#0e7a5a", color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.8 : 1 }}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
