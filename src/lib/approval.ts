import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { dispatchSimulatedSettlement } from "./settlement";
import { log } from "./audit";

interface SessionInfo {
  userId: string;
  businessId: string;
  role: string;
}

export type ApprovalResult =
  | { ok: true; paymentId: string; status: "reconciled" | "exception_queue"; outcome?: string }
  | { ok: false; httpStatus: number; error: string };

// The single approval sequence, shared by the approvePayment server action
// and the REST route so the controls cannot drift:
// role → PIN format → PIN set → lockout → tenant-scoped fetch → state guard
// → four-eyes (maker + compliance resolver) → PIN verify with attempt
// tracking → version-checked transition → audit → awaited dispatch.
export async function executeApproval(session: SessionInfo, paymentId: string, pin: string): Promise<ApprovalResult> {
  if (!["owner", "admin"].includes(session.role)) {
    return { ok: false, httpStatus: 403, error: "Only Checkers (Admin or Owner) can approve payments." };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { ok: false, httpStatus: 400, error: "PIN must be 4 digits." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.pinHash) {
    return { ok: false, httpStatus: 403, error: "You must set up a PIN before approving payments." };
  }

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const mins = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, httpStatus: 403, error: `PIN locked. Try again in ${mins} minute(s).` };
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId },
  });
  if (!payment) return { ok: false, httpStatus: 404, error: "Payment not found." };
  if (payment.status !== "pending_approval") {
    return { ok: false, httpStatus: 409, error: "This payment is not awaiting approval." };
  }

  // Four-eyes: Maker cannot approve own request
  if (payment.makerId === session.userId) {
    return { ok: false, httpStatus: 403, error: "You cannot approve a payment you created." };
  }

  // Four-eyes: Compliance reviewer cannot also approve
  if (payment.complianceReviewResolvedBy === session.userId) {
    return { ok: false, httpStatus: 403, error: "The compliance reviewer cannot also approve this payment." };
  }

  // PIN verification with attempt tracking and 30-minute lockout
  const pinValid = await bcrypt.compare(pin, user.pinHash);
  if (!pinValid) {
    const attempts = user.pinFailedAttempts + 1;
    const lockout = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: session.userId },
      data: { pinFailedAttempts: attempts, pinLockedUntil: lockout },
    });
    const remaining = 5 - attempts;
    if (remaining <= 0) {
      return { ok: false, httpStatus: 403, error: "Incorrect PIN. Your PIN has been locked for 30 minutes." };
    }
    return { ok: false, httpStatus: 403, error: `Incorrect PIN. ${remaining} attempt(s) remaining.` };
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
    return { ok: false, httpStatus: 409, error: "Concurrent conflict: this payment was already actioned. Please reload." };
  }

  await log({
    businessId: session.businessId,
    userId: session.userId,
    paymentId,
    action: "PAYMENT_APPROVED",
    detail: "PIN verified. Dispatching to PSP.",
    outcome: "processing",
  });

  // Awaited in-request — fire-and-forget dispatch silently dies on Vercel
  // (docs/retrospective.md §3).
  const result = await dispatchSimulatedSettlement(payment, session.businessId);

  return {
    ok: true,
    paymentId,
    status: result.outcome === "reconciled" ? "reconciled" : "exception_queue",
    outcome: result.outcome,
  };
}
