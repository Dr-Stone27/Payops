"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DashboardIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 flex-shrink-0">
    <rect x="1" y="1" width="6" height="6" rx="1" />
    <rect x="9" y="1" width="6" height="6" rx="1" />
    <rect x="1" y="9" width="6" height="6" rx="1" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
  </svg>
);

const VendorsIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 flex-shrink-0">
    <path d="M2 14V6.5l5-2.5 5 2.5V14H9.5v-3.5h-3V14H2z" />
    <rect x="6.5" y="1" width="3" height="2" rx="0.5" />
  </svg>
);

const PaymentsIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
    <path d="M3 13L13 3M13 3H7M13 3v6" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
    <path d="M8 1.5L2 4v4.5C2 11.5 4.5 14 8 15c3.5-1 6-3.5 6-6.5V4L8 1.5z" />
    <path d="M5.5 8l1.5 1.5 3.5-3.5" />
  </svg>
);

const TriangleIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
    <path d="M8 2.5L1.5 13.5h13L8 2.5z" />
    <line x1="8" y1="6.5" x2="8" y2="9.5" />
    <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const ListIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4 flex-shrink-0">
    <line x1="2" y1="4" x2="14" y2="4" />
    <line x1="2" y1="8" x2="14" y2="8" />
    <line x1="2" y1="12" x2="11" y2="12" />
  </svg>
);

const TeamIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
    <circle cx="6" cy="5.5" r="2.5" />
    <path d="M1 14c0-2.8 2.2-5 5-5s5 2.2 5 5" />
    <circle cx="12.5" cy="5.5" r="1.8" opacity="0.5" />
    <path d="M14.5 13c-.2-1.8-1.3-3.2-2.8-3.8" opacity="0.5" />
  </svg>
);

const NAV = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon, exact: true },
  { href: "/vendors", label: "Vendors", Icon: VendorsIcon, exact: false },
  { href: "/payments", label: "Payments", Icon: PaymentsIcon, exact: false },
  { href: "/compliance", label: "Compliance Queue", Icon: ShieldIcon, exact: false },
  { href: "/exceptions", label: "Exception Queue", Icon: TriangleIcon, exact: false },
  { href: "/audit", label: "Audit Log", Icon: ListIcon, exact: false },
  { href: "/team", label: "Team", Icon: TeamIcon, exact: false },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {NAV.map(({ href, label, Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? "bg-emerald-50 text-emerald-700 font-medium"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span className={isActive ? "text-emerald-600" : "text-gray-400"}>
              <Icon />
            </span>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
