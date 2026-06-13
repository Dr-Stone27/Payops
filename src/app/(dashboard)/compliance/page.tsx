import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/compliance";
import Link from "next/link";

export const dynamic = "force-dynamic";

const TRIGGER_LABEL: Record<string, string> = {
  HIGH_VALUE: "High-value (≥ ₦5M)",
  DUPLICATE_INVOICE: "Duplicate invoice",
  BENEFICIARY_CHANGE: "Beneficiary change",
  REPEATED_FAILURE: "Repeated PSP failures",
  AMBIGUOUS_MATCH: "Ambiguous KYB match",
};

export default async function CompliancePage() {
  const session = await getSession();
  if (!session) return null;

  const queue = await prisma.paymentRequest.findMany({
    where: { businessId: session.businessId, status: "compliance_review" },
    include: { vendor: true, maker: { select: { fullName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Compliance Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Payments flagged for review before reaching a Checker. Must be cleared by a Checker who did not create the request.
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-14 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-full mb-3">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-600">
              <path d="M10 2L3 5v5c0 3.5 3 6.5 7 7.5 4-1 7-4 7-7.5V5L10 2z" />
              <path d="M7 10l2 2 4-4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Compliance queue is clear</p>
          <p className="text-xs text-gray-400 mt-1">Payments ≥ ₦5M, duplicate invoices, or ambiguous KYB matches appear here for review before reaching a Checker.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map(p => (
            <div key={p.id} className="bg-white border border-orange-200 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">{p.vendor.legalName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Invoice {p.invoiceNumber} · Created by {p.maker.fullName}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatNaira(p.amount)}</p>
                  <span className="inline-flex mt-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                    {TRIGGER_LABEL[p.complianceTrigger ?? ""] ?? p.complianceTrigger}
                  </span>
                </div>
              </div>
              <Link
                href={`/payments/${p.id}`}
                className="block w-full text-center py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Review this payment →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
