"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { retryException } from "@/actions/payments";
import { useToast } from "@/components/ui/Toast";

export default function RetryButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleRetry() {
    setLoading(true);
    const result = await retryException(paymentId);
    if (result?.error) {
      toast(result.error, "error");
      setLoading(false);
    } else {
      toast("Retry dispatched — the payment has settled and reconciled.");
      router.refresh();
    }
  }

  return (
    <button onClick={handleRetry} disabled={loading} className="wt-btn"
      style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 8, background: "#fdeceb", color: "#b3261e", fontSize: 12.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", opacity: loading ? 0.6 : 1 }}>
      {loading ? "Retrying…" : "Retry payment"}
    </button>
  );
}
