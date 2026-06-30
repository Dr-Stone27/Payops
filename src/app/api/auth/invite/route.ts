import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { log } from "@/lib/audit";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!["owner", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Only Owners and Admins can invite team members." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const { fullName, email, password, role } = body as Record<string, string>;

  if (!fullName || !email || !password || !role) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!["admin", "maker"].includes(role)) {
    return NextResponse.json({ error: "Invalid role. Choose admin (Checker) or maker." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uid();

  const user = await prisma.user.create({
    data: { id: userId, businessId: session.businessId, fullName, email: email.toLowerCase(), passwordHash, role },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    action: "TEAM_MEMBER_INVITED",
    detail: `${fullName} (${email}) added as ${role}`,
    outcome: "success",
  });

  return NextResponse.json({ success: true, userId: user.id, fullName: user.fullName, email: user.email, role: user.role }, { status: 201 });
}
