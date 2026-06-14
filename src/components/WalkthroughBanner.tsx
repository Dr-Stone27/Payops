"use client";

import { useWalkthrough } from "@/context/WalkthroughContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function WalkthroughBanner() {
  const { activeStep, dismissStep, completeWalkthrough, isComplete, hasTeamMember, role } = useWalkthrough();
  const pathname = usePathname();

  // W-5 completion modal — show on /dashboard after first payment, for owner role
  if (activeStep?.type === "modal") {
    return (
      <div style={{
        position: "fixed", inset: 0, background: "rgba(12,29,46,.55)", zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <div className="wt-pop" style={{
          background: "#fff", borderRadius: 18, padding: 36, maxWidth: 440, width: "100%",
          boxShadow: "0 24px 64px rgba(12,29,46,.24)",
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(160deg,#12936c,#0b5e44)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eafff4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, color: "#0c1d2e", letterSpacing: "-.02em", marginBottom: 12 }}>{activeStep.title}</div>
          <p style={{ fontSize: 13.5, color: "#6b7785", lineHeight: 1.65, margin: "0 0 24px" }}>{activeStep.body}</p>
          <button onClick={completeWalkthrough}
            style={{ width: "100%", height: 46, background: "#0e7a5a", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {activeStep.cta ?? "Done"}
          </button>
        </div>
      </div>
    );
  }

  // No-team-member persistent warning — only for Owner, only on dashboard, only when skipped W-2
  const showNoTeamWarning =
    role === "owner" && pathname === "/dashboard" && !hasTeamMember && !activeStep;

  if (showNoTeamWarning) {
    return (
      <div style={{ margin: "0 36px", marginTop: 16 }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "#fcf7e6", border: "1px solid #e8d28a",
          borderRadius: 11, gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4a41a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
            <span style={{ fontSize: 12.5, color: "#8a6510" }}>
              You haven&apos;t added an approver yet. Payments you create cannot be approved until you do.
            </span>
          </div>
          <Link href="/team/new" style={{ fontSize: 12, fontWeight: 600, color: "#8a6510", textDecoration: "none", background: "rgba(139,101,16,.12)", borderRadius: 7, padding: "5px 11px", whiteSpace: "nowrap" }}>
            Invite now
          </Link>
        </div>
      </div>
    );
  }

  if (!activeStep) return null;

  return (
    <div style={{ margin: "0 36px", marginTop: 16 }}>
      <div style={{
        background: "#e6faf4", border: "1px solid #a8dfc9", borderRadius: 13,
        padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 16,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(160deg,#12936c,#0b5e44)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eafff4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 9.5 8 20"/><path d="M14.5 9.5 16 20"/><path d="M7.5 20h9"/>
            <path d="M9 9.5h6"/><path d="M10 9.5V7h4v2.5"/>
            <path d="M12 4.2v1.6"/><path d="M5.4 7.1l2.6 1"/><path d="M18.6 7.1l-2.6 1"/>
            <path d="M9 15h6"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0c1d2e", marginBottom: 5 }}>{activeStep.title}</div>
          <p style={{ fontSize: 13, color: "#2a5e47", lineHeight: 1.6, margin: "0 0 14px" }}>{activeStep.body}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {activeStep.cta && activeStep.ctaHref && (
              <Link href={activeStep.ctaHref}
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "#0e7a5a", borderRadius: 8, padding: "7px 14px", textDecoration: "none" }}>
                {activeStep.cta}
              </Link>
            )}
            {activeStep.skipLabel && (
              <button onClick={() => dismissStep(activeStep.key)}
                style={{ fontSize: 12.5, fontWeight: 500, color: "#2a8a68", background: "none", border: "none", cursor: "pointer", padding: "7px 4px", fontFamily: "inherit" }}>
                {activeStep.skipLabel}
              </button>
            )}
          </div>
        </div>
        <button onClick={() => dismissStep(activeStep.key)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#5a9e84", padding: 4, flexShrink: 0, marginTop: -2 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}
