import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/compliance";
import { avatarColor, getInitials } from "@/lib/design";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, { label: string; desc: string }> = {
  PSP_FAILURE: { label: "PSP Failure", desc: "PSP returned a failure status. Retry or cancel." },
  AMOUNT_MISMATCH: { label: "Amount Mismatch", desc: "Settled amount differs from invoice outside NIP tolerance." },
  STATUS_UNKNOWN: { label: "Status Unknown", desc: "No settlement webhook received in 48 hours." },
  PARTIAL_TRANCHE_SETTLEMENT: { label: "Partial Tranche", desc: "Tranche sequence interrupted." },
  COMPLIANCE_REVIEW_TIMEOUT: { label: "Compliance Timeout", desc: "Compliance review not actioned within 48 hours." },
  ORPHANED_SETTLEMENT: { label: "Orphaned Settlement", desc: "Settlement arrived after request was cancelled." },
};

export default async function ExceptionsPage() {
  const session = await getSession();
  if (!session) return null;

  const exceptions = await prisma.paymentRequest.findMany({
    where: { businessId: session.businessId, status: "exception_queue" },
    include: { vendor: true, maker: { select: { fullName: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>Exception Queue</h1>
        <p style={{ fontSize: 13.5, color: "#6b7785", margin: "4px 0 0" }}>
          Failed, mismatched, or timed-out payments requiring manual review.
        </p>
      </div>

      {exceptions.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: "52px 24px", textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e6faf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0e7a5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#3f4d5a" }}>No exceptions</div>
          <div style={{ fontSize: 12.5, color: "#98a3b0", margin: "6px auto 0", maxWidth: 380, lineHeight: 1.5 }}>
            PSP failures, amount mismatches outside NIP tolerance, and timed-out settlements appear here for manual review.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {exceptions.map(p => {
            const cat = CATEGORY_LABEL[p.exceptionCategory ?? ""] ?? { label: p.exceptionCategory ?? "Unknown", desc: "" };
            const av = avatarColor(p.vendor.legalName);
            const ini = getInitials(p.vendor.legalName);
            return (
              <div key={p.id} style={{ background: "#fff", border: "1px solid #f1c5c1", borderRadius: 13, padding: "18px 20px", boxShadow: "0 0 0 3px rgba(220,67,56,.05)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: av.bg, color: av.fg, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini}</div>
                    <div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "2px 8px 2px 7px", borderRadius: 999, background: "#fdeceb", color: "#b3261e", marginBottom: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc4338", flexShrink: 0 }} />
                        {cat.label}
                      </span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0c1d2e" }}>{p.vendor.legalName}</div>
                      <div style={{ fontSize: 12, color: "#8a97a6", marginTop: 2, fontFamily: "var(--font-mono)" }}>{p.invoiceNumber}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#0c1d2e", letterSpacing: "-.01em", flexShrink: 0 }}>{formatNaira(p.amount)}</div>
                </div>
                <div style={{ fontSize: 12.5, color: "#b3261e", marginBottom: 12 }}>{cat.desc}</div>
                {p.settledAmount != null && p.settledAmount !== p.amount && (
                  <div style={{ fontSize: 12, color: "#6b7785", padding: "8px 12px", background: "#f5f6f8", borderRadius: 8, marginBottom: 12 }}>
                    Settled: {formatNaira(p.settledAmount)} vs Invoice: {formatNaira(p.amount)} · Variance: {formatNaira(Math.abs(p.settledAmount - p.amount))}
                  </div>
                )}
                <Link href={`/payments/${p.id}`}
                  style={{ fontSize: 12.5, fontWeight: 600, color: "#b3261e", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  View payment details
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
