import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/compliance";
import { avatarColor, getInitials } from "@/lib/design";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORY: Record<string, { label: string; desc: string; actions: string[] }> = {
  PSP_FAILURE: {
    label: "PSP Failure",
    desc: "The payment could not be processed. The transfer was not sent. No funds have left your account.",
    actions: ["retry", "cancel"],
  },
  AMOUNT_MISMATCH: {
    label: "Amount Mismatch",
    desc: "The amount that arrived differs from the invoice amount by more than the expected bank fee. Manual review is needed.",
    actions: ["acknowledge", "cancel"],
  },
  STATUS_UNKNOWN: {
    label: "Status Unknown",
    desc: "No settlement confirmation received in 48 hours. The payment may be in transit or delayed at the bank. Contact your PSP for a status update.",
    actions: ["cancel"],
  },
  PARTIAL_TRANCHE_SETTLEMENT: {
    label: "Partial Tranche",
    desc: "One or more tranches settled successfully but the sequence was interrupted. The vendor has received a partial amount.",
    actions: ["cancel"],
  },
  COMPLIANCE_REVIEW_TIMEOUT: {
    label: "Compliance Timeout",
    desc: "The compliance review was not completed within 48 hours. The request has been paused.",
    actions: ["cancel"],
  },
  ORPHANED_SETTLEMENT: {
    label: "Orphaned Settlement",
    desc: "A settlement confirmation arrived for a payment that was already cancelled. This requires manual review.",
    actions: ["acknowledge"],
  },
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
          Failed, mismatched, or timed-out payments requiring attention. Nothing here is lost — every item has a full audit trail.
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
          <div style={{ fontSize: 12.5, color: "#98a3b0", margin: "6px auto 0", maxWidth: 400, lineHeight: 1.55 }}>
            Payments that fail, time out, or need attention will appear here with plain-language guidance on what to do next.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {exceptions.map(p => {
            const cat = CATEGORY[p.exceptionCategory ?? ""] ?? {
              label: p.exceptionCategory ?? "Unknown",
              desc: "This payment needs manual review.",
              actions: ["cancel"],
            };
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
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#0c1d2e", letterSpacing: "-.01em" }}>{formatNaira(p.amount)}</div>
                    <div style={{ fontSize: 11.5, color: "#8a97a6", marginTop: 3 }}>{p.maker.fullName}</div>
                  </div>
                </div>

                <div style={{ fontSize: 12.5, color: "#b3261e", lineHeight: 1.55, marginBottom: 12 }}>{cat.desc}</div>

                {p.settledAmount != null && p.settledAmount !== p.amount && (
                  <div style={{ fontSize: 12, color: "#6b7785", padding: "8px 12px", background: "#f5f6f8", borderRadius: 8, marginBottom: 12, fontFamily: "var(--font-mono)" }}>
                    Settled {formatNaira(p.settledAmount)} · Invoice {formatNaira(p.amount)} · Variance {formatNaira(Math.abs(p.settledAmount - p.amount))}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Link href={`/payments/${p.id}`}
                    style={{ height: 36, padding: "0 14px", border: "1px solid #f1c5c1", borderRadius: 8, background: "#fff", color: "#b3261e", fontSize: 12.5, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    View details
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                  {cat.actions.includes("retry") && (
                    <Link href={`/payments/${p.id}`}
                      style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 8, background: "#fdeceb", color: "#b3261e", fontSize: 12.5, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                      Retry payment
                    </Link>
                  )}
                  {cat.actions.includes("acknowledge") && (
                    <span style={{ height: 36, padding: "0 14px", border: "1px solid #e8eaed", borderRadius: 8, background: "#f5f6f8", color: "#6b7785", fontSize: 12.5, fontWeight: 500, display: "inline-flex", alignItems: "center" }}>
                      Acknowledge
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
