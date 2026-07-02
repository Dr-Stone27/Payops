import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!["owner", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Only Checkers can action compliance reviews." }, { status: 403 });
  }

  const { id: paymentId } = await params;
  const body = await req.json().catch(() => null);
  const decision = String(body?.decision ?? "");

  if (!["clear", "block"].includes(decision)) {
    return NextResponse.json({ error: "decision must be 'clear' or 'block'." }, { status: 400 });
  }

  const payment = await prisma.paymentRequest.findFirst({
    where: { id: paymentId, businessId: session.businessId },
  });
  if (!payment || payment.status !== "compliance_review") {
    return NextResponse.json({ error: "Payment is not in compliance review." }, { status: 404 });
  }

  if (decision === "clear") {
    await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: { status: "pending_approval", complianceReviewResolvedBy: session.userId },
    });
    await log({
      businessId: session.businessId,
      userId: session.userId,
      paymentId,
      action: "COMPLIANCE_CLEARED",
      outcome: "pending_approval",
    });
    return NextResponse.json({ success: true, paymentId, status: "pending_approval" });
  } else {
    await prisma.paymentRequest.update({
      where: { id: paymentId },
      data: {
        status: "exception_queue",
        exceptionCategory: "COMPLIANCE_BLOCKED",
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
    return NextResponse.json({ success: true, paymentId, status: "exception_queue" });
  }
}
