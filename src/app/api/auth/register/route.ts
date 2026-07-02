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

  const { fullName, email, password, businessName, cacNumber } = body as Record<string, string>;

  if (!fullName || !email || !password || !businessName || !cacNumber) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const existingBusiness = await prisma.business.findUnique({ where: { cacNumber } });
  if (existingBusiness) return NextResponse.json({ error: "A business with this CAC number is already registered." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const businessId = uid();
  const userId = uid();

  const business = await prisma.business.create({
    data: { id: businessId, name: businessName, cacNumber, status: "active" },
  });

  const user = await prisma.user.create({
    data: { id: userId, businessId: business.id, fullName, email: email.toLowerCase(), passwordHash, role: "owner" },
  });

  const sessionId = uid();
  const token = await createSession({
    sessionId,
    userId: user.id,
    businessId: business.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
  });

  await log({ businessId: business.id, userId: user.id, action: "REGISTER", outcome: "success" });

  const response = NextResponse.json({
    success: true,
    userId: user.id,
    businessId: business.id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
  }, { status: 201 });

  response.cookies.set("payops_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });

  return response;
}
