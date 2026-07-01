"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { approvePayment, rejectPayment, clearComplianceReview, retryDispatch, retryException, cancelPayment } from "@/actions/payments";
import { STATUS_BADGE, avatarColor, getInitials } from "@/lib/design";
import { InfoTooltip } from "@/components/Tooltip";

interface Payment {
  id: string; invoiceNumber: string; amount: number; costCenter: string | null;
  invoicePdfName: string | null; status: string; exceptionCategory: string | null;
  complianceTrigger: string | null; rejectionReason: string | null;
  transactionReference: string | null; settledAmount: number | null;
  createdAt: string; makerId: string; complianceReviewResolvedBy: string | null;
  vendor: { legalName: string; bankName: string; nubanLast4: string; kybStatus: string };
  maker: { fullName: string };
}

function formatNaira(kobo: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);
}

const TRIGGER_LABELS: Record<string, string> = {
  HIGH_VALUE: "High-value payment (≥ ₦5,000,000)",
  DUPLICATE_INVOICE: "Duplicate invoice number detected",
  BENEFICIARY_CHANGE: "Vendor bank details changed recently",
  REPEATED_FAILURE: "Repeated PSP failures for this vendor",
  AMBIGUOUS_MATCH: "Vendor KYB match score was marginal (0.70–0.84)",
};

function FactRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f3f5" }}>
      <div style={{ fontSize: 12, color: "#8a97a6", width: 140, flexShrink: 0, paddingTop: 1 }}>{label}</div>
      <div style={{ fontSize: 13, color: "#0c1d2e", fontWeight: 500, fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</div>
    </div>
  );
}

function SegmentedPIN({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const digits = Array.from({ length: 4 }, (_, i) => value[i] ?? "");

  return (
    <div style={{ position: "relative", display: "inline-flex", gap: 10 }} onClick={() => hiddenRef.current?.focus()}>
      <input ref={hiddenRef} type="password" inputMode="numeric" maxLength={4} value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }}
        autoFocus />
      {digits.map((d, i) => (
        <div key={i} style={{
          width: 52, height: 60, border: `2px solid ${value.length === i ? "#0e7a5a" : d ? "#0c1d2e" : "#dce1e6"}`,
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#0c1d2e",
          cursor: "text", background: "#fff",
          boxShadow: value.length === i ? "0 0 0 3px rgba(14,122,90,.13)" : "none",
          transition: "border-color .1s, box-shadow .1s",
        }}>
          {d ? "•" : ""}
        </div>
      ))}
    </div>
  );
}

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/payments/${id}`).then(r => r.json()).then(d => {
      setPayment(d.payment);
      setSessionUserId(d.userId);
      setSessionRole(d.role);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (payment?.status === "processing") {
      const interval = setInterval(load, 2000);
      return () => clearInterval(interval);
    }
  }, [payment?.status, load]);

  async function handleCancel() {
    if (!confirm("Cancel this payment request? This cannot be undone.")) return;
    setLoading(true); setError("");
    const result = await cancelPayment(id);
    if (result?.error) { setError(result.error); setLoading(false); }
    else { load(); setLoading(false); }
  }

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

  if (!payment) return (
    <div style={{ padding: 36, display: "flex", alignItems: "center", gap: 10, color: "#8a97a6", fontSize: 13 }}>
      <span className="wt-spin" style={{ display: "inline-block", width: 16, height: 16, border: "2px solid #dce1e6", borderTopColor: "#0e7a5a", borderRadius: "50%" }} />
      Loading…
    </div>
  );

  const isChecker = sessionRole === "owner" || sessionRole === "admin";
  const isMaker = payment.makerId === sessionUserId;
  const isComplianceResolver = payment.complianceReviewResolvedBy === sessionUserId;
  const canApprove = isChecker && !isMaker && !isComplianceResolver && payment.status === "pending_approval";

  const badge = STATUS_BADGE[payment.status] ?? STATUS_BADGE.cancelled;
  const vendorAv = avatarColor(payment.vendor.legalName);
  const vendorIni = getInitials(payment.vendor.legalName);

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/payments" style={{ fontSize: 12.5, color: "#8a97a6", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Payments
        </Link>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: vendorAv.bg, color: vendorAv.fg, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{vendorIni}</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: "-.02em", color: "#0c1d2e" }}>{payment.vendor.legalName}</h1>
              <p style={{ fontSize: 12.5, color: "#6b7785", margin: "3px 0 0", fontFamily: "var(--font-mono)" }}>
                {payment.invoiceNumber} · {payment.maker.fullName}
              </p>
            </div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, padding: "5px 12px 5px 10px", borderRadius: 999, background: badge.bg, color: badge.fg, marginTop: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: badge.dot, flexShrink: 0 }} />
            {badge.label}
          </span>
        </div>
      </div>

      {/* Facts card */}
      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: "6px 20px 4px", marginBottom: 14 }}>
        <div style={{ fontSize: 27, fontWeight: 700, letterSpacing: "-.02em", color: "#0c1d2e", padding: "14px 0 10px", borderBottom: "1px solid #f1f3f5" }}>{formatNaira(payment.amount)}</div>
        <FactRow label="Vendor account" value={`${payment.vendor.bankName} ••••${payment.vendor.nubanLast4}`} />
        {payment.costCenter && <FactRow label="Cost center" value={payment.costCenter} />}
        {payment.invoicePdfName && <FactRow label="Invoice PDF" value={payment.invoicePdfName} mono />}
        {payment.transactionReference && <FactRow label="Transaction ref" value={payment.transactionReference} mono />}
        {payment.settledAmount != null && (
          <FactRow label="Settled amount" value={
            <span style={{ color: payment.settledAmount === payment.amount ? "#0e7a5a" : "#dc4338" }}>
              {formatNaira(payment.settledAmount)}
            </span>
          } />
        )}
        <FactRow label="Created" value={new Date(payment.createdAt).toLocaleString("en-NG", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
      </div>

      {/* Processing */}
      {payment.status === "processing" && (
        <div style={{ background: "#e6f0fd", border: "1px solid #b5d0f8", borderRadius: 13, padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <span className="wt-spin" style={{ display: "inline-block", width: 18, height: 18, border: "2.5px solid rgba(29,93,164,.3)", borderTopColor: "#3b82f6", borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1d3d5c" }}>Dispatched to PSP</div>
            <div style={{ fontSize: 12, color: "#3b6fa0", marginTop: 3 }}>Awaiting settlement webhook… This page updates automatically.</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={async () => { setLoading(true); await retryDispatch(id); load(); setLoading(false); }} disabled={loading}
              style={{ fontSize: 12, fontWeight: 600, color: "#1d3d5c", background: "rgba(29,93,164,.1)", border: "1px solid #b5d0f8", borderRadius: 8, padding: "6px 12px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
              {loading ? "…" : "Retry"}
            </button>
            <button onClick={handleCancel} disabled={loading}
              style={{ fontSize: 12, fontWeight: 600, color: "#b3261e", background: "transparent", border: "1px solid #f1c5c1", borderRadius: 8, padding: "6px 12px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.5 : 1 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reconciled */}
      {payment.status === "reconciled" && (
        <div style={{ background: "#e6faf4", border: "1px solid #a8dfc9", borderRadius: 13, padding: "14px 18px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "#0e7a5a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#1a6b52" }}>Reconciled</div>
            <div style={{ fontSize: 12, color: "#2a8a68", marginTop: 3 }}>Settlement matched invoice within NIP charge tolerance. No action required.</div>
          </div>
        </div>
      )}

      {/* Exception */}
      {payment.status === "exception_queue" && (
        <div style={{ background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 13, padding: "16px 18px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#dc4338", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#a32820" }}>Exception: {payment.exceptionCategory?.replace(/_/g, " ")}</div>
              <div style={{ fontSize: 12, color: "#b3261e", marginTop: 3 }}>
                {payment.exceptionCategory === "PSP_FAILURE" && "The PSP returned a failure status. No funds left your account — you can retry or cancel."}
                {payment.exceptionCategory === "AMOUNT_MISMATCH" && `Settled amount (${formatNaira(payment.settledAmount ?? 0)}) differs from the invoice outside the NIP tolerance band. Cancel and re-raise if needed.`}
                {payment.exceptionCategory === "STATUS_UNKNOWN" && "No settlement confirmation received within 48 hours. Retry to re-dispatch or cancel."}
                {payment.exceptionCategory === "COMPLIANCE_REVIEW_TIMEOUT" && "Compliance review was not completed within the required window. Cancel and re-submit."}
              </div>
            </div>
          </div>
          {error && <div style={{ marginBottom: 10, padding: "9px 12px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 8, fontSize: 12.5, color: "#b3261e" }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            {(payment.exceptionCategory === "PSP_FAILURE" || payment.exceptionCategory === "STATUS_UNKNOWN") && isChecker && (
              <button onClick={async () => { setLoading(true); setError(""); const r = await retryException(id); if (r?.error) { setError(r.error); setLoading(false); } else { load(); setLoading(false); } }} disabled={loading}
                style={{ height: 36, padding: "0 14px", background: "#dc4338", color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
                {loading ? "…" : "Retry payment"}
              </button>
            )}
            <button onClick={handleCancel} disabled={loading}
              style={{ height: 36, padding: "0 14px", background: "transparent", color: "#b3261e", border: "1px solid #f1c5c1", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.6 : 1 }}>
              {loading ? "…" : "Cancel request"}
            </button>
          </div>
        </div>
      )}

      {/* Cancelled */}
      {payment.status === "cancelled" && payment.rejectionReason && (
        <div style={{ background: "#f5f6f8", border: "1px solid #e8eaed", borderRadius: 13, padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "#8a97a6", marginBottom: 6 }}>Rejection reason</div>
          <div style={{ fontSize: 13, color: "#3f4d5a" }}>{payment.rejectionReason}</div>
        </div>
      )}

      {/* Compliance review */}
      {payment.status === "compliance_review" && (
        <div style={{ background: "#fdeee2", border: "1px solid #f6cdb0", borderRadius: 13, padding: "16px 20px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9a4513", marginBottom: 4 }}>Compliance Review Required</div>
          <div style={{ fontSize: 12.5, color: "#8a4010", marginBottom: 14 }}>
            <strong>Trigger:</strong> {TRIGGER_LABELS[payment.complianceTrigger ?? ""] ?? payment.complianceTrigger}
          </div>
          {error && <div style={{ marginBottom: 12, padding: "9px 12px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 8, fontSize: 12.5, color: "#b3261e" }}>{error}</div>}
          {isChecker && !isMaker && !isComplianceResolver ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleCompliance("clear")} disabled={loading}
                style={{ flex: 1, height: 40, background: "#e07235", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
                {loading ? "…" : "Clear — proceed to approval"}
              </button>
              <button onClick={() => handleCompliance("block")} disabled={loading}
                style={{ flex: 1, height: 40, background: "#fff", color: "#b3261e", border: "1px solid #f1c5c1", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: loading ? 0.7 : 1 }}>
                Block payment
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "#8a4010" }}>
              {isMaker
                ? "You created this request and cannot action the compliance review."
                : "Awaiting Checker review."}
            </div>
          )}
        </div>
      )}

      {/* Checker approval panel */}
      {payment.status === "pending_approval" && isChecker && (
        <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: "20px 22px", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0c1d2e", marginBottom: 16 }}>Four-eyes approval</div>

          {error && <div style={{ marginBottom: 14, padding: "9px 12px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 8, fontSize: 12.5, color: "#b3261e" }}>{error}</div>}

          {canApprove ? (
            <>
              <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 12 }}>
                  4-digit approval PIN
                  <InfoTooltip content="Your PIN confirms this payment. It's recorded in the audit log with your name and timestamp. Double-check the details before entering it." wide />
                </label>
                <SegmentedPIN value={pin} onChange={setPin} />
                <div style={{ fontSize: 11.5, color: "#9aa6b2", marginTop: 10, textAlign: "center" }}>PIN is validated server-side — this approval is your digital signature.</div>
              </div>
              <button onClick={handleApprove} disabled={loading || pin.length !== 4}
                style={{ width: "100%", height: 46, background: "#0e7a5a", color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: (loading || pin.length !== 4) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (loading || pin.length !== 4) ? 0.5 : 1, marginBottom: 18 }}>
                {loading ? "Verifying PIN…" : "Approve & dispatch to PSP"}
              </button>
              <div style={{ paddingTop: 18, borderTop: "1px solid #f1f3f5" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 8 }}>Reject with reason</label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={2}
                  placeholder="Minimum 10 characters…"
                  style={{ width: "100%", border: "1px solid #dce1e6", borderRadius: 9, padding: "10px 13px", fontSize: 13, fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
                <button onClick={handleReject} disabled={loading || rejectReason.trim().length < 10}
                  style={{ marginTop: 8, padding: "8px 16px", background: "transparent", color: "#b3261e", border: "1px solid #f1c5c1", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: (loading || rejectReason.trim().length < 10) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (loading || rejectReason.trim().length < 10) ? 0.5 : 1 }}>
                  Reject payment
                </button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: "#6b7785", padding: "12px 14px", background: "#f5f6f8", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span>
                {isMaker ? "You created this request and cannot approve it (Maker-Checker rule)." :
                 isComplianceResolver ? "You cleared the compliance review for this payment and cannot also approve it (four-eyes rule)." :
                 "You do not have permission to approve this payment."}
              </span>
              {isMaker && (
                <button onClick={handleCancel} disabled={loading}
                  style={{ fontSize: 12, fontWeight: 600, color: "#b3261e", background: "transparent", border: "1px solid #f1c5c1", borderRadius: 8, padding: "6px 12px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0, opacity: loading ? 0.5 : 1 }}>
                  Cancel request
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {payment.status === "pending_approval" && !isChecker && (
        <div style={{ background: "#fcf7e6", border: "1px solid #e8d28a", borderRadius: 13, padding: "14px 18px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8a6510", marginBottom: 3 }}>Awaiting Checker approval</div>
              <div style={{ fontSize: 12, color: "#9a7820" }}>An Admin or Owner must review and approve this payment request.</div>
            </div>
            {isMaker && (
              <button onClick={handleCancel} disabled={loading}
                style={{ fontSize: 12, fontWeight: 600, color: "#b3261e", background: "transparent", border: "1px solid #f1c5c1", borderRadius: 8, padding: "6px 12px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0, opacity: loading ? 0.5 : 1 }}>
                Cancel request
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
