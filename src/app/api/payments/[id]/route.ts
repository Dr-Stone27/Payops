import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payment = await prisma.paymentRequest.findFirst({
    where: { id, businessId: session.businessId },
    include: {
      vendor: { select: { legalName: true, bankName: true, nubanLast4: true, kybStatus: true } },
      maker: { select: { fullName: true } },
    },
  });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ payment, userId: session.userId, role: session.role });
}
