import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

const KYB_COLOR: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  needs_review: "bg-yellow-100 text-yellow-800",
  verification_pending: "bg-gray-100 text-gray-500",
};

export default async function VendorsPage() {
  const session = await getSession();
  if (!session) return null;

  const vendors = await prisma.vendor.findMany({
    where: { businessId: session.businessId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">CAC-verified vendor registry</p>
        </div>
        <Link
          href="/vendors/new"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add vendor
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {vendors.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            No vendors yet.{" "}
            <Link href="/vendors/new" className="text-emerald-600 hover:underline">
              Add your first vendor.
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Legal Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Bank</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Account</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">KYB Score</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{v.legalName}</td>
                  <td className="px-5 py-3 text-gray-500">{v.bankName}</td>
                  <td className="px-5 py-3 text-gray-500">
                    ••••••{v.nubanLast4}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {v.jaroWinklerScore != null ? v.jaroWinklerScore.toFixed(2) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${KYB_COLOR[v.kybStatus] ?? "bg-gray-100 text-gray-500"}`}>
                      {v.kybStatus === "needs_review" ? "Needs Review" : v.kybStatus === "approved" ? "Approved" : "Pending"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {v.kybStatus === "needs_review" && ["owner", "admin"].includes(session.role) && (
                      <Link href={`/vendors/${v.id}`} className="text-xs text-emerald-600 hover:underline font-medium">
                        Review →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
