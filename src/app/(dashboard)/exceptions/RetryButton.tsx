"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { retryException } from "@/actions/payments";

export default function RetryButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRetry() {
    setLoading(true);
    setError("");
    const result = await retryException(paymentId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button onClick={handleRetry} disabled={loading}
        style={{ height: 36, padding: "0 14px", border: "none", borderRadius: 8, background: "#fdeceb", color: "#b3261e", fontSize: 12.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", opacity: loading ? 0.6 : 1 }}>
        {loading ? "Retrying…" : "Retry payment"}
      </button>
      {error && <span style={{ fontSize: 11.5, color: "#b3261e" }}>{error}</span>}
    </span>
  );
}
