"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { detectComplianceTrigger, getNipTolerance } from "@/lib/compliance";
import { log } from "@/lib/audit";
import bcrypt from "bcryptjs";

const PSP_LIMIT_KOBO = 1_000_000_000; // ₦10,000,000

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function createPayment(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const vendorId = String(formData.get("vendorId") ?? "");
  const invoiceNumber = String(formData.get("invoiceNumber") ?? "").trim();
  const amountNaira = parseFloat(String(formData.get("amount") ?? "0"));
  const costCenter = String(formData.get("costCenter") ?? "").trim();
  const invoicePdfName = String(formData.get("invoicePdfName") ?? "").trim();

  if (!vendorId || !invoiceNumber || !amountNaira || !invoicePdfName) {
    return { error: "All fields including invoice PDF are required." };
  }

  const amountKobo = Math.round(amountNaira * 100);

  if (amountKobo > PSP_LIMIT_KOBO * 5) {
    return { error: `TRANCHE_LIMIT_EXCEEDED: Maximum payment is ₦50,000,000. Please split into separate requests.` };
  }

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, businessId: session.businessId },
  });
  if (!vendor) return { error: "Vendor not found." };
  if (vendor.kybStatus !== "approved") {
    return { error: "Cannot create a payment request against a vendor in Needs Review status." };
  }

  const trigger = await detectComplianceTrigger(
    session.businessId,
    vendorId,
    invoiceNumber,
    amountKobo,
    vendor.jaroWinklerScore
  );

  const status = trigger ? "compliance_review" : "pending_approval";

  const payment = await prisma.paymentRequest.create({
    data: {
      id: cuid(),
      businessId: session.businessId,
      vendorId,
      makerId: session.userId,
      invoiceNumber,
      amount: amountKobo,
      costCenter: costCenter || null,
      invoicePdfName: invoicePdfName || null,
      status,
      complianceTrigger: trigger,
    },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    paymentId: payment.id,
    action: "PAYMENT_CREATED",
    detail: trigger ? `Compliance trigger: ${trigger}` : "Routed to pending approval",
    outcome: status,
  });

  revalidatePath("/payments");
  redirect(`/payments/${payment.id}`);
}

export async function approvePayment(paymentId: string, pin: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (!["owner", "admin"].includes(session.role)) {
    return { error: "Only Checkers (Admin or Owner) can approve payments." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.pinHash) return { error: "You must set up a PIN before approving payments." };

  // PIN lockout check
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const mins = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
    return { error: `PIN locked. Try again in ${mins} minute(s).` };
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId },
    include: { vendor: true },
  });
  if (!payment) return { error: "Payment not found." };
  if (payment.status !== "pending_approval") {
    return { error: "This payment is not awaiting approval." };
  }

  // Four-eyes: Maker cannot approve own request
  if (payment.makerId === session.userId) {
    return { error: "You cannot approve a payment you created." };
  }

  // Four-eyes: Compliance reviewer cannot also approve
  if (payment.complianceReviewResolvedBy === session.userId) {
    return { error: "The compliance reviewer cannot also approve this payment." };
  }

  // PIN verification
  const pinValid = await bcrypt.compare(pin, user.pinHash);
  if (!pinValid) {
    const attempts = user.pinFailedAttempts + 1;
    const lockout = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: session.userId },
      data: { pinFailedAttempts: attempts, pinLockedUntil: lockout },
    });
    const remaining = 5 - attempts;
    if (remaining <= 0) return { error: "Incorrect PIN. Your PIN has been locked for 30 minutes." };
    return { error: `Incorrect PIN. ${remaining} attempt(s) remaining.` };
  }

  // Reset PIN attempts and atomically update payment status with version check
  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.userId },
      data: { pinFailedAttempts: 0, pinLockedUntil: null },
    });

    const result = await tx.paymentRequest.updateMany({
      where: { id: paymentId, version: payment.version, status: "pending_approval" },
      data: { status: "processing", version: { increment: 1 } },
    });

    return result.count;
  });

  if (updated === 0) {
    return { error: "Concurrent conflict: this payment was already actioned. Please reload." };
  }

  await log({
    businessId: session.businessId,
    userId: session.userId,
    paymentId,
    action: "PAYMENT_APPROVED",
    detail: `PIN verified. Dispatching to PSP.`,
    outcome: "processing",
  });

  // Await PSP dispatch — fire-and-forget doesn't survive Vercel serverless lifecycle
  await dispatchToPsp(paymentId, payment.amount, session.businessId).catch(console.error);

  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

export async function rejectPayment(paymentId: string, reason: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (!["owner", "admin"].includes(session.role)) {
    return { error: "Only Checkers can reject payments." };
  }
  if (!reason || reason.trim().length < 10) {
    return { error: "Rejection reason must be at least 10 characters." };
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId },
  });
  if (!payment || payment.status !== "pending_approval") {
    return { error: "Payment not found or not awaiting approval." };
  }

  await prisma.paymentRequest.update({
    where: { id: paymentId },
    data: { status: "cancelled", rejectionReason: reason.trim() },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    paymentId,
    action: "PAYMENT_REJECTED",
    detail: reason.trim(),
    outcome: "cancelled",
  });

  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

export async function clearComplianceReview(paymentId: string, decision: "clear" | "block") {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (!["owner", "admin"].includes(session.role)) {
    return { error: "Only Checkers can action compliance reviews." };
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId },
  });
  if (!payment || payment.status !== "compliance_review") {
    return { error: "Payment is not in compliance review." };
  }

  if (decision === "clear") {
    await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: {
        status: "pending_approval",
        complianceReviewResolvedBy: session.userId,
      },
    });
    await log({
      businessId: session.businessId,
      userId: session.userId,
      paymentId,
      action: "COMPLIANCE_CLEARED",
      outcome: "pending_approval",
    });
  } else {
    await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: {
        status: "exception_queue",
        exceptionCategory: "COMPLIANCE_REVIEW_TIMEOUT",
        complianceReviewResolvedBy: session.userId,
      },
    });
    await log({
      businessId: session.businessId,
      userId: session.userId,
      paymentId,
      action: "COMPLIANCE_BLOCKED",
      outcome: "exception_queue",
    });
  }

  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

async function dispatchToPsp(paymentId: string, amountKobo: number, businessId: string) {

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const txRef = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // Simulate: 80% success, 20% failure
  const outcome = Math.random() > 0.2 ? "SUCCESS" : "FAILED";
  const settledAmount = outcome === "SUCCESS" ? amountKobo : 0;

  const payload = {
    paymentId,
    transactionReference: txRef,
    settlementStatus: outcome,
    settledAmount,
    bankReference: `NIBSS-${Date.now()}`,
    businessId,
  };

  const secret = process.env.PSP_WEBHOOK_SECRET || "psp-webhook-dev-secret";
  const body = JSON.stringify(payload);
  const { createHmac } = await import("crypto");
  const sig = createHmac("sha256", secret).update(body).digest("hex");

  await fetch(`${baseUrl}/api/webhooks/settlement`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PSP-Signature": sig,
    },
    body,
  });
}
