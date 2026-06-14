"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function DashIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>;
}
function PayIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M2 10h20"/></svg>;
}
function VendorIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01"/></svg>;
}
function ShieldIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
}
function AlertIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>;
}
function DocIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>;
}
function TeamIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></svg>;
}

const GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", Icon: DashIcon, exact: true }],
  },
  {
    label: "Operations",
    items: [
      { href: "/payments", label: "Payments", Icon: PayIcon, exact: false },
      { href: "/vendors",  label: "Vendors",  Icon: VendorIcon, exact: false },
    ],
  },
  {
    label: "Governance",
    items: [
      { href: "/compliance",  label: "Compliance",  Icon: ShieldIcon, exact: false, badge: "compliance" },
      { href: "/exceptions",  label: "Exceptions",  Icon: AlertIcon,  exact: false, badge: "exceptions" },
      { href: "/audit",       label: "Audit log",   Icon: DocIcon,    exact: false },
    ],
  },
  {
    label: "Organization",
    items: [{ href: "/team", label: "Team", Icon: TeamIcon, exact: false }],
  },
];

interface Props {
  complianceCount: number;
  exceptionCount: number;
}

export function NavLinks({ complianceCount, exceptionCount }: Props) {
  const pathname = usePathname();

  const counts: Record<string, number> = {
    compliance: complianceCount,
    exceptions: exceptionCount,
  };

  return (
    <nav className="flex-1 overflow-y-auto wt-scroll" style={{ padding: "4px 10px" }}>
      {GROUPS.map((group) => (
        <div key={group.label}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".09em", textTransform: "uppercase", color: "#9aa6b2", padding: "14px 10px 6px" }}>
            {group.label}
          </div>
          {group.items.map(({ href, label, Icon, exact, badge }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            const count = badge ? counts[badge] : 0;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "8px 10px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: isActive ? "#0e7a5a" : "#3f4d5a",
                  background: isActive ? "#ecf6f1" : "transparent",
                  marginBottom: 1,
                  transition: "background .12s, color .12s",
                }}
                onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "#f6f8f7"; }}
                onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {isActive && (
                  <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: "#0e7a5a" }} />
                )}
                <span style={{ color: isActive ? "#0e7a5a" : "#8a97a6", flexShrink: 0 }}>
                  <Icon />
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                {count > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, background: badge === "exceptions" ? "#fdeceb" : "#fdeee2", color: badge === "exceptions" ? "#a32820" : "#9a4513", borderRadius: 999, padding: "1px 7px" }}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
