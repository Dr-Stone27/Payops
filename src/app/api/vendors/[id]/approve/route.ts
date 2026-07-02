import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { log } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!["owner", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Only Checkers can approve vendors." }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const justification = String(body?.justification ?? "").trim();

  if (justification.length < 20) {
    return NextResponse.json({ error: "Justification must be at least 20 characters." }, { status: 400 });
  }

  const vendor = await prisma.vendor.findFirst({ where: { id, businessId: session.businessId } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  if (vendor.kybStatus === "approved") return NextResponse.json({ error: "Vendor is already approved." }, { status: 409 });

  // Account-integrity re-check at the approval gate (mirrors approveVendor action)
  const approvedDuplicate = await prisma.vendor.findFirst({
    where: { businessId: session.businessId, nubanHash: vendor.nubanHash, kybStatus: "approved", id: { not: vendor.id } },
  });
  if (approvedDuplicate) {
    return NextResponse.json({ error: `Cannot approve: this bank account is already approved for ${approvedDuplicate.legalName}.` }, { status: 409 });
  }

  await prisma.vendor.update({
    where: { id },
    data: {
      kybStatus: "approved",
      manuallyApprovedBy: session.userId,
      manuallyApprovedAt: new Date(),
      manualApprovalJustification: justification,
    },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    action: "VENDOR_MANUALLY_APPROVED",
    detail: `Vendor ${vendor.legalName}: ${justification}`,
    outcome: "approved",
  });

  return NextResponse.json({ success: true });
}
