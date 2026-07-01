"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeException } from "@/actions/payments";

export default function AcknowledgeButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAcknowledge() {
    setLoading(true);
    setError("");
    const result = await acknowledgeException(paymentId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.refresh();
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <button onClick={handleAcknowledge} disabled={loading}
        style={{ height: 36, padding: "0 14px", border: "1px solid #a8dfc9", borderRadius: 8, background: "#e6faf4", color: "#1a6b52", fontSize: 12.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", opacity: loading ? 0.6 : 1 }}>
        {loading ? "Acknowledging…" : "Acknowledge"}
      </button>
      {error && <span style={{ fontSize: 11.5, color: "#b3261e" }}>{error}</span>}
    </span>
  );
}
