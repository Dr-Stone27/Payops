import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!["owner", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Only Checkers can reject payments." }, { status: 403 });
  }

  const { id: paymentId } = await params;
  const body = await req.json().catch(() => null);
  const reason = String(body?.reason ?? "").trim();

  if (reason.length < 10) {
    return NextResponse.json({ error: "Rejection reason must be at least 10 characters." }, { status: 400 });
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId },
  });
  if (!payment || payment.status !== "pending_approval") {
    return NextResponse.json({ error: "Payment not found or not awaiting approval." }, { status: 404 });
  }

  await prisma.paymentRequest.update({
    where: { id: paymentId },
    data: { status: "cancelled", rejectionReason: reason },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    paymentId,
    action: "PAYMENT_REJECTED",
    detail: reason,
    outcome: "cancelled",
  });

  return NextResponse.json({ success: true, paymentId, status: "cancelled" });
}
