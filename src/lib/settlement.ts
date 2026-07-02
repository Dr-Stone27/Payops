import { prisma } from "./db";
import { getNipTolerance, formatNaira } from "./compliance";
import { log } from "./audit";

export interface SettlementInput {
  paymentId: string;
  businessId: string;
  transactionReference: string;
  settlementStatus: string; // "SUCCESS" | "FAILED"
  settledAmount: number;
  rawPayload: string;
}

export interface SettlementResult {
  ok: true;
  deduplicated?: boolean;
  outcome?: "reconciled" | "AMOUNT_MISMATCH" | "PSP_FAILURE" | "ORPHANED_SETTLEMENT" | "ignored";
}

// Simulated PSP dispatch, resolved through the same reconciliation path a
// real webhook uses. Awaited in-request — never fire-and-forget (Vercel
// kills post-response work; docs/retrospective.md §3).
// Demo levers: EXC- invoice prefix forces PSP failure; MIS- forces a
// settlement outside the NIP tolerance band (AMOUNT_MISMATCH).
export async function dispatchSimulatedSettlement(
  payment: { id: string; amount: number; invoiceNumber: string },
  businessId: string,
  alwaysSucceed = false
): Promise<SettlementResult> {
  const invoice = payment.invoiceNumber.toUpperCase();
  const forceFailure = !alwaysSucceed && invoice.startsWith("EXC-");
  const forceMismatch = invoice.startsWith("MIS-");
  const success = forceFailure ? false : alwaysSucceed || forceMismatch || Math.random() > 0.2;

  const settledAmount = !success
    ? 0
    : forceMismatch
      ? payment.amount + getNipTolerance(payment.amount) + 100
      : payment.amount;

  const transactionReference = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const settlementStatus = success ? "SUCCESS" : "FAILED";

  return reconcileSettlement({
    paymentId: payment.id,
    businessId,
    transactionReference,
    settlementStatus,
    settledAmount,
    rawPayload: JSON.stringify({
      paymentId: payment.id,
      businessId,
      transactionReference,
      settlementStatus,
      settledAmount,
      source: "simulated-psp",
    }),
  });
}

// Single reconciliation path for both the external PSP webhook and the
// in-request simulated dispatch. Must stay synchronous-awaitable: Vercel
// freezes the function once the response returns, so no caller may
// fire-and-forget this (see docs/retrospective.md §3).
export async function reconcileSettlement(input: SettlementInput): Promise<SettlementResult> {
  const { paymentId, businessId, transactionReference, settlementStatus, settledAmount, rawPayload } = input;

  // Deduplication — transactionReference is the dedup key
  const existing = await prisma.webhookEvent.findUnique({
    where: { transactionReference },
  });
  if (existing) {
    return { ok: true, deduplicated: true };
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId },
  });

  if (!payment || payment.status !== "processing") {
    // Orphaned settlement — payment was cancelled or already reconciled
    if (payment && ["cancelled", "reconciled"].includes(payment.status)) {
      await prisma.webhookEvent.create({
        data: {
          paymentId,
          transactionReference,
          settlementStatus,
          settledAmount,
          rawPayload,
        },
      });
      await prisma.paymentRequest.update({
        where: { id: paymentId },
        data: { status: "exception_queue", exceptionCategory: "ORPHANED_SETTLEMENT", transactionReference },
      });
      return { ok: true, outcome: "ORPHANED_SETTLEMENT" };
    }
    return { ok: true, outcome: "ignored" };
  }

  await prisma.webhookEvent.create({
    data: {
      paymentId,
      transactionReference,
      settlementStatus,
      settledAmount,
      rawPayload,
    },
  });

  if (settlementStatus === "SUCCESS") {
    const tolerance = getNipTolerance(payment.amount);
    const variance = Math.abs(settledAmount - payment.amount);

    if (variance <= tolerance) {
      await prisma.paymentRequest.update({
        where: { id: paymentId },
        data: {
          status: "reconciled",
          transactionReference,
          settledAmount,
          version: { increment: 1 },
        },
      });
      await log({
        businessId,
        paymentId,
        action: "PAYMENT_RECONCILED",
        detail: `Settled ${formatNaira(settledAmount)} · variance ${formatNaira(variance)} (within NIP tolerance).`,
        outcome: "reconciled",
      });
      return { ok: true, outcome: "reconciled" };
    }

    await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: {
        status: "exception_queue",
        exceptionCategory: "AMOUNT_MISMATCH",
        transactionReference,
        settledAmount,
      },
    });
    await log({
      businessId,
      paymentId,
      action: "RECONCILIATION_FAILED",
      detail: `Settled ${formatNaira(settledAmount)} · expected ${formatNaira(payment.amount)} · variance ${formatNaira(variance)} (outside NIP tolerance).`,
      outcome: "exception_queue",
    });
    return { ok: true, outcome: "AMOUNT_MISMATCH" };
  }

  await prisma.paymentRequest.update({
    where: { id: paymentId },
    data: {
      status: "exception_queue",
      exceptionCategory: "PSP_FAILURE",
      transactionReference,
    },
  });
  await log({
    businessId,
    paymentId,
    action: "PSP_FAILURE",
    detail: `PSP returned status: ${settlementStatus}`,
    outcome: "exception_queue",
  });
  return { ok: true, outcome: "PSP_FAILURE" };
}
