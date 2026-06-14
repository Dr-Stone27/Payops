"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { logout } from "@/actions/auth";
import { getInitials, avatarColor, roleLabel, roleFg } from "@/lib/design";
import { useWalkthrough } from "@/context/WalkthroughContext";

const PAGE_MAP: Record<string, { label: string; parent?: string; parentHref?: string }> = {
  "/dashboard":     { label: "Overview" },
  "/payments":      { label: "Payments" },
  "/payments/new":  { label: "New payment",  parent: "Payments", parentHref: "/payments" },
  "/vendors":       { label: "Vendors" },
  "/vendors/new":   { label: "Add vendor",   parent: "Vendors",  parentHref: "/vendors" },
  "/compliance":    { label: "Compliance" },
  "/exceptions":    { label: "Exceptions" },
  "/audit":         { label: "Audit log" },
  "/team":          { label: "Team" },
  "/team/new":      { label: "Add member",   parent: "Team",     parentHref: "/team" },
  "/setup-pin":     { label: "Update PIN" },
};

interface Session {
  fullName: string;
  role: string;
  email: string;
}

export function TopBar({ session }: { session: Session }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isComplete, stepNumber, totalSteps, role } = useWalkthrough();
  const showCounter = !isComplete && role === "owner" && stepNumber <= totalSteps;

  // Resolve breadcrumb — handle dynamic routes like /payments/[id]
  let page = PAGE_MAP[pathname];
  let dynamicLabel = "";
  if (!page) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] === "payments" && segments[1]) {
      page = { label: segments[1].toUpperCase(), parent: "Payments", parentHref: "/payments" };
      dynamicLabel = segments[1].toUpperCase();
    } else if (segments[0] === "vendors" && segments[1]) {
      page = { label: "KYB Review", parent: "Vendors", parentHref: "/vendors" };
    }
  }

  const ini = getInitials(session.fullName);
  const av = avatarColor(session.fullName);
  const rl = roleLabel(session.role);
  const rfg = roleFg(session.role);

  return (
    <header style={{ height: 60, flexShrink: 0, background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid #e8eaed", display: "flex", alignItems: "center", gap: 16, padding: "0 28px", position: "sticky", top: 0, zIndex: 20 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {page?.parent && (
          <>
            <Link href={page.parentHref!} style={{ fontSize: 14, fontWeight: 400, color: "#8a97a6", textDecoration: "none", whiteSpace: "nowrap" }}>
              {page.parent}
            </Link>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c2cbd4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6"/></svg>
          </>
        )}
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0c1d2e", whiteSpace: "nowrap" }}>
          {dynamicLabel || page?.label || ""}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Setup step counter */}
      {showCounter && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 11px", background: "#e6faf4", border: "1px solid #a8dfc9", borderRadius: 999, flexShrink: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0e7a5a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 9.5 8 20"/><path d="M14.5 9.5 16 20"/><path d="M7.5 20h9"/><path d="M9 9.5h6"/><path d="M10 9.5V7h4v2.5"/><path d="M12 4.2v1.6"/><path d="M5.4 7.1l2.6 1"/><path d="M18.6 7.1l-2.6 1"/><path d="M9 15h6"/></svg>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#0e7a5a", whiteSpace: "nowrap" }}>
            Setup: Step {stepNumber} of {totalSteps}
          </span>
        </div>
      )}

      {/* Search */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 36, width: 210, border: "1px solid #e4e7eb", borderRadius: 9, padding: "0 11px", background: "#fbfcfd", color: "#9aa6b2" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <span style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>Search payments…</span>
        <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 600, color: "#aeb8c2", border: "1px solid #e4e7eb", borderRadius: 5, padding: "1px 5px", background: "#fff", fontFamily: "var(--font-mono)" }}>⌘K</span>
      </div>

      {/* Bell */}
      <button style={{ width: 36, height: 36, border: "1px solid #e4e7eb", borderRadius: 9, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5b6b7b" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
      </button>

      <div style={{ width: 1, height: 26, background: "#e8eaed" }} />

      {/* User menu */}
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{ display: "flex", alignItems: "center", gap: 9, border: "1px solid transparent", background: "none", padding: "4px 6px 4px 4px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}
        >
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: av.bg, color: av.fg, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {ini}
          </div>
          <div style={{ textAlign: "left", lineHeight: 1.25, whiteSpace: "nowrap" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0c1d2e" }}>{session.fullName.split(" ")[0]}</div>
            <div style={{ fontSize: 10.5, fontWeight: 600, color: rfg }}>{rl}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9aa6b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {menuOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 30 }} onClick={() => setMenuOpen(false)} />
            <div style={{ position: "absolute", top: 46, right: 0, width: 220, background: "#fff", border: "1px solid #e8eaed", borderRadius: 12, boxShadow: "0 16px 40px rgba(12,29,46,.14)", overflow: "hidden", zIndex: 40 }}>
              <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid #f1f3f5" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#0c1d2e" }}>{session.fullName}</div>
                <div style={{ fontSize: 11, color: "#8a97a6", marginTop: 1 }}>{rl}</div>
              </div>
              <Link
                href="/setup-pin"
                onClick={() => setMenuOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", fontSize: 12.5, color: "#3f4d5a", textDecoration: "none", borderTop: "1px solid #f1f3f5" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7785" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Update approval PIN
              </Link>
              <form action={logout}>
                <button type="submit" style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", border: "none", borderTop: "1px solid #f1f3f5", background: "#fff", padding: "10px 14px", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, color: "#b3261e", textAlign: "left" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b3261e" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>
                  Sign out
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
