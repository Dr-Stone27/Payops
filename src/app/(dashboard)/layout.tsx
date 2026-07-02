import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { NavLinks } from "./NavLinks";
import { TopBar } from "./TopBar";
import { logout } from "@/actions/auth";
import { WalkthroughProvider } from "@/context/WalkthroughContext";
import { WalkthroughBanner } from "@/components/WalkthroughBanner";
import { ToastProvider } from "@/components/ui/Toast";

function LighthouseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eafff4" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 9.5 8 20"/><path d="M14.5 9.5 16 20"/><path d="M7.5 20h9"/>
      <path d="M9 9.5h6"/><path d="M10 9.5V7h4v2.5"/>
      <path d="M12 4.2v1.6"/><path d="M5.4 7.1l2.6 1"/><path d="M18.6 7.1l-2.6 1"/>
      <path d="M9 15h6"/>
    </svg>
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [complianceCount, exceptionCount, teamCount, approvedVendorCount, paymentCount, me, activityCount] = await Promise.all([
    prisma.paymentRequest.count({ where: { businessId: session.businessId, status: "compliance_review" } }),
    prisma.paymentRequest.count({ where: { businessId: session.businessId, status: "exception_queue" } }),
    prisma.user.count({ where: { businessId: session.businessId } }),
    prisma.vendor.count({ where: { businessId: session.businessId, kybStatus: "approved" } }),
    prisma.paymentRequest.count({ where: { businessId: session.businessId } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { walkthroughState: true } }),
    prisma.auditLog.count({
      where: {
        userId: session.userId,
        action: { in: ["PAYMENT_CREATED", "PAYMENT_APPROVED", "PAYMENT_REJECTED", "COMPLIANCE_CLEARED", "COMPLIANCE_BLOCKED", "VENDOR_ADDED", "VENDOR_MANUALLY_APPROVED", "EXCEPTION_ACKNOWLEDGED"] },
      },
    }),
  ]);

  const business = await prisma.business.findUnique({ where: { id: session.businessId } });

  // Walkthrough state is server-persisted per user. Users with no stored
  // state but real platform activity predate persistence — never re-onboard them.
  let initialDismissed: string[] = [];
  let initialComplete = false;
  if (me?.walkthroughState) {
    try {
      const s = JSON.parse(me.walkthroughState) as { d?: string[]; c?: boolean };
      initialDismissed = Array.isArray(s.d) ? s.d : [];
      initialComplete = Boolean(s.c);
    } catch {}
  } else if (activityCount > 0) {
    initialComplete = true;
  }

  return (
    <ToastProvider>
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 248, flexShrink: 0, background: "#fff", borderRight: "1px solid #e8eaed", height: "100vh", display: "flex", flexDirection: "column" }}>

        {/* Logo */}
        <div style={{ padding: "20px 18px 14px", display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(160deg,#12936c,#0b5e44)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(11,94,68,.32)", flexShrink: 0 }}>
            <LighthouseIcon />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.02em", color: "#0c1d2e" }}>Watchtower</div>
            <div style={{ fontSize: 11, color: "#8a97a6", fontWeight: 500 }}>Payment oversight</div>
          </div>
        </div>

        {/* New payment CTA */}
        <div style={{ padding: "0 12px 10px" }}>
          <Link
            href="/payments/new"
            className="wt-sidebar-cta"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            New payment
          </Link>
        </div>

        {/* Nav groups */}
        <NavLinks complianceCount={complianceCount} exceptionCount={exceptionCount} />

        {/* Business chip */}
        {business && (
          <div style={{ borderTop: "1px solid #eef0f3", padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", borderRadius: 10, background: "#f6f8f7" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: "#0c1d2e", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {business.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{business.name}</div>
                <div style={{ fontSize: 10.5, color: "#8a97a6", fontFamily: "var(--font-mono)" }}>{business.cacNumber}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main column ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", height: "100vh" }}>
        <WalkthroughProvider
          role={session.role}
          initialDismissed={initialDismissed}
          initialComplete={initialComplete}
          hasApprovedVendor={approvedVendorCount > 0}
          hasPayments={paymentCount > 0}
          hasTeamMember={teamCount > 1}
        >
          <TopBar session={{ fullName: session.fullName, role: session.role, email: "" }} />
          <main className="wt-scroll" style={{ flex: 1, overflowY: "auto", background: "#f5f6f8" }}>
            <WalkthroughBanner />
            {children}
          </main>
        </WalkthroughProvider>
      </div>
    </div>
    </ToastProvider>
  );
}
