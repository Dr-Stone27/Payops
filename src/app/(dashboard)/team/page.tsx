import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ROLE_COLOR: Record<string, string> = {
  owner: "bg-emerald-100 text-emerald-700",
  admin: "bg-blue-100 text-blue-700",
  maker: "bg-gray-100 text-gray-600",
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner (Checker)",
  admin: "Admin (Checker)",
  maker: "Maker",
};

export default async function TeamPage() {
  const session = await getSession();
  if (!session) return null;

  const members = await prisma.user.findMany({
    where: { businessId: session.businessId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Team Members</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Makers create payment requests. Checkers (Admin/Owner) approve them — four-eyes rule enforced.
          </p>
        </div>
        {["owner", "admin"].includes(session.role) && (
          <Link
            href="/team/new"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Add member
          </Link>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Email</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Role</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">PIN</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">
                  {m.fullName}
                  {m.id === session.userId && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                </td>
                <td className="px-5 py-3 text-gray-500">{m.email}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[m.role] ?? "bg-gray-100 text-gray-500"}`}>
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-gray-400">
                  {m.pinHash ? "✓ Set" : <span className="text-orange-500">Not set</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
        <strong>Four-eyes rule:</strong> The person who creates a payment (Maker) cannot approve it. If a Checker also cleared the compliance review for a payment, they cannot then approve the same payment — a different Checker must approve.
      </div>
    </div>
  );
}
