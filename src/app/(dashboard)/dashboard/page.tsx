import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/compliance";
import { STATUS_BADGE, avatarColor, getInitials } from "@/lib/design";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CONTROL_EVENT_ACTIONS = [
  "PAYMENT_APPROVED",
  "PAYMENT_REJECTED",
  "COMPLIANCE_CLEARED",
  "COMPLIANCE_BLOCKED",
  "EXCEPTION_ACKNOWLEDGED",
  "VENDOR_ADDED",
  "VENDOR_MANUALLY_APPROVED",
  "PAYMENT_RECONCILED",
  "PSP_FAILURE",
  "RECONCILIATION_FAILED",
];

const EVENT_LABEL: Record<string, { label: string; dot: string }> = {
  PAYMENT_APPROVED:         { label: "Payment approved", dot: "#0e7a5a" },
  PAYMENT_REJECTED:         { label: "Payment rejected", dot: "#dc4338" },
  COMPLIANCE_CLEARED:       { label: "Compliance cleared", dot: "#e07235" },
  COMPLIANCE_BLOCKED:       { label: "Compliance blocked", dot: "#dc4338" },
  EXCEPTION_ACKNOWLEDGED:   { label: "Exception acknowledged", dot: "#0e7a5a" },
  VENDOR_ADDED:             { label: "Vendor KYB checked", dot: "#1d5da4" },
  VENDOR_MANUALLY_APPROVED: { label: "Vendor manually approved", dot: "#0e7a5a" },
  PAYMENT_RECONCILED:       { label: "Payment reconciled", dot: "#0e7a5a" },
  PSP_FAILURE:              { label: "PSP failure", dot: "#dc4338" },
  RECONCILIATION_FAILED:    { label: "Amount mismatch", dot: "#dc4338" },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8a97a6", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10 }}>{children}</div>;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const isChecker = ["owner", "admin"].includes(session.role);
  const biz = { businessId: session.businessId };

  const [complianceItems, exceptionAgg, needsReviewVendors, complianceCount] = await Promise.all([
    prisma.paymentRequest.findMany({
      where: { ...biz, status: "compliance_review" },
      select: { id: true, makerId: true },
    }),
    prisma.paymentRequest.aggregate({
      where: { ...biz, status: "exception_queue", acknowledgedAt: null },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.vendor.count({ where: { ...biz, kybStatus: "needs_review" } }),
    prisma.paymentRequest.count({ where: { ...biz, status: "compliance_review" } }),
  ]);

  // Needs-your-attention list, role-aware
  const attention = isChecker
    ? await prisma.paymentRequest.findMany({
        where: {
          ...biz,
          status: "pending_approval",
          makerId: { not: session.userId },
          OR: [
            { complianceReviewResolvedBy: null },
            { complianceReviewResolvedBy: { not: session.userId } },
          ],
        },
        include: { vendor: { select: { legalName: true } }, maker: { select: { fullName: true } } },
        orderBy: { createdAt: "asc" },
        take: 5,
      })
    : await prisma.paymentRequest.findMany({
        where: { ...biz, makerId: session.userId, status: { in: ["pending_approval", "compliance_review", "processing"] } },
        include: { vendor: { select: { legalName: true } }, maker: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

  const actionableCompliance = isChecker
    ? complianceItems.filter(p => p.makerId !== session.userId).length
    : 0;

  const attentionTotal = isChecker
    ? await prisma.paymentRequest.count({
        where: {
          ...biz,
          status: "pending_approval",
          makerId: { not: session.userId },
          OR: [
            { complianceReviewResolvedBy: null },
            { complianceReviewResolvedBy: { not: session.userId } },
          ],
        },
      })
    : attention.length;

  const events = await prisma.auditLog.findMany({
    where: { ...biz, action: { in: CONTROL_EVENT_ACTIONS } },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const exceptionCount = exceptionAgg._count;
  const exceptionNaira = exceptionAgg._sum.amount ?? 0;

  const riskCards = [
    {
      label: "Open exceptions", value: exceptionCount, sub: exceptionCount > 0 ? `${formatNaira(exceptionNaira)} held up` : "Nothing in the queue",
      href: "/exceptions", urgent: exceptionCount > 0,
    },
    {
      label: "Vendors needing review", value: needsReviewVendors, sub: needsReviewVendors > 0 ? "KYB name match flagged" : "All vendors verified",
      href: "/vendors", urgent: needsReviewVendors > 0,
    },
    {
      label: "In compliance review", value: complianceCount, sub: complianceCount > 0 ? "Awaiting a checker decision" : "Queue clear",
      href: "/compliance", urgent: complianceCount > 0,
    },
  ];

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>
          Good day, {session.fullName.split(" ")[0]}
        </h1>
        <p style={{ fontSize: 13.5, color: "#6b7785", margin: "4px 0 0" }}>
          {isChecker ? "What needs your decision, and what's at risk." : "Your requests, and where they stand."}
        </p>
      </div>

      {/* 1 — Needs your attention */}
      <div style={{ marginBottom: 26 }}>
        <SectionTitle>Needs your attention</SectionTitle>
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, overflow: "hidden" }}>
          {attention.length === 0 && actionableCompliance === 0 ? (
            <div style={{ padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#3f4d5a" }}>Nothing needs you right now</div>
              <div style={{ fontSize: 12.5, color: "#98a3b0", marginTop: 5 }}>
                {isChecker ? "New approval requests and compliance reviews will appear here." : "Requests you raise will appear here with their status."}
              </div>
            </div>
          ) : (
            <>
              {attention.map((p, i) => {
                const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.cancelled;
                const av = avatarColor(p.vendor.legalName);
                return (
                  <Link key={p.id} href={`/payments/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 19px", textDecoration: "none", borderTop: i === 0 ? "none" : "1px solid #f1f3f5" }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: av.bg, color: av.fg, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{getInitials(p.vendor.legalName)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0c1d2e" }}>{p.vendor.legalName}</div>
                      <div style={{ fontSize: 11.5, color: "#8a97a6", marginTop: 1 }}>
                        {isChecker ? <>Raised by {p.maker.fullName} · awaiting your PIN approval</> : <>Raised by you</>}
                      </div>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0c1d2e", flexShrink: 0 }}>{formatNaira(p.amount)}</div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 9px 3px 7px", borderRadius: 999, background: badge.bg, color: badge.fg, flexShrink: 0 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: badge.dot }} />
                      {badge.label}
                    </span>
                  </Link>
                );
              })}
              {attentionTotal > attention.length && (
                <Link href="/payments?status=pending_approval" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 19px", textDecoration: "none", borderTop: "1px solid #f1f3f5" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0e7a5a" }}>
                    View all {attentionTotal} awaiting your approval
                  </span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0e7a5a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              )}
              {actionableCompliance > 0 && (
                <Link href="/compliance" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 19px", textDecoration: "none", borderTop: "1px solid #f1f3f5", background: "#fdf8f3" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#9a4513" }}>
                    {actionableCompliance} compliance review{actionableCompliance > 1 ? "s" : ""} you can action
                  </span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9a4513" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* 2 — At risk */}
      <div style={{ marginBottom: 26 }}>
        <SectionTitle>At risk</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {riskCards.map((c) => (
            <Link key={c.label} href={c.href} style={{ textDecoration: "none" }}>
              <div style={{ background: "#fff", border: c.urgent ? "1px solid #f1c5c1" : "1px solid #e8eaed", borderRadius: 13, padding: "15px 17px", boxShadow: c.urgent ? "0 0 0 3px rgba(220,67,56,.05)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7785" }}>{c.label}</span>
                  {c.urgent && <span style={{ fontSize: 10, fontWeight: 600, color: "#b3261e", background: "#fdeceb", borderRadius: 999, padding: "2px 8px" }}>Attention</span>}
                </div>
                <div className="wt-money" style={{ fontSize: 29, marginTop: 8, color: c.urgent ? "#b3261e" : undefined }}>{c.value}</div>
                <div style={{ fontSize: 11.5, color: "#8a97a6", marginTop: 3 }}>{c.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 3 — Recent control events */}
      <div style={{ marginBottom: 26 }}>
        <SectionTitle>Recent control events</SectionTitle>
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, overflow: "hidden" }}>
          {events.length === 0 ? (
            <div style={{ padding: "28px 24px", textAlign: "center", fontSize: 12.5, color: "#98a3b0" }}>
              Approvals, rejections, blocks, KYB checks, and acknowledgements will appear here.
            </div>
          ) : (
            events.map((e, i) => {
              const meta = EVENT_LABEL[e.action] ?? { label: e.action.replace(/_/g, " "), dot: "#9aa6b2" };
              return (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 19px", borderTop: i === 0 ? "none" : "1px solid #f1f3f5" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: meta.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0c1d2e", width: 190, flexShrink: 0 }}>{meta.label}</span>
                  <span style={{ flex: 1, fontSize: 12, color: "#6b7785", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {e.user?.fullName ?? "System"}{e.detail ? ` — ${e.detail}` : ""}
                  </span>
                  <span style={{ fontSize: 11.5, color: "#98a3b0", flexShrink: 0 }}>
                    {new Date(e.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              );
            })
          )}
          <Link href="/audit" style={{ display: "block", padding: "10px 19px", borderTop: "1px solid #f1f3f5", fontSize: 12.5, fontWeight: 600, color: "#0e7a5a", textDecoration: "none" }}>
            Full audit log →
          </Link>
        </div>
      </div>

      {/* Demoted: historical list lives at /payments */}
      <Link href="/payments" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: "13px 19px", textDecoration: "none" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#0c1d2e" }}>All payments</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0e7a5a", display: "flex", alignItems: "center", gap: 4 }}>
          View history
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </span>
      </Link>
    </div>
  );
}
