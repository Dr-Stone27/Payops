import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/compliance";
import { STATUS_BADGE, avatarColor, getInitials } from "@/lib/design";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [totalPayments, approvedVendors, complianceCount, exceptionCount] = await Promise.all([
    prisma.paymentRequest.count({ where: { businessId: session.businessId } }),
    prisma.vendor.count({ where: { businessId: session.businessId, kybStatus: "approved" } }),
    prisma.paymentRequest.count({ where: { businessId: session.businessId, status: "compliance_review" } }),
    prisma.paymentRequest.count({ where: { businessId: session.businessId, status: "exception_queue" } }),
  ]);

  const recent = await prisma.paymentRequest.findMany({
    where: { businessId: session.businessId },
    include: { vendor: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const stats = [
    { label: "Total payments", value: totalPayments, href: "/payments", urgent: false,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg> },
    { label: "Approved vendors", value: approvedVendors, href: "/vendors", urgent: false,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg> },
    { label: "Compliance", value: complianceCount, href: "/compliance", urgent: complianceCount > 0,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
    { label: "Exceptions", value: exceptionCount, href: "/exceptions", urgent: exceptionCount > 0,
      icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg> },
  ];

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>
          Good day, {session.fullName.split(" ")[0]}
        </h1>
        <p style={{ fontSize: 13.5, color: "#6b7785", margin: "4px 0 0" }}>Here&apos;s where your payment operations stand today.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 22 }}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
            <div style={{ textAlign: "left", background: "#fff", border: s.urgent ? "1px solid #f6dcbe" : "1px solid #e8eaed", borderRadius: 13, padding: "16px 17px 18px", boxShadow: s.urgent ? "0 0 0 3px rgba(159,69,20,.07)" : "none", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#8a97a6" }}>
                  {s.icon}
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7785" }}>{s.label}</span>
                </div>
                {s.urgent && s.value > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#9a4513", background: "#fdeee2", borderRadius: 999, padding: "2px 8px" }}>Action</span>
                )}
              </div>
              <div style={{ fontSize: 27, fontWeight: 700, marginTop: 9, letterSpacing: "-.02em", color: s.urgent && s.value > 0 ? "#9a4513" : "#0c1d2e" }}>
                {s.value}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent payments */}
      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 19px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#0c1d2e" }}>Recent payments</div>
          <Link href="/payments" style={{ fontSize: 12.5, fontWeight: 600, color: "#0e7a5a", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            View all
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>

        {recent.length === 0 ? (
          <div style={{ padding: "52px 24px", textAlign: "center", borderTop: "1px solid #eef0f3" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#3f4d5a" }}>No payments yet</div>
            <div style={{ fontSize: 12.5, color: "#98a3b0", margin: "6px auto 16px", maxWidth: 360, lineHeight: 1.5 }}>
              You&apos;ll need at least one approved vendor before submitting a payment request.
            </div>
            <Link href="/vendors/new" style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", background: "#0e7a5a", border: "none", borderRadius: 9, padding: "9px 16px", textDecoration: "none", display: "inline-block" }}>
              Add first vendor
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderTop: "1px solid #eef0f3" }}>
                {["Vendor", "Invoice", "Amount", "Status", "Date"].map((h, i) => (
                  <th key={h} style={{ textAlign: i === 2 ? "right" : "left", fontSize: 11, fontWeight: 500, color: "#8a97a6", padding: i === 0 ? "9px 19px" : i === 4 ? "9px 19px 9px 12px" : "9px 12px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.cancelled;
                const av = avatarColor(p.vendor.legalName);
                const ini = getInitials(p.vendor.legalName);
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid #f1f3f5", cursor: "pointer" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(12,29,46,.025)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
                    <td style={{ padding: "11px 19px" }}>
                      <Link href={`/payments/${p.id}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: av.bg, color: av.fg, fontSize: 10.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini}</div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#0c1d2e" }}>{p.vendor.legalName}</span>
                      </Link>
                    </td>
                    <td style={{ padding: "11px 12px", fontSize: 12.5, color: "#6b7785", fontFamily: "var(--font-mono)" }}>{p.invoiceNumber}</td>
                    <td style={{ padding: "11px 12px", fontSize: 13, textAlign: "right", fontWeight: 600, color: "#0c1d2e" }}>{formatNaira(p.amount)}</td>
                    <td style={{ padding: "11px 12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, padding: "3px 10px 3px 8px", borderRadius: 999, background: badge.bg, color: badge.fg }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot, flexShrink: 0 }} />
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: "11px 19px 11px 12px", fontSize: 12.5, color: "#6b7785" }}>
                      {new Date(p.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
