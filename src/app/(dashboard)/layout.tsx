import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { logout } from "@/actions/auth";
import { NavLinks } from "./NavLinks";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const roleLabel = session.role === "owner" ? "Owner · Checker"
    : session.role === "admin" ? "Admin · Checker"
    : session.role === "maker" ? "Maker"
    : session.role;

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-600 rounded-md flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-gray-900">PayOps</p>
              <p className="text-xs text-gray-400 mt-0.5">Control Tower</p>
            </div>
          </div>
        </div>

        <NavLinks />

        <div className="p-3 border-t border-gray-100">
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-gray-900 truncate">{session.fullName}</p>
            <p className="text-xs text-gray-400">{roleLabel}</p>
          </div>
          {!session.role.includes("maker") && !session.role.includes("viewer") && (
            <Link
              href="/setup-pin"
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3.5 h-3.5">
                <rect x="3" y="7" width="10" height="7" rx="1.5" />
                <path d="M5 7V5a3 3 0 016 0v2" />
              </svg>
              Update PIN
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M10 8H2M6 5l-3 3 3 3" />
                <path d="M6 2h6a1 1 0 011 1v10a1 1 0 01-1 1H6" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50/40">
        {children}
      </main>
    </div>
  );
}
