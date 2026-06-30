import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!["owner", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Only Checkers (Admin or Owner) can approve payments." }, { status: 403 });
  }

  const { id: paymentId } = await params;
  const body = await req.json().catch(() => null);
  const pin = String(body?.pin ?? "");

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be 4 digits." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.pinHash) {
    return NextResponse.json({ error: "You must set up a PIN before approving payments." }, { status: 403 });
  }

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const mins = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
    return NextResponse.json({ error: `PIN locked. Try again in ${mins} minute(s).` }, { status: 403 });
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId },
    include: { vendor: true },
  });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status !== "pending_approval") {
    return NextResponse.json({ error: "This payment is not awaiting approval." }, { status: 409 });
  }
  if (payment.makerId === session.userId) {
    return NextResponse.json({ error: "You cannot approve a payment you created." }, { status: 403 });
  }
  if (payment.complianceReviewResolvedBy === session.userId) {
    return NextResponse.json({ error: "The compliance reviewer cannot also approve this payment." }, { status: 403 });
  }

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
      return NextResponse.json({ error: "Incorrect PIN. Your PIN has been locked for 30 minutes." }, { status: 403 });
    }
    return NextResponse.json({ error: `Incorrect PIN. ${remaining} attempt(s) remaining.` }, { status: 403 });
  }

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
    return NextResponse.json({ error: "Concurrent conflict: this payment was already actioned. Please reload." }, { status: 409 });
  }

  await log({
    businessId: session.businessId,
    userId: session.userId,
    paymentId,
    action: "PAYMENT_APPROVED",
    detail: "PIN verified. Dispatching to PSP.",
    outcome: "processing",
  });

  // Fire-and-forget PSP dispatch
  dispatchToPsp(paymentId, payment.amount, session.businessId).catch(console.error);

  return NextResponse.json({ success: true, paymentId, status: "processing" });
}

async function dispatchToPsp(paymentId: string, amountKobo: number, businessId: string) {
  await new Promise((r) => setTimeout(r, 2000));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const txRef = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const outcome = Math.random() > 0.2 ? "SUCCESS" : "FAILED";
  const settledAmount = outcome === "SUCCESS" ? amountKobo : 0;

  const payload = { paymentId, transactionReference: txRef, settlementStatus: outcome, settledAmount, bankReference: `NIBSS-${Date.now()}`, businessId };
  const secret = process.env.PSP_WEBHOOK_SECRET || "psp-webhook-dev-secret";
  const body = JSON.stringify(payload);
  const { createHmac } = await import("crypto");
  const sig = createHmac("sha256", secret).update(body).digest("hex");

  await fetch(`${baseUrl}/api/webhooks/settlement`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-PSP-Signature": sig },
    body,
  });
}
