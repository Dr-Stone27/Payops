"use client";

import { useState } from "react";
import Link from "next/link";
import { inviteTeamMember } from "@/actions/auth";

const INPUT: React.CSSProperties = { width: "100%", height: 42, border: "1px solid #dce1e6", borderRadius: 9, padding: "0 13px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#0c1d2e" };
const LABEL: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 6 };

export default function NewTeamMemberPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await inviteTeamMember(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <Link href="/team" style={{ fontSize: 12.5, color: "#8a97a6", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Team
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "10px 0 4px", letterSpacing: "-.02em", color: "#0c1d2e" }}>Add team member</h1>
        <p style={{ fontSize: 13, color: "#6b7785", margin: 0 }}>New members can log in immediately with these credentials.</p>
      </div>

      <div style={{ marginBottom: 14, padding: "11px 14px", background: "#e6f0fd", border: "1px solid #b5d0f8", borderRadius: 10, fontSize: 12, color: "#1d5da4" }}>
        <strong>Demo tip:</strong> Add a <strong>Maker</strong> to demonstrate the four-eyes rule — they submit payment requests, and a Checker approves them. The same person cannot do both.
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: 28, boxShadow: "0 1px 4px rgba(12,29,46,.06)" }}>
        {error && (
          <div style={{ marginBottom: 16, padding: "10px 13px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 9, fontSize: 12.5, color: "#b3261e" }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Full Name</label>
            <input name="fullName" required placeholder="Amaka Osei" style={INPUT} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Work Email</label>
            <input name="email" type="email" required placeholder="amaka@company.com" style={INPUT} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={LABEL}>Temporary Password</label>
            <input name="password" type="password" required minLength={8} placeholder="Min. 8 characters" style={INPUT} />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={LABEL}>Role</label>
            <select name="role" required style={{ ...INPUT, appearance: "none" }}>
              <option value="">Select role</option>
              <option value="maker">Maker — creates payment requests, cannot approve</option>
              <option value="admin">Admin (Checker) — approves requests, cannot create own</option>
            </select>
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11.5, color: "#9aa6b2", lineHeight: 1.5 }}>
                Checkers are Admin and Owner roles. Makers can only create, not approve.
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: "100%", height: 44, background: loading ? "#5aad8e" : "#0e7a5a", color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.8 : 1 }}>
            {loading ? "Adding member…" : "Add team member"}
          </button>
        </form>
      </div>
    </div>
  );
}
