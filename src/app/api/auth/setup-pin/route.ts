import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { log } from "@/lib/audit";
import { COMMON_PINS } from "@/lib/walkthrough";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const { pin, confirmPin } = body as Record<string, string>;

  if (!/^\d{4}$/.test(pin ?? "")) {
    return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
  }
  if (pin !== confirmPin) {
    return NextResponse.json({ error: "Those PINs don't match. Try again." }, { status: 400 });
  }
  if (COMMON_PINS.has(pin)) {
    return NextResponse.json({ error: "That PIN is too easy to guess. Choose something less predictable." }, { status: 400 });
  }

  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.user.update({ where: { id: session.userId }, data: { pinHash } });

  await log({ businessId: session.businessId, userId: session.userId, action: "PIN_SETUP", outcome: "success" });

  return NextResponse.json({ success: true });
}
