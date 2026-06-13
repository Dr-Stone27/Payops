import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/compliance";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Pending Approval",
  compliance_review: "Compliance Review",
  processing: "Processing",
  settled: "Settled",
  reconciled: "Reconciled",
  exception_queue: "Exception",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending_approval: "bg-yellow-100 text-yellow-800",
  compliance_review: "bg-orange-100 text-orange-800",
  processing: "bg-blue-100 text-blue-800",
  settled: "bg-cyan-100 text-cyan-800",
  reconciled: "bg-emerald-100 text-emerald-800",
  exception_queue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-500",
};

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) return null;

  const payments = await prisma.paymentRequest.findMany({
    where: { businessId: session.businessId },
    include: { vendor: true, maker: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">All payment requests across states</p>
        </div>
        <Link
          href="/payments/new"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New payment
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {payments.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">
            No payments yet.{" "}
            <Link href="/payments/new" className="text-emerald-600 hover:underline">
              Create the first one.
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Vendor</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Invoice</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-400">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Maker</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/payments/${p.id}`} className="font-medium text-gray-900 hover:text-emerald-700">
                      {p.vendor.legalName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{p.invoiceNumber}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">{formatNaira(p.amount)}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{p.maker.fullName}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(p.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
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
