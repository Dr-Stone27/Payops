import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("payops_session")?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("payops_session", "", { maxAge: 0, path: "/" });
  return response;
}
