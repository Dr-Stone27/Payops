import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { logout } from "@/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/vendors", label: "Vendors", icon: "🏢" },
  { href: "/payments", label: "Payments", icon: "💳" },
  { href: "/compliance", label: "Compliance Queue", icon: "⚖️" },
  { href: "/exceptions", label: "Exception Queue", icon: "⚠️" },
  { href: "/audit", label: "Audit Log", icon: "📋" },
  { href: "/team", label: "Team", icon: "👥" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">PayOps</p>
              <p className="text-xs text-gray-400 mt-0.5">Control Tower</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-gray-900 truncate">{session.fullName}</p>
            <p className="text-xs text-gray-400 capitalize">{session.role.replace("_", " ")}</p>
          </div>
          {!session.role.includes("maker") && !session.role.includes("viewer") && (
            <Link
              href="/setup-pin"
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded"
            >
              🔐 Update PIN
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded"
            >
              ↩ Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
