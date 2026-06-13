import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendors = await prisma.vendor.findMany({
    where: { businessId: session.businessId },
    select: { id: true, legalName: true, kybStatus: true, nubanLast4: true, bankName: true },
    orderBy: { legalName: "asc" },
  });

  return NextResponse.json(vendors);
}
