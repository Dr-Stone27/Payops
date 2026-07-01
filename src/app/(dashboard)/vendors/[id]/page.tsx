"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { approveVendor } from "@/actions/vendors";
import { kybColor, avatarColor, getInitials, KYB_BADGE } from "@/lib/design";

interface Vendor {
  id: string; legalName: string; cacNumber: string; nubanLast4: string;
  bankName: string; cacRegisteredName: string; nubanAccountName: string;
  kybStatus: string; jaroWinklerScore: number | null;
  manualApprovalJustification: string | null; manuallyApprovedAt: string | null;
}

function FactRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f3f5" }}>
      <div style={{ fontSize: 12, color: "#8a97a6", width: 160, flexShrink: 0, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#0c1d2e", fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</div>
    </div>
  );
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/vendors/${id}`).then(r => r.json()).then(d => {
      if (!d?.id) { setNotFound(true); return; }
      setVendor(d);
    }).catch(() => setNotFound(true));
  }, [id]);

  async function handleApprove() {
    setLoading(true);
    setError("");
    const result = await approveVendor(id, justification);
    if (result?.error) { setError(result.error); setLoading(false); }
    else router.push("/vendors");
  }

  if (notFound) return (
    <div style={{ padding: "60px 36px", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#3f4d5a", marginBottom: 6 }}>Vendor not found</div>
      <div style={{ fontSize: 12.5, color: "#98a3b0", marginBottom: 18 }}>It may have been removed, or the link is incorrect.</div>
      <Link href="/vendors" style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", background: "#0e7a5a", borderRadius: 9, padding: "9px 16px", textDecoration: "none", display: "inline-block" }}>
        Back to vendors
      </Link>
    </div>
  );

  if (!vendor) return (
    <div style={{ padding: 36, display: "flex", alignItems: "center", gap: 10, color: "#8a97a6", fontSize: 13 }}>
      <span className="wt-spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #dce1e6", borderTopColor: "#0e7a5a", borderRadius: "50%" }} />
      Loading…
    </div>
  );

  const score = vendor.jaroWinklerScore;
  const barPct = score != null ? Math.round(score * 100) : 0;
  const barColor = kybColor(score);
  const badge = KYB_BADGE[vendor.kybStatus] ?? KYB_BADGE.verification_pending;
  const av = avatarColor(vendor.legalName);
  const ini = getInitials(vendor.legalName);

  const scoreLabel = score == null ? null
    : score >= 0.85 ? "Strong match — auto-approved"
    : score >= 0.70 ? "Partial match — requires manual review"
    : "Weak match — Checker must review carefully";

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/vendors" style={{ fontSize: 12.5, color: "#8a97a6", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Vendors
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: av.bg, color: av.fg, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini}</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>{vendor.legalName}</h1>
              <p style={{ fontSize: 12.5, color: "#6b7785", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>{vendor.cacNumber}</p>
            </div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "5px 12px 5px 10px", borderRadius: 999, background: badge.bg, color: badge.fg }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: badge.dot, flexShrink: 0 }} />
            {badge.label}
          </span>
        </div>
      </div>

      {/* Identity details */}
      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: "6px 20px 4px", marginBottom: 14 }}>
        <FactRow label="CAC registered name" value={vendor.cacRegisteredName} />
        <FactRow label="NUBAN account name" value={vendor.nubanAccountName} />
        <FactRow label="Bank" value={vendor.bankName} />
        <FactRow label="Account" value={`••••••${vendor.nubanLast4}`} mono />
      </div>

      {/* KYB score */}
      {score != null && (
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: "16px 20px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#0c1d2e" }}>Jaro-Winkler match score</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: barColor, fontFamily: "var(--font-mono)" }}>{barPct}%</div>
          </div>
          <div style={{ height: 7, borderRadius: 999, background: "#eef0f3", overflow: "hidden", marginBottom: 10 }}>
            <div style={{ width: `${barPct}%`, height: "100%", background: barColor, borderRadius: 999, transition: "width .4s" }} />
          </div>
          <div style={{ fontSize: 12, color: "#6b7785" }}>{scoreLabel}</div>
          <div style={{ display: "flex", gap: 18, marginTop: 12, fontSize: 11 }}>
            {[{ label: "< 70% Weak", color: "#dc4338" }, { label: "70–84% Partial", color: "#d4a41a" }, { label: "≥ 85% Strong", color: "#0e7a5a" }].map(t => (
              <div key={t.label} style={{ display: "flex", alignItems: "center", gap: 5, color: "#8a97a6" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                {t.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual approval */}
      {vendor.kybStatus === "needs_review" && (
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: "20px 22px", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0c1d2e", marginBottom: 6 }}>Manual approval</div>
          <div style={{ fontSize: 12.5, color: "#6b7785", marginBottom: 16 }}>
            Provide a written justification before approving. This is stored permanently on the vendor record.
          </div>
          {error && <div style={{ marginBottom: 14, padding: "9px 12px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 8, fontSize: 12.5, color: "#b3261e" }}>{error}</div>}
          <textarea value={justification} onChange={e => setJustification(e.target.value)} rows={3}
            placeholder="e.g. CAC name and NUBAN name differ by legal suffix only (LTD vs LIMITED). Verified with the vendor directly and confirmed same entity. Director ID cross-checked."
            style={{ width: "100%", border: "1px solid #dce1e6", borderRadius: 9, padding: "10px 13px", fontSize: 13, fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
          <div style={{ fontSize: 11.5, color: justification.length < 20 ? "#dc4338" : "#9aa6b2", marginTop: 5 }}>
            {justification.length}/20 characters minimum
          </div>
          <button onClick={handleApprove} disabled={loading || justification.trim().length < 20}
            style={{ marginTop: 14, width: "100%", height: 44, background: "#0e7a5a", color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: (loading || justification.trim().length < 20) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (loading || justification.trim().length < 20) ? 0.5 : 1 }}>
            {loading ? "Approving…" : "Approve vendor"}
          </button>
        </div>
      )}

      {vendor.kybStatus === "approved" && vendor.manualApprovalJustification && (
        <div style={{ background: "#e6faf4", border: "1px solid #a8dfc9", borderRadius: 13, padding: "14px 18px" }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "#1a6b52", marginBottom: 6 }}>Manual approval justification</div>
          <div style={{ fontSize: 13, color: "#1a5c43" }}>{vendor.manualApprovalJustification}</div>
        </div>
      )}
    </div>
  );
}
