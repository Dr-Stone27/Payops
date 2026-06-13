"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { approveVendor } from "@/actions/vendors";

interface Vendor {
  id: string;
  legalName: string;
  cacNumber: string;
  nubanLast4: string;
  bankName: string;
  cacRegisteredName: string;
  nubanAccountName: string;
  kybStatus: string;
  jaroWinklerScore: number | null;
  manualApprovalJustification: string | null;
  manuallyApprovedAt: string | null;
}

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [justification, setJustification] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/vendors/${id}`).then(r => r.json()).then(setVendor);
  }, [id]);

  async function handleApprove() {
    setLoading(true);
    setError("");
    const result = await approveVendor(id, justification);
    if (result?.error) { setError(result.error); setLoading(false); }
    else router.push("/vendors");
  }

  if (!vendor) return <div className="p-6 text-sm text-gray-400">Loading…</div>;

  const scoreColor = (vendor.jaroWinklerScore ?? 0) >= 0.85
    ? "text-emerald-700 bg-emerald-50"
    : (vendor.jaroWinklerScore ?? 0) >= 0.70
    ? "text-yellow-800 bg-yellow-50"
    : "text-red-700 bg-red-50";

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/vendors" className="text-sm text-gray-500 hover:text-gray-700">← Back to vendors</Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">{vendor.legalName}</h1>
        <p className="text-sm text-gray-500 mt-0.5">KYB Review</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">CAC Registered Name</p>
            <p className="font-medium text-gray-900">{vendor.cacRegisteredName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">NUBAN Account Name</p>
            <p className="font-medium text-gray-900">{vendor.nubanAccountName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Bank</p>
            <p className="font-medium text-gray-900">{vendor.bankName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Account</p>
            <p className="font-mono text-gray-900">••••••{vendor.nubanLast4}</p>
          </div>
        </div>

        {vendor.jaroWinklerScore != null && (
          <div className={`flex items-center justify-between p-3 rounded-lg ${scoreColor}`}>
            <div>
              <p className="text-xs font-semibold">Jaro-Winkler Match Score</p>
              <p className="text-xs mt-0.5">
                {vendor.jaroWinklerScore >= 0.85 ? "Strong match — auto-approved" :
                 vendor.jaroWinklerScore >= 0.70 ? "Partial match — requires manual review" :
                 "Weak match — Checker must review carefully"}
              </p>
            </div>
            <span className="text-xl font-bold">{(vendor.jaroWinklerScore * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>

      {vendor.kybStatus === "needs_review" && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <p className="text-sm font-medium text-gray-900 mb-2">Manual approval</p>
          <p className="text-xs text-gray-500 mb-3">
            Provide a written justification before approving. This is stored permanently on the vendor record.
          </p>
          <textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            placeholder="e.g. CAC name and NUBAN name differ by legal suffix only (LTD vs LIMITED). Verified with the vendor directly and confirmed same entity. Director ID cross-checked."
          />
          <p className={`text-xs mt-1 ${justification.length < 20 ? "text-red-500" : "text-gray-400"}`}>
            {justification.length}/20 characters minimum
          </p>
          <button
            onClick={handleApprove}
            disabled={loading || justification.trim().length < 20}
            className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Approving…" : "Approve vendor"}
          </button>
        </div>
      )}

      {vendor.kybStatus === "approved" && vendor.manualApprovalJustification && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Manual approval justification (read-only)</p>
          <p className="text-sm text-gray-700">{vendor.manualApprovalJustification}</p>
        </div>
      )}
    </div>
  );
}
