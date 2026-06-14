import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { KYB_BADGE, kybColor, avatarColor, getInitials } from "@/lib/design";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const session = await getSession();
  if (!session) return null;

  const vendors = await prisma.vendor.findMany({
    where: { businessId: session.businessId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 1080, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>Vendors</h1>
          <p style={{ fontSize: 13.5, color: "#6b7785", margin: "4px 0 0" }}>CAC-verified vendor registry</p>
        </div>
        <Link href="/vendors/new" style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 16px", borderRadius: 9, background: "#0e7a5a", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Add vendor
        </Link>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, overflow: "hidden" }}>
        {vendors.length === 0 ? (
          <div style={{ padding: "52px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#3f4d5a" }}>No vendors yet</div>
            <div style={{ fontSize: 12.5, color: "#98a3b0", margin: "6px auto 16px", maxWidth: 360, lineHeight: 1.5 }}>
              Add a vendor to start submitting payment requests. Each vendor is CAC and NUBAN-verified automatically.
            </div>
            <Link href="/vendors/new" style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", background: "#0e7a5a", borderRadius: 9, padding: "9px 16px", textDecoration: "none", display: "inline-block" }}>
              Add first vendor
            </Link>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eef0f3" }}>
                {["Vendor", "Bank", "Account", "KYB score", "Status", ""].map((h, i) => (
                  <th key={i} style={{ textAlign: "left", fontSize: 11, fontWeight: 500, color: "#8a97a6", padding: i === 0 ? "9px 19px" : "9px 12px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => {
                const badge = KYB_BADGE[v.kybStatus] ?? KYB_BADGE.verification_pending;
                const av = avatarColor(v.legalName);
                const ini = getInitials(v.legalName);
                const score = v.jaroWinklerScore;
                const barColor = kybColor(score);
                const barPct = score != null ? Math.round(score * 100) : 0;
                return (
                  <tr key={v.id} style={{ borderTop: "1px solid #f1f3f5" }}>
                    <td style={{ padding: "12px 19px" }}>
                      <Link href={`/vendors/${v.id}`} style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: av.bg, color: av.fg, fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{ini}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#0c1d2e" }}>{v.legalName}</div>
                          <div style={{ fontSize: 11.5, color: "#8a97a6", fontFamily: "var(--font-mono)" }}>{v.cacNumber}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: "12px 12px", fontSize: 13, color: "#6b7785" }}>{v.bankName}</td>
                    <td style={{ padding: "12px 12px", fontSize: 12.5, color: "#6b7785", fontFamily: "var(--font-mono)" }}>••••••{v.nubanLast4}</td>
                    <td style={{ padding: "12px 12px" }}>
                      {score != null ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 64, height: 5, borderRadius: 999, background: "#eef0f3", overflow: "hidden" }}>
                            <div style={{ width: `${barPct}%`, height: "100%", background: barColor, borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: barColor, fontFamily: "var(--font-mono)" }}>{barPct}%</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "#9aa6b2" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 12px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, padding: "3px 10px 3px 8px", borderRadius: 999, background: badge.bg, color: badge.fg }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot, flexShrink: 0 }} />
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: "12px 19px 12px 12px", textAlign: "right" }}>
                      {v.kybStatus === "needs_review" && ["owner", "admin"].includes(session.role) && (
                        <Link href={`/vendors/${v.id}`} style={{ fontSize: 12, fontWeight: 600, color: "#0e7a5a", textDecoration: "none" }}>
                          Review →
                        </Link>
                      )}
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
