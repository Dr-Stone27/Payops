import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/compliance";
import Link from "next/link";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, { label: string; desc: string }> = {
  PSP_FAILURE: { label: "PSP Failure", desc: "PSP returned a failure status. Retry or cancel." },
  AMOUNT_MISMATCH: { label: "Amount Mismatch", desc: "Settled amount differs from invoice outside NIP tolerance." },
  STATUS_UNKNOWN: { label: "Status Unknown", desc: "No settlement webhook received in 48 hours." },
  PARTIAL_TRANCHE_SETTLEMENT: { label: "Partial Tranche Settlement", desc: "Tranche sequence interrupted." },
  COMPLIANCE_REVIEW_TIMEOUT: { label: "Compliance Timeout", desc: "Compliance review not actioned within 48 hours." },
  ORPHANED_SETTLEMENT: { label: "Orphaned Settlement", desc: "Settlement arrived after request was cancelled." },
};

export default async function ExceptionsPage() {
  const session = await getSession();
  if (!session) return null;

  const exceptions = await prisma.paymentRequest.findMany({
    where: { businessId: session.businessId, status: "exception_queue" },
    include: { vendor: true, maker: { select: { fullName: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Exception Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Failed, mismatched, or timed-out payments requiring manual review.
        </p>
      </div>

      {exceptions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-14 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-50 rounded-full mb-3">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-emerald-600">
              <path d="M10 2l1.5 5.5h5.5L12.5 11l2 5.5L10 13.5 5.5 16.5l2-5.5L3 7.5h5.5L10 2z" opacity="0"/>
              <path d="M5 10l3.5 3.5L15 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No exceptions</p>
          <p className="text-xs text-gray-400 mt-1">PSP failures, amount mismatches outside NIP tolerance, and timed-out settlements appear here for manual review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exceptions.map(p => {
            const cat = CATEGORY_LABEL[p.exceptionCategory ?? ""] ?? { label: p.exceptionCategory ?? "Unknown", desc: "" };
            return (
              <div key={p.id} className="bg-white border border-red-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="inline-flex px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium mb-1">
                      {cat.label}
                    </span>
                    <p className="font-medium text-gray-900">{p.vendor.legalName}</p>
                    <p className="text-xs text-gray-500">Invoice {p.invoiceNumber}</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatNaira(p.amount)}</p>
                </div>
                <p className="text-xs text-red-700 mb-3">{cat.desc}</p>
                {p.settledAmount != null && p.settledAmount !== p.amount && (
                  <p className="text-xs text-gray-500 mb-3">
                    Settled: {formatNaira(p.settledAmount)} vs Invoice: {formatNaira(p.amount)} (variance: {formatNaira(Math.abs(p.settledAmount - p.amount))})
                  </p>
                )}
                <Link
                  href={`/payments/${p.id}`}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  View payment details →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
