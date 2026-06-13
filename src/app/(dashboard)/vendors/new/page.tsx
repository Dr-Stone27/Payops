"use client";

import { useState } from "react";
import Link from "next/link";
import { addVendor } from "@/actions/vendors";

const BANKS = [
  "Access Bank", "First Bank", "GT Bank", "UBA", "Zenith Bank",
  "Stanbic IBTC", "Fidelity Bank", "Union Bank", "Sterling Bank", "Wema Bank",
];

export default function NewVendorPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await addVendor(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/vendors" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to vendors
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">Add vendor</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          The system will verify the vendor&apos;s CAC registration and NUBAN account name automatically.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          <strong>Demo tip:</strong> Use NUBAN ending in <strong>1234</strong> for an approved match,
          <strong> 5678</strong> for partial match (Needs Review), <strong>9999</strong> for a mismatch.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legal Business Name <span className="text-gray-400">(as registered with CAC)</span>
            </label>
            <input
              name="legalName"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Apex Freight Solutions Ltd"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CAC Registration Number</label>
            <input
              name="cacNumber"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="RC-2345678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <select
              name="bankName"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Select bank</option>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NUBAN Account Number</label>
            <input
              name="nuban"
              required
              maxLength={10}
              pattern="\d{10}"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="0123451234"
            />
            <p className="text-xs text-gray-400 mt-1">10-digit NUBAN — last 4 digits visible in the system</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Verifying with CAC & NUBAN APIs…" : "Add vendor"}
          </button>
        </form>
      </div>
    </div>
  );
}
