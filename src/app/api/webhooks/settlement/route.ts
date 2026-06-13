import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import { getNipTolerance } from "@/lib/compliance";
import { log } from "@/lib/audit";

const PSP_SECRET = process.env.PSP_WEBHOOK_SECRET || "psp-webhook-dev-secret";

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

  // Deduplication — transactionReference is the dedup key
  const existing = await prisma.webhookEvent.findUnique({
    where: { transactionReference },
  });
  if (existing) {
    return NextResponse.json({ ok: true, deduplicated: true });
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
          rawPayload: body,
        },
      });
      await prisma.paymentRequest.update({
        where: { id: paymentId },
        data: { status: "exception_queue", exceptionCategory: "ORPHANED_SETTLEMENT", transactionReference },
      });
    }
    return NextResponse.json({ ok: true });
  }

  await prisma.webhookEvent.create({
    data: {
      paymentId,
      transactionReference,
      settlementStatus,
      settledAmount,
      rawPayload: body,
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
        detail: `Settled: ${settledAmount} kobo. Variance: ${variance} kobo (within tolerance).`,
        outcome: "reconciled",
      });
    } else {
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
        detail: `Amount mismatch: settled ${settledAmount}, expected ${payment.amount}. Variance: ${variance} kobo.`,
        outcome: "exception_queue",
      });
    }
  } else {
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
  }

  return NextResponse.json({ ok: true });
}
