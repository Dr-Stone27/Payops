"use client";

import { useState } from "react";
import Link from "next/link";
import { addVendor } from "@/actions/vendors";

const BANKS = [
  "Access Bank", "First Bank", "GT Bank", "UBA", "Zenith Bank",
  "Stanbic IBTC", "Fidelity Bank", "Union Bank", "Sterling Bank", "Wema Bank",
];

const INPUT: React.CSSProperties = { width: "100%", height: 42, border: "1px solid #dce1e6", borderRadius: 9, padding: "0 13px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#0c1d2e" };
const LABEL: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 6 };

export default function NewVendorPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await addVendor(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 520, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <Link href="/vendors" style={{ fontSize: 12.5, color: "#8a97a6", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Vendors
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "10px 0 4px", letterSpacing: "-.02em", color: "#0c1d2e" }}>Add vendor</h1>
        <p style={{ fontSize: 13, color: "#6b7785", margin: 0 }}>
          CAC registration and NUBAN account name are verified automatically.
        </p>
      </div>

      <div style={{ marginBottom: 14, padding: "11px 14px", background: "#e6f0fd", border: "1px solid #b5d0f8", borderRadius: 10, fontSize: 12, color: "#1d5da4" }}>
        <strong>Demo:</strong> NUBAN ending in <strong>1234</strong> → approved · <strong>5678</strong> → needs review · <strong>9999</strong> → mismatch
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: 28, boxShadow: "0 1px 4px rgba(12,29,46,.06)" }}>
        {error && (
          <div style={{ marginBottom: 16, padding: "10px 13px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 9, fontSize: 12.5, color: "#b3261e" }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ paddingBottom: 18, marginBottom: 18, borderBottom: "1px solid #f1f3f5" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#8a97a6", marginBottom: 14 }}>Identity</div>
            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>
                Legal Business Name
                <span style={{ fontSize: 11, fontWeight: 400, color: "#9aa6b2", marginLeft: 6 }}>as registered with CAC</span>
              </label>
              <input name="legalName" required placeholder="Apex Freight Solutions Ltd" style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>CAC Registration Number</label>
              <input name="cacNumber" required placeholder="RC-2345678" style={{ ...INPUT, fontFamily: "var(--font-mono)" }} />
            </div>
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#8a97a6", marginBottom: 14 }}>Bank account</div>
            <div style={{ marginBottom: 14 }}>
              <label style={LABEL}>Bank Name</label>
              <select name="bankName" required style={{ ...INPUT, appearance: "none" }}>
                <option value="">Select bank</option>
                {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>NUBAN Account Number</label>
              <input name="nuban" required maxLength={10} pattern="\d{10}" placeholder="0123451234"
                style={{ ...INPUT, fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }} />
              <div style={{ fontSize: 11.5, color: "#9aa6b2", marginTop: 5 }}>10-digit NUBAN — last 4 digits visible in the system</div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: "100%", height: 44, background: loading ? "#5aad8e" : "#0e7a5a", color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.8 : 1 }}>
            {loading ? "Verifying with CAC & NUBAN APIs…" : "Add vendor"}
          </button>
        </form>
      </div>
    </div>
  );
}
