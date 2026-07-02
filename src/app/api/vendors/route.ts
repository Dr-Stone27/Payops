import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { computeJaroWinkler, getKybDecision, hashNuban, encryptNuban, simulateKybLookup } from "@/lib/kyb";
import { log } from "@/lib/audit";

function uid() {
  return crypto.randomUUID();
}

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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const { legalName, cacNumber, nuban, bankName } = body as Record<string, string>;

  if (!legalName || !cacNumber || !nuban || !bankName) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!/^\d{10}$/.test(nuban)) {
    return NextResponse.json({ error: "NUBAN must be exactly 10 digits." }, { status: 400 });
  }

  const nubanHash = hashNuban(nuban);
  const duplicate = await prisma.vendor.findFirst({
    where: { businessId: session.businessId, nubanHash },
  });
  if (duplicate) {
    return NextResponse.json({ error: `This bank account is already registered to ${duplicate.legalName}.` }, { status: 409 });
  }

  const { cacName, nubanName, fixedScore } = simulateKybLookup(legalName, nuban);
  const score = fixedScore ?? computeJaroWinkler(cacName, nubanName);
  const { status } = getKybDecision(score);

  const vendor = await prisma.vendor.create({
    data: {
      id: uid(),
      businessId: session.businessId,
      legalName,
      cacNumber,
      nubanHash,
      nubanEncrypted: encryptNuban(nuban),
      nubanLast4: nuban.slice(-4),
      bankName,
      cacRegisteredName: cacName,
      nubanAccountName: nubanName,
      kybStatus: status,
      jaroWinklerScore: score,
    },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    action: "VENDOR_ADDED",
    detail: `${legalName} — KYB: ${status} (score: ${score.toFixed(2)})`,
    outcome: status,
  });

  return NextResponse.json({
    id: vendor.id,
    legalName: vendor.legalName,
    kybStatus: vendor.kybStatus,
    kybScore: vendor.jaroWinklerScore,
    cacRegisteredName: vendor.cacRegisteredName,
    nubanAccountName: vendor.nubanAccountName,
    nubanLast4: vendor.nubanLast4,
    bankName: vendor.bankName,
  }, { status: 201 });
}
