import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/compliance";
import { avatarColor, getInitials } from "@/lib/design";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TRIGGER_LABEL: Record<string, string> = {
  HIGH_VALUE: "High-value (≥ ₦5M)",
  DUPLICATE_INVOICE: "Duplicate invoice",
  BENEFICIARY_CHANGE: "Beneficiary change",
  REPEATED_FAILURE: "Repeated PSP failures",
  AMBIGUOUS_MATCH: "Ambiguous KYB match",
};

const TRIGGER_MAKER_MSG: Record<string, string> = {
  HIGH_VALUE: "Payments above ₦5,000,000 require a compliance check before approval. An admin will review and clear it.",
  DUPLICATE_INVOICE: "This invoice number is already linked to an existing payment request. We've flagged this to prevent a duplicate payment. An admin will review both requests.",
  BENEFICIARY_CHANGE: "This vendor's bank account number was updated recently. As a precaution, this payment requires review before it can be approved.",
  REPEATED_FAILURE: "This vendor has had multiple failed payments recently. This payment requires review before proceeding.",
  AMBIGUOUS_MATCH: "This vendor was manually approved with a partial name match. Payments to manually approved vendors go through an extra review step.",
};

export default async function CompliancePage() {
  const session = await getSession();
  if (!session) return null;

  const queue = await prisma.paymentRequest.findMany({
    where: { businessId: session.businessId, status: "compliance_review" },
    include: { vendor: true, maker: { select: { fullName: true, id: true } } },
    orderBy: { createdAt: "asc" },
  });

  const isChecker = ["owner", "admin"].includes(session.role);

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>Compliance Queue</h1>
        <p style={{ fontSize: 13.5, color: "#6b7785", margin: "4px 0 0" }}>
          {isChecker
            ? "Payments flagged for review before reaching the approval queue. Must be cleared by a Checker who did not create the request."
            : "Payments you submitted that are being reviewed before they reach an approver."}
        </p>
      </div>

      {queue.length === 0 ? (
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: "52px 24px", textAlign: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#e6faf4", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0e7a5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#3f4d5a" }}>Compliance queue is clear</div>
          <div style={{ fontSize: 12.5, color: "#98a3b0", margin: "6px auto 0", maxWidth: 400, lineHeight: 1.55 }}>
            Payments ≥ ₦5M, duplicate invoices, ambiguous KYB matches, or beneficiary changes appear here for review before reaching a Checker.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {queue.map(p => {
            const av = avatarColor(p.vendor.legalName);
            const ini = getInitials(p.vendor.legalName);
            const isMaker = p.maker.id === session.userId;
            const triggerMsg = TRIGGER_MAKER_MSG[p.complianceTrigger ?? ""] ?? "This payment has been flagged for manual review.";

            return (
              <div key={p.id} style={{ background: "#fff", border: "1px solid #f6cdb0", borderRadius: 13, padding: "18px 20px", boxShadow: "0 0 0 3px rgba(224,114,53,.06)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: av.bg, color: av.fg, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0c1d2e" }}>{p.vendor.legalName}</div>
                      <div style={{ fontSize: 12, color: "#8a97a6", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                        {p.invoiceNumber} · {p.maker.fullName}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#0c1d2e", letterSpacing: "-.01em" }}>{formatNaira(p.amount)}</div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 5, fontSize: 11.5, fontWeight: 600, padding: "3px 9px 3px 7px", borderRadius: 999, background: "#fdeee2", color: "#9a4513" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#e07235", flexShrink: 0 }} />
                      {TRIGGER_LABEL[p.complianceTrigger ?? ""] ?? p.complianceTrigger}
                    </span>
                  </div>
                </div>

                {/* Context message for the Maker */}
                {isMaker && (
                  <div style={{ fontSize: 12.5, color: "#8a4010", background: "#fef6ee", border: "1px solid #f6cdb0", borderRadius: 9, padding: "9px 13px", marginBottom: 12, lineHeight: 1.5 }}>
                    {triggerMsg}
                  </div>
                )}

                {isChecker && !isMaker ? (
                  <Link href={`/payments/${p.id}`}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, height: 40, borderRadius: 9, background: "#e07235", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                    Review this payment
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </Link>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e07235", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "#9a4513" }}>
                      {isMaker ? "Awaiting Checker review — you cannot action your own request." : "Awaiting admin review."}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
