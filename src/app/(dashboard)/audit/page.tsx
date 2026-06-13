import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

  const OUTCOME_COLOR: Record<string, string> = {
    success: "text-emerald-700",
    approved: "text-emerald-700",
    reconciled: "text-emerald-700",
    pending_approval: "text-yellow-700",
    processing: "text-blue-700",
    rejected: "text-red-700",
    exception_queue: "text-red-700",
    cancelled: "text-gray-500",
    failed: "text-red-700",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">Immutable record of all actions — who, what, when, outcome.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {logs.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">No audit entries yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Time</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">User</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Action</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Payment</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Detail</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString("en-NG", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-2.5 text-xs">
                    {l.user ? (
                      <span>
                        <span className="font-medium text-gray-900">{l.user.fullName}</span>
                        <span className="text-gray-400 ml-1 capitalize">({l.user.role.replace("_", " ")})</span>
                      </span>
                    ) : <span className="text-gray-400">System</span>}
                  </td>
                  <td className="px-5 py-2.5 text-xs font-mono text-gray-600">{l.action}</td>
                  <td className="px-5 py-2.5 text-xs">
                    {l.payment ? (
                      <Link href={`/payments/${l.paymentId}`} className="text-emerald-600 hover:underline">
                        {l.payment.vendor.legalName} / {l.payment.invoiceNumber}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-5 py-2.5 text-xs text-gray-500 max-w-xs truncate">{l.detail ?? "—"}</td>
                  <td className={`px-5 py-2.5 text-xs font-medium ${OUTCOME_COLOR[l.outcome] ?? "text-gray-500"}`}>
                    {l.outcome}
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
