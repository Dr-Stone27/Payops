import { prisma } from "./db";

const HIGH_VALUE_THRESHOLD_KOBO = 500_000_00; // ₦5,000,000

export async function detectComplianceTrigger(
  businessId: string,
  vendorId: string,
  invoiceNumber: string,
  amountKobo: number,
  vendorKybScore: number | null
): Promise<string | null> {
  if (amountKobo >= HIGH_VALUE_THRESHOLD_KOBO) return "HIGH_VALUE";

  const duplicate = await prisma.paymentRequest.findFirst({
    where: {
      businessId,
      vendorId,
      invoiceNumber,
      status: { notIn: ["cancelled"] },
    },
  });
  if (duplicate) return "DUPLICATE_INVOICE";

  if (vendorKybScore !== null && vendorKybScore >= 0.7 && vendorKybScore < 0.85) {
    return "AMBIGUOUS_MATCH";
  }

  const recentFailures = await prisma.paymentRequest.count({
    where: {
      businessId,
      vendorId,
      status: "exception_queue",
      exceptionCategory: { in: ["PSP_FAILURE", "STATUS_UNKNOWN"] },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
  if (recentFailures >= 3) return "REPEATED_FAILURE";

  return null;
}

export function getNipTolerance(amountKobo: number): number {
  if (amountKobo <= 500_000) return 0;        // ≤₦5,000 — free
  if (amountKobo <= 5_000_000) return 1_000;  // ≤₦50,000 — max ₦10
  return 5_000;                                // >₦50,000 — max ₦50
}

export function formatNaira(kobo: number | bigint): string {
  const n = typeof kobo === "bigint" ? Number(kobo) : kobo;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(n / 100);
}
