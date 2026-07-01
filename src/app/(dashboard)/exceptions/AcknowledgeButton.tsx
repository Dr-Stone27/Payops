"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeException } from "@/actions/payments";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

export default function AcknowledgeButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAcknowledge() {
    setLoading(true);
    const result = await acknowledgeException(paymentId);
    if (result?.error) {
      toast(result.error, "error");
    } else {
      toast("Exception acknowledged and logged to the audit trail.");
      router.refresh();
    }
    setOpen(false);
    setLoading(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="wt-btn"
        style={{ height: 36, padding: "0 14px", border: "1px solid #a8dfc9", borderRadius: 8, background: "#e6faf4", color: "#1a6b52", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center" }}>
        Acknowledge
      </button>
      <ConfirmDialog
        open={open}
        title="Mark this exception as resolved?"
        body="Acknowledging records your review in the audit log and removes the item from the active queue. The payment record itself is unchanged."
        confirmLabel="Acknowledge"
        loading={loading}
        onConfirm={handleAcknowledge}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
