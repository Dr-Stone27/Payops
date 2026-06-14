import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { avatarColor, getInitials, roleLabel, roleFg } from "@/lib/design";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getSession();
  if (!session) return null;

  const members = await prisma.user.findMany({
    where: { businessId: session.businessId },
    orderBy: { createdAt: "asc" },
  });

  const isAdmin = ["owner", "admin"].includes(session.role);

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>Team</h1>
          <p style={{ fontSize: 13.5, color: "#6b7785", margin: "4px 0 0" }}>
            Makers create requests. Checkers (Admin/Owner) approve them.
          </p>
        </div>
        {isAdmin && (
          <Link href="/team/new" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 9, background: "#0e7a5a", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Add member
          </Link>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, overflow: "hidden", marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eef0f3" }}>
              {["Member", "Email", "Role", "PIN"].map((h, i) => (
                <th key={h} style={{ textAlign: "left", fontSize: 11, fontWeight: 500, color: "#8a97a6", padding: i === 0 ? "9px 19px" : "9px 12px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const av = avatarColor(m.fullName);
              const ini = getInitials(m.fullName);
              const isYou = m.id === session.userId;
              return (
                <tr key={m.id} style={{ borderTop: "1px solid #f1f3f5" }}>
                  <td style={{ padding: "12px 19px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: av.bg, color: av.fg, fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#0c1d2e", display: "flex", alignItems: "center", gap: 8 }}>
                          {m.fullName}
                          {isYou && <span style={{ fontSize: 10, fontWeight: 600, color: "#8a97a6", background: "#f1f3f5", borderRadius: 999, padding: "2px 7px" }}>you</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 12px", fontSize: 13, color: "#6b7785" }}>{m.email}</td>
                  <td style={{ padding: "12px 12px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: roleFg(m.role) }}>{roleLabel(m.role)}</span>
                  </td>
                  <td style={{ padding: "12px 12px" }}>
                    {m.pinHash ? (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#0e7a5a", display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        Set
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#d4a41a" }}>Not set</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: "#fcf7e6", border: "1px solid #e8d28a", borderRadius: 12, padding: "12px 16px", fontSize: 12.5, color: "#8a6510", lineHeight: 1.5 }}>
        <strong>Four-eyes rule:</strong> The person who creates a payment cannot approve it. If a Checker also cleared compliance review for a payment, a different Checker must approve it.
      </div>
    </div>
  );
}
