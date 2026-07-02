import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { detectComplianceTrigger } from "@/lib/compliance";
import { log } from "@/lib/audit";

const PSP_LIMIT_KOBO = 1_000_000_000;

function uid() {
  return crypto.randomUUID();
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payments = await prisma.paymentRequest.findMany({
    where: { businessId: session.businessId },
    include: {
      vendor: { select: { id: true, legalName: true, nubanLast4: true, bankName: true } },
      maker: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(payments.map(p => ({
    id: p.id,
    status: p.status,
    amount: p.amount,
    invoiceNumber: p.invoiceNumber,
    costCenter: p.costCenter,
    complianceTrigger: p.complianceTrigger,
    exceptionCategory: p.exceptionCategory,
    createdAt: p.createdAt,
    vendor: p.vendor,
    maker: p.maker,
  })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });

  const { vendorId, invoiceNumber, amount, costCenter, invoicePdfName } = body as Record<string, string>;

  if (!vendorId || !invoiceNumber || !amount || !invoicePdfName) {
    return NextResponse.json({ error: "vendorId, invoiceNumber, amount, and invoicePdfName are required." }, { status: 400 });
  }

  const amountNaira = parseFloat(amount);
  if (isNaN(amountNaira) || amountNaira <= 0) {
    return NextResponse.json({ error: "amount must be a positive number." }, { status: 400 });
  }

  const amountKobo = Math.round(amountNaira * 100);
  if (amountKobo > PSP_LIMIT_KOBO * 5) {
    return NextResponse.json({ error: "Maximum payment is ₦50,000,000. Please split into separate requests." }, { status: 400 });
  }

  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, businessId: session.businessId } });
  if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  if (vendor.kybStatus !== "approved") {
    return NextResponse.json({ error: "Cannot create a payment request against a vendor in Needs Review status." }, { status: 409 });
  }

  const trigger = await detectComplianceTrigger(
    session.businessId,
    vendorId,
    invoiceNumber,
    amountKobo,
    vendor.jaroWinklerScore,
  );

  const status = trigger ? "compliance_review" : "pending_approval";

  const payment = await prisma.paymentRequest.create({
    data: {
      id: uid(),
      businessId: session.businessId,
      vendorId,
      makerId: session.userId,
      invoiceNumber,
      amount: amountKobo,
      costCenter: costCenter || null,
      invoicePdfName: invoicePdfName || null,
      status,
      complianceTrigger: trigger,
    },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    paymentId: payment.id,
    action: "PAYMENT_CREATED",
    detail: trigger ? `Compliance trigger: ${trigger}` : "Routed to pending approval",
    outcome: status,
  });

  return NextResponse.json({
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    amountNaira,
    invoiceNumber: payment.invoiceNumber,
    costCenter: payment.costCenter,
    complianceTrigger: payment.complianceTrigger,
    createdAt: payment.createdAt,
  }, { status: 201 });
}
