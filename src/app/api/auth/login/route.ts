import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { log } from "@/lib/audit";

function uid() {
  return crypto.randomUUID();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const { email, password } = body as Record<string, string>;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const sessionId = uid();
  const token = await createSession({
    sessionId,
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
  });

  await log({ businessId: user.businessId, userId: user.id, action: "LOGIN", outcome: "success" });

  const response = NextResponse.json({
    success: true,
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    pinSet: !!user.pinHash,
  });

  response.cookies.set("payops_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });

  return response;
}
