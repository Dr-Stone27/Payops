"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { approvePayment, rejectPayment, clearComplianceReview } from "@/actions/payments";

interface Payment {
  id: string;
  invoiceNumber: string;
  amount: number;
  costCenter: string | null;
  invoicePdfName: string | null;
  status: string;
  exceptionCategory: string | null;
  complianceTrigger: string | null;
  rejectionReason: string | null;
  transactionReference: string | null;
  settledAmount: number | null;
  createdAt: string;
  makerId: string;
  complianceReviewResolvedBy: string | null;
  vendor: { legalName: string; bankName: string; nubanLast4: string; kybStatus: string };
  maker: { fullName: string };
}

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Pending Approval",
  compliance_review: "Compliance Review",
  processing: "Processing",
  settled: "Settled",
  reconciled: "Reconciled ✓",
  exception_queue: "Exception Queue",
  cancelled: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-200",
  compliance_review: "bg-orange-100 text-orange-800 border-orange-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  settled: "bg-cyan-100 text-cyan-800 border-cyan-200",
  reconciled: "bg-emerald-100 text-emerald-800 border-emerald-200",
  exception_queue: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<string | null>(null);

  const [pin, setPin] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/payments/${id}`).then(r => r.json()).then(d => {
      setPayment(d.payment);
      setSessionUserId(d.userId);
      setSessionRole(d.role);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Poll while processing
  useEffect(() => {
    if (payment?.status === "processing") {
      setPolling(true);
      const interval = setInterval(load, 2000);
      return () => { clearInterval(interval); setPolling(false); };
    }
  }, [payment?.status, load]);

  async function handleApprove() {
    setLoading(true); setError("");
    const result = await approvePayment(id, pin);
    if (result?.error) { setError(result.error); setLoading(false); }
    else { setPin(""); load(); setLoading(false); }
  }

  async function handleReject() {
    setLoading(true); setError("");
    const result = await rejectPayment(id, rejectReason);
    if (result?.error) { setError(result.error); setLoading(false); }
    else { load(); setLoading(false); }
  }

  async function handleCompliance(decision: "clear" | "block") {
    setLoading(true); setError("");
    const result = await clearComplianceReview(id, decision);
    if (result?.error) { setError(result.error); setLoading(false); }
    else { load(); setLoading(false); }
  }

  if (!payment) return <div className="p-6 text-sm text-gray-400">Loading…</div>;

  const isChecker = sessionRole === "owner" || sessionRole === "admin";
  const isMaker = payment.makerId === sessionUserId;
  const isComplianceResolver = payment.complianceReviewResolvedBy === sessionUserId;
  const canApprove = isChecker && !isMaker && !isComplianceResolver && payment.status === "pending_approval";

  const triggerLabels: Record<string, string> = {
    HIGH_VALUE: "High-value payment (≥ ₦5,000,000)",
    DUPLICATE_INVOICE: "Duplicate invoice number detected",
    BENEFICIARY_CHANGE: "Vendor bank details changed recently",
    REPEATED_FAILURE: "Repeated PSP failures for this vendor",
    AMBIGUOUS_MATCH: "Vendor KYB match score was marginal (0.70–0.84)",
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/payments" className="text-sm text-gray-500 hover:text-gray-700">← Back to payments</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{payment.vendor.legalName}</h1>
            <p className="text-sm text-gray-500">Invoice {payment.invoiceNumber} · Created by {payment.maker.fullName}</p>
          </div>
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${STATUS_COLOR[payment.status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {STATUS_LABEL[payment.status] ?? payment.status}
          </span>
        </div>
      </div>

      {/* Payment details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Amount</p>
            <p className="text-2xl font-bold text-gray-900">{formatNaira(payment.amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Vendor Account</p>
            <p className="font-medium text-gray-900">{payment.vendor.bankName} ••••{payment.vendor.nubanLast4}</p>
          </div>
          {payment.costCenter && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Cost Center</p>
              <p className="text-gray-700">{payment.costCenter}</p>
            </div>
          )}
          {payment.invoicePdfName && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Invoice PDF</p>
              <p className="text-xs font-mono bg-gray-50 px-2 py-1 rounded text-gray-600">{payment.invoicePdfName}</p>
            </div>
          )}
          {payment.transactionReference && (
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-0.5">Transaction Reference</p>
              <p className="text-xs font-mono text-gray-600">{payment.transactionReference}</p>
            </div>
          )}
          {payment.settledAmount != null && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Settled Amount</p>
              <p className={`font-medium ${payment.settledAmount === payment.amount ? "text-emerald-700" : "text-red-700"}`}>
                {formatNaira(payment.settledAmount)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Processing state — live polling */}
      {payment.status === "processing" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-900">Dispatched to PSP</p>
            <p className="text-xs text-blue-700 mt-0.5">Awaiting settlement webhook… This page updates automatically.</p>
          </div>
        </div>
      )}

      {/* Reconciled state */}
      {payment.status === "reconciled" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-emerald-900">✓ Reconciled</p>
          <p className="text-xs text-emerald-700 mt-1">Settlement amount matched invoice within NIP charge tolerance. No manual action required.</p>
        </div>
      )}

      {/* Exception queue */}
      {payment.status === "exception_queue" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-semibold text-red-900">⚠ Exception: {payment.exceptionCategory?.replace(/_/g, " ")}</p>
          <p className="text-xs text-red-700 mt-1">
            {payment.exceptionCategory === "PSP_FAILURE" && "The PSP returned a failure status. Retry from the Exception Queue or cancel this request."}
            {payment.exceptionCategory === "AMOUNT_MISMATCH" && `Settled amount (${formatNaira(payment.settledAmount ?? 0)}) differs from invoice amount outside the NIP tolerance band. Manual reconciliation required.`}
            {payment.exceptionCategory === "STATUS_UNKNOWN" && "No settlement webhook received within 48 hours. Check with your PSP."}
            {payment.exceptionCategory === "COMPLIANCE_REVIEW_TIMEOUT" && "Compliance review was not completed within the required window."}
          </p>
        </div>
      )}

      {/* Rejection reason */}
      {payment.status === "cancelled" && payment.rejectionReason && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Rejection reason</p>
          <p className="text-sm text-gray-700">{payment.rejectionReason}</p>
        </div>
      )}

      {/* Compliance review */}
      {payment.status === "compliance_review" && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-semibold text-orange-900 mb-1">⚖ Compliance Review Required</p>
          <p className="text-xs text-orange-800 mb-3">
            <strong>Trigger:</strong> {triggerLabels[payment.complianceTrigger ?? ""] ?? payment.complianceTrigger}
          </p>

          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>
          )}

          {isChecker && !isComplianceResolver && (
            <div className="flex gap-2">
              <button
                onClick={() => handleCompliance("clear")}
                disabled={loading}
                className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 text-white text-xs font-medium rounded-lg"
              >
                {loading ? "…" : "Clear review — proceed to approval"}
              </button>
              <button
                onClick={() => handleCompliance("block")}
                disabled={loading}
                className="flex-1 py-2 bg-white hover:bg-red-50 border border-red-300 text-red-700 text-xs font-medium rounded-lg"
              >
                Block payment
              </button>
            </div>
          )}
          {isMaker && <p className="text-xs text-orange-700 mt-2">Awaiting Checker review. You created this request and cannot action the compliance review.</p>}
        </div>
      )}

      {/* Checker approval */}
      {payment.status === "pending_approval" && isChecker && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">Approve or reject</p>

          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>
          )}

          {canApprove ? (
            <>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">Enter 4-digit approval PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm text-center tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••"
                />
                <p className="text-xs text-gray-400 mt-1">PIN is validated server-side as part of the approval transaction</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={loading || pin.length !== 4}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-lg"
                >
                  {loading ? "Verifying PIN…" : "Approve & dispatch"}
                </button>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <label className="block text-xs font-medium text-gray-700 mb-1">Reject with reason</label>
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  placeholder="Minimum 10 characters…"
                />
                <button
                  onClick={handleReject}
                  disabled={loading || rejectReason.trim().length < 10}
                  className="mt-2 px-4 py-2 border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-40 text-xs font-medium rounded-lg"
                >
                  Reject payment
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500">
              {isMaker ? "You created this request and cannot approve it (Maker-Checker rule)." :
               isComplianceResolver ? "You cleared the compliance review for this payment and cannot also approve it (four-eyes rule)." :
               "You do not have permission to approve this payment."}
            </p>
          )}
        </div>
      )}

      {payment.status === "pending_approval" && !isChecker && !isMaker && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-800">Awaiting Checker approval (Admin or Owner).</p>
        </div>
      )}
    </div>
  );
}
