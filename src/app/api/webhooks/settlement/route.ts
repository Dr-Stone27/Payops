import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { reconcileSettlement } from "@/lib/settlement";

const PSP_SECRET = process.env.PSP_WEBHOOK_SECRET || "psp-webhook-dev-secret";

// External PSP integration seam: a real PSP POSTs signed settlement
// confirmations here. The reconciliation itself lives in
// src/lib/settlement.ts, shared with the in-request simulated dispatch.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("X-PSP-Signature") ?? "";
  const expected = createHmac("sha256", PSP_SECRET).update(body).digest("hex");

  if (sig !== expected) {
    console.warn("WEBHOOK_REJECTED: Invalid HMAC signature from", req.headers.get("x-forwarded-for"));
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const { paymentId, transactionReference, settlementStatus, settledAmount, businessId } = payload;

  const result = await reconcileSettlement({
    paymentId,
    businessId,
    transactionReference,
    settlementStatus,
    settledAmount,
    rawPayload: body,
  });

  return NextResponse.json(result.deduplicated ? { ok: true, deduplicated: true } : { ok: true });
}
