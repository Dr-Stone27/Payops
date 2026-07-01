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

  if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
    return { error: "Amount must be greater than zero." };
  }

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

  const forceException = payment.invoiceNumber.toUpperCase().startsWith("EXC-");
  await settleDirectly(paymentId, payment.amount, session.businessId, false, forceException);

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

  if (payment.makerId === session.userId) {
    return { error: "You cannot action a compliance review for a payment you created." };
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

export async function retryDispatch(paymentId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId, status: "processing" },
  });
  if (!payment) return { error: "Payment not found or not in processing state." };

  await settleDirectly(paymentId, payment.amount, session.businessId, true);
  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

export async function retryException(paymentId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (!["owner", "admin"].includes(session.role)) {
    return { error: "Only Checkers can retry failed payments." };
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId, status: "exception_queue" },
  });
  if (!payment) return { error: "Payment not found or not in exception queue." };
  if (payment.exceptionCategory !== "PSP_FAILURE" && payment.exceptionCategory !== "STATUS_UNKNOWN") {
    return { error: "Only PSP failures and status-unknown payments can be retried." };
  }

  await settleDirectly(paymentId, payment.amount, session.businessId, true);
  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

export async function acknowledgeException(paymentId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (!["owner", "admin"].includes(session.role)) {
    return { error: "Only Checkers can acknowledge exceptions." };
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId, status: "exception_queue" },
  });
  if (!payment) return { error: "Payment not found or not in exception queue." };
  if (payment.acknowledgedAt) return { error: "This exception has already been acknowledged." };

  await prisma.paymentRequest.update({
    where: { id: paymentId },
    data: { acknowledgedAt: new Date(), acknowledgedBy: session.userId },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    paymentId,
    action: "EXCEPTION_ACKNOWLEDGED",
    detail: `Exception (${payment.exceptionCategory ?? "UNKNOWN"}) reviewed and marked resolved.`,
    outcome: "acknowledged",
  });

  revalidatePath("/exceptions");
  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

export async function cancelPayment(paymentId: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId },
  });
  if (!payment) return { error: "Payment not found." };

  const isMaker = payment.makerId === session.userId;
  const isOwner = session.role === "owner";
  const cancellableStatuses = ["pending_approval", "compliance_review", "processing"];

  if (!cancellableStatuses.includes(payment.status)) {
    return { error: "This payment cannot be cancelled in its current state." };
  }
  if (!isMaker && !isOwner) {
    return { error: "Only the requestor or an owner can cancel a payment." };
  }

  await prisma.paymentRequest.update({
    where: { id: paymentId },
    data: { status: "cancelled", rejectionReason: "Cancelled by requestor." },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    paymentId,
    action: "PAYMENT_CANCELLED",
    outcome: "cancelled",
  });

  revalidatePath(`/payments/${paymentId}`);
  return { success: true };
}

async function settleDirectly(paymentId: string, amountKobo: number, businessId: string, alwaysSucceed = false, alwaysFail = false) {
  const success = alwaysFail ? false : alwaysSucceed || Math.random() > 0.2;
  const txRef = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  await prisma.paymentRequest.update({
    where: { id: paymentId },
    data: {
      status: success ? "reconciled" : "exception_queue",
      transactionReference: txRef,
      settledAmount: success ? amountKobo : 0,
      version: { increment: 1 },
      ...(success ? {} : { exceptionCategory: "PSP_FAILURE" }),
    },
  });

  await log({
    businessId,
    paymentId,
    action: success ? "PAYMENT_RECONCILED" : "PSP_FAILURE",
    detail: `${success ? "Settled" : "PSP returned failure"}. TxRef: ${txRef}.`,
    outcome: success ? "reconciled" : "exception_queue",
  });
}
