import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { executeApproval } from "@/lib/approval";

// Thin wrapper over the shared approval sequence in src/lib/approval.ts —
// the server action (approvePayment) uses the same implementation, so the
// controls (role, PIN, lockout, four-eyes, version guard) cannot drift.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id: paymentId } = await params;
  const body = await req.json().catch(() => null);
  const pin = String(body?.pin ?? "");

  const result = await executeApproval(session, paymentId, pin);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }

  return NextResponse.json({
    success: true,
    paymentId: result.paymentId,
    status: result.status,
    outcome: result.outcome,
  });
}
