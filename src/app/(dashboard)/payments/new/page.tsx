"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createPayment } from "@/actions/payments";
import { InfoTooltip } from "@/components/Tooltip";

interface Vendor { id: string; legalName: string; kybStatus: string; nubanLast4: string; bankName: string; }

const INPUT: React.CSSProperties = { width: "100%", height: 42, border: "1px solid #dce1e6", borderRadius: 9, padding: "0 13px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#0c1d2e" };
const LABEL: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, color: "#3f4d5a", marginBottom: 6 };

export default function NewPaymentPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [amountNaira, setAmountNaira] = useState("");
  const [hasFile, setHasFile] = useState(false);

  useEffect(() => {
    fetch("/api/vendors").then(r => r.json()).then(setVendors);
  }, []);

  const approvedVendors = vendors.filter(v => v.kybStatus === "approved");
  const pendingVendors = vendors.filter(v => v.kybStatus !== "approved");
  const isHighValue = parseFloat(amountNaira || "0") >= 5_000_000;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const fileInput = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput?.files?.[0]) fd.set("invoicePdfName", fileInput.files[0].name);
    const result = await createPayment(fd);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={{ padding: "30px 36px 80px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <Link href="/payments" style={{ fontSize: 12.5, color: "#8a97a6", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Payments
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "10px 0 4px", letterSpacing: "-.02em", color: "#0c1d2e" }}>New payment request</h1>
        <p style={{ fontSize: 13, color: "#6b7785", margin: 0 }}>Must be backed by an invoice. Checker approval required before execution.</p>
      </div>

      {isHighValue && (
        <div style={{ marginBottom: 16, padding: "11px 14px", background: "#fdeee2", border: "1px solid #f6cdb0", borderRadius: 10, fontSize: 12.5, color: "#9a4513", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
          <div><strong>Compliance review will be triggered.</strong> Payments ≥ ₦5,000,000 require compliance review before reaching a Checker.</div>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #e8eaed", borderRadius: 13, padding: 28, boxShadow: "0 1px 4px rgba(12,29,46,.06)" }}>
        {error && (
          <div style={{ marginBottom: 16, padding: "10px 13px", background: "#fdeceb", border: "1px solid #f1c5c1", borderRadius: 9, fontSize: 12.5, color: "#b3261e" }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 6 }}>
              Vendor
              <InfoTooltip content="Only verified vendors appear here. If you can't find your vendor, they may still be in review — check the Vendors tab for their status." />
            </label>
            {approvedVendors.length === 0 ? (
              <div style={{ fontSize: 12.5, padding: "10px 13px", borderRadius: 9, ...(pendingVendors.length > 0
                ? { color: "#8a6510", background: "#fcf7e6", border: "1px solid #e8d28a" }
                : { color: "#b3261e", background: "#fdeceb", border: "1px solid #f1c5c1" }) }}>
                {pendingVendors.length > 0
                  ? <><strong>{pendingVendors.length} vendor{pendingVendors.length > 1 ? "s" : ""} pending KYB review.</strong> An Owner must approve them in the <Link href="/vendors" style={{ color: "#8a6510", fontWeight: 600, textDecoration: "underline" }}>Vendors tab</Link> before they can receive payments.</>
                  : <>No approved vendors yet. <Link href="/vendors/new" style={{ color: "#b3261e", fontWeight: 600, textDecoration: "underline" }}>Add one first.</Link></>
                }
              </div>
            ) : (
              <select name="vendorId" required style={{ ...INPUT, appearance: "none" }}>
                <option value="">Select a vendor</option>
                {approvedVendors.map(v => (
                  <option key={v.id} value={v.id}>{v.legalName} — {v.bankName} ••••{v.nubanLast4}</option>
                ))}
              </select>
            )}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 6 }}>
              Invoice Number
              <InfoTooltip content="We use this to detect duplicate payments. If a request with this invoice number already exists for this vendor, we'll flag it before it reaches your approver." />
            </label>
            <input name="invoiceNumber" required placeholder="INV-2026-001" style={{ ...INPUT, fontFamily: "var(--font-mono)" }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 8 }}>
              Amount (₦)
              {isHighValue && <span style={{ fontSize: 10.5, fontWeight: 600, color: "#9a4513", background: "#fdeee2", borderRadius: 999, padding: "2px 8px" }}>High value</span>}
            </label>
            <input name="amount" type="number" min="1" step="0.01" required value={amountNaira}
              onChange={e => setAmountNaira(e.target.value)} placeholder="500000" style={INPUT} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 6 }}>
              Cost Center
              <InfoTooltip content="Tag this payment to a department or project. Useful for month-end reporting and audit trail filtering." />
            </label>
            <input name="costCenter" placeholder="Operations / Logistics" style={INPUT} />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ ...LABEL, display: "flex", alignItems: "center", gap: 6 }}>
              Invoice PDF <span style={{ color: "#dc4338" }}>*</span>
              <InfoTooltip content="Upload the vendor's invoice. Your approver will see this alongside the payment amount to confirm everything matches before approving." />
            </label>
            <div style={{ border: "1px solid #dce1e6", borderRadius: 9, padding: "10px 13px", background: "#f8f9fb" }}>
              <input type="file" accept=".pdf" required onChange={e => setHasFile(!!e.target.files?.[0])}
                style={{ fontSize: 12.5, color: "#6b7785", width: "100%" }} />
            </div>
            {hasFile && <div style={{ fontSize: 11.5, color: "#0e7a5a", marginTop: 5, fontWeight: 500 }}>File selected</div>}
          </div>

          <button type="submit" disabled={loading || approvedVendors.length === 0}
            style={{ width: "100%", height: 44, background: (loading || approvedVendors.length === 0) ? "#5aad8e" : "#0e7a5a", color: "#fff", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: (loading || approvedVendors.length === 0) ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: (loading || approvedVendors.length === 0) ? 0.7 : 1 }}>
            {loading ? "Submitting…" : "Submit payment request"}
          </button>
        </form>
      </div>
    </div>
  );
}
