"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createPayment } from "@/actions/payments";

interface Vendor { id: string; legalName: string; kybStatus: string; nubanLast4: string; bankName: string; }

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
  const isHighValue = parseFloat(amountNaira || "0") >= 5_000_000;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    // Use filename as stand-in for PDF (actual upload out of scope for demo)
    const fileInput = e.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput?.files?.[0]) {
      fd.set("invoicePdfName", fileInput.files[0].name);
    }
    const result = await createPayment(fd);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/payments" className="text-sm text-gray-500 hover:text-gray-700">← Back to payments</Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">New payment request</h1>
        <p className="text-sm text-gray-500 mt-0.5">Must be backed by an invoice. Checker approval required before execution.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {isHighValue && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800">
            ⚖️ <strong>Compliance review will be triggered.</strong> Payments ≥ ₦5,000,000 require compliance review before reaching a Checker.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            {approvedVendors.length === 0 ? (
              <p className="text-sm text-red-500">No approved vendors yet. <Link href="/vendors/new" className="underline">Add one first.</Link></p>
            ) : (
              <select name="vendorId" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="">Select a vendor</option>
                {approvedVendors.map(v => (
                  <option key={v.id} value={v.id}>{v.legalName} — {v.bankName} ••••{v.nubanLast4}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
            <input name="invoiceNumber" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="INV-2026-001" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (₦) {isHighValue && <span className="text-orange-600 text-xs">— High value</span>}
            </label>
            <input
              name="amount"
              type="number"
              min="1"
              step="0.01"
              required
              value={amountNaira}
              onChange={e => setAmountNaira(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="500000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost Center</label>
            <input name="costCenter" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Operations / Logistics" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice PDF <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf"
              required
              onChange={e => setHasFile(!!e.target.files?.[0])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 file:mr-3 file:text-xs file:bg-gray-100 file:border-0 file:rounded file:px-2 file:py-1"
            />
            <p className="text-xs text-gray-400 mt-1">Checker will verify the amount on this PDF against the amount entered above</p>
          </div>

          <button
            type="submit"
            disabled={loading || approvedVendors.length === 0}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Submitting…" : "Submit payment request"}
          </button>
        </form>
      </div>
    </div>
  );
}
