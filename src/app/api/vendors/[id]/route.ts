import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vendor = await prisma.vendor.findFirst({
    where: { id, businessId: session.businessId },
  });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(vendor);
}
