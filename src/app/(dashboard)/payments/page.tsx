import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/compliance";
import { STATUS_BADGE, avatarColor, getInitials } from "@/lib/design";
import Link from "next/link";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard, ListFilter } from "lucide-react";

export const dynamic = "force-dynamic";

const ALL_STATUSES = [
  { key: "all", label: "All" },
  { key: "pending_approval", label: "Pending" },
  { key: "compliance_review", label: "Compliance" },
  { key: "processing", label: "Processing" },
  { key: "reconciled", label: "Reconciled" },
  { key: "exception_queue", label: "Exception" },
  { key: "cancelled", label: "Cancelled" },
];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) return null;

  const { status: filterStatus } = await searchParams;
  const activeFilter = filterStatus && filterStatus !== "all" ? filterStatus : undefined;

  const [payments, approvedVendorCount] = await Promise.all([
    prisma.paymentRequest.findMany({
      where: {
        businessId: session.businessId,
        ...(activeFilter ? { status: activeFilter } : {}),
      },
      include: { vendor: true, maker: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.vendor.count({
      where: { businessId: session.businessId, kybStatus: "approved" },
    }),
  ]);

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>Payments</h1>
          <p style={{ fontSize: 13.5, color: "#6b7785", margin: "4px 0 0" }}>All payment requests across states</p>
        </div>
        <Link href="/payments/new" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 9, background: "#0e7a5a", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          New payment
        </Link>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {ALL_STATUSES.map((s) => {
          const isActive = (!filterStatus || filterStatus === "all") ? s.key === "all" : filterStatus === s.key;
          return (
            <Link key={s.key} href={`/payments?status=${s.key}`}
              style={{ padding: "5px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, textDecoration: "none",
                background: isActive ? "#0c1d2e" : "#fff",
                color: isActive ? "#fff" : "#6b7785",
                border: isActive ? "1px solid #0c1d2e" : "1px solid #e8eaed" }}>
              {s.label}
            </Link>
          );
        })}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, overflow: "hidden" }}>
        {payments.length === 0 ? (
          activeFilter ? (
            <EmptyState
              icon={ListFilter}
              title="No payments in this state"
              body="Nothing is resting here right now. Switch to another filter, or view all payments."
              ctaLabel="View all payments"
              ctaHref="/payments"
            />
          ) : (
            <EmptyState
              icon={CreditCard}
              title="No payments yet"
              body={approvedVendorCount > 0
                ? "You have a verified vendor — raise your first invoice-backed payment request and send it for approval."
                : "Add and verify at least one vendor before submitting a payment request."}
              ctaLabel={approvedVendorCount > 0 ? "Create first payment" : "Add first vendor"}
              ctaHref={approvedVendorCount > 0 ? "/payments/new" : "/vendors/new"}
            />
          )
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eef0f3" }}>
                {["Vendor", "Invoice", "Amount", "Maker", "Status", "Date"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 2 ? "right" : "left", fontSize: 11, fontWeight: 500, color: "#8a97a6", padding: i === 0 ? "9px 19px" : i === 5 ? "9px 19px 9px 12px" : "9px 12px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.cancelled;
                const av = avatarColor(p.vendor.legalName);
                const ini = getInitials(p.vendor.legalName);
                const makerAv = avatarColor(p.maker.fullName);
                const makerIni = getInitials(p.maker.fullName);
                return (
                  <ClickableRow key={p.id} href={`/payments/${p.id}`}>
                    <td style={{ padding: "11px 19px" }}>
                      <Link href={`/payments/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: av.bg, color: av.fg, fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0c1d2e" }}>{p.vendor.legalName}</span>
                      </Link>
                    </td>
                    <td style={{ padding: "11px 12px", fontSize: 12.5, color: "#6b7785", fontFamily: "var(--font-mono)" }}>{p.invoiceNumber}</td>
                    <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 600, color: "#0c1d2e", textAlign: "right" }}>{formatNaira(p.amount)}</td>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 22, height: 22, borderRadius: 6, background: makerAv.bg, color: makerAv.fg, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{makerIni}</div>
                        <span style={{ fontSize: 12, color: "#6b7785" }}>{p.maker.fullName}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, padding: "3px 10px 3px 8px", borderRadius: 999, background: badge.bg, color: badge.fg }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot, flexShrink: 0 }} />
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: "11px 19px 11px 12px", fontSize: 12.5, color: "#6b7785" }}>
                      {new Date(p.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                    </td>
                  </ClickableRow>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
