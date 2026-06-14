import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { avatarColor, getInitials } from "@/lib/design";
import Link from "next/link";

export const dynamic = "force-dynamic";

const OUTCOME_COLOR: Record<string, string> = {
  success: "#0e7a5a", approved: "#0e7a5a", reconciled: "#0e7a5a",
  pending_approval: "#d4a41a", processing: "#3b82f6",
  rejected: "#dc4338", exception_queue: "#dc4338",
  cancelled: "#9aa6b2", failed: "#dc4338",
};

export default async function AuditLogPage() {
  const session = await getSession();
  if (!session) return null;

  const logs = await prisma.auditLog.findMany({
    where: { businessId: session.businessId },
    include: {
      user: { select: { fullName: true, role: true } },
      payment: { select: { invoiceNumber: true, vendor: { select: { legalName: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>Audit Log</h1>
        <p style={{ fontSize: 13.5, color: "#6b7785", margin: "4px 0 0" }}>Immutable record of all actions — who, what, when, outcome.</p>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, overflow: "hidden" }}>
        {logs.length === 0 ? (
          <div style={{ padding: "52px 24px", textAlign: "center", fontSize: 13, color: "#98a3b0" }}>No audit entries yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eef0f3" }}>
                {["Time", "User", "Action", "Payment", "Detail", "Outcome"].map((h, i) => (
                  <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 500, color: "#8a97a6", padding: i === 0 ? "9px 19px" : i === 5 ? "9px 19px 9px 12px" : "9px 12px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const userAv = l.user ? avatarColor(l.user.fullName) : null;
                const userIni = l.user ? getInitials(l.user.fullName) : null;
                return (
                  <tr key={l.id} style={{ borderTop: "1px solid #f1f3f5" }}>
                    <td style={{ padding: "9px 19px", fontSize: 11.5, color: "#8a97a6", whiteSpace: "nowrap", fontFamily: "var(--font-mono)" }}>
                      {new Date(l.createdAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      {l.user && userAv && userIni ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: userAv.bg, color: userAv.fg, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{userIni}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#0c1d2e" }}>{l.user.fullName}</div>
                            <div style={{ fontSize: 10.5, color: "#9aa6b2", textTransform: "capitalize" }}>{l.user.role}</div>
                          </div>
                        </div>
                      ) : <span style={{ fontSize: 12, color: "#9aa6b2" }}>System</span>}
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", color: "#3f4d5a", background: "#f1f3f5", borderRadius: 5, padding: "2px 7px" }}>{l.action}</span>
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      {l.payment ? (
                        <Link href={`/payments/${l.paymentId}`} style={{ fontSize: 12, color: "#0e7a5a", textDecoration: "none", fontWeight: 500 }}>
                          {l.payment.vendor.legalName}
                          <span style={{ color: "#8a97a6", fontFamily: "var(--font-mono)", fontSize: 11 }}> / {l.payment.invoiceNumber}</span>
                        </Link>
                      ) : <span style={{ color: "#9aa6b2", fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: 11.5, color: "#6b7785", maxWidth: 220 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.detail ?? "—"}</div>
                    </td>
                    <td style={{ padding: "9px 19px 9px 12px" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: OUTCOME_COLOR[l.outcome] ?? "#8a97a6" }}>
                        {l.outcome}
                      </span>
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
