"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { computeJaroWinkler, getKybDecision, hashNuban, encryptNuban, simulateKybLookup } from "@/lib/kyb";
import { log } from "@/lib/audit";

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function addVendor(formData: FormData) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const legalName = String(formData.get("legalName") ?? "").trim();
  const cacNumber = String(formData.get("cacNumber") ?? "").trim();
  const nuban = String(formData.get("nuban") ?? "").trim();
  const bankName = String(formData.get("bankName") ?? "").trim();

  if (!legalName || !cacNumber || !nuban || !bankName) {
    return { error: "All fields are required." };
  }
  if (!/^\d{10}$/.test(nuban)) {
    return { error: "NUBAN must be exactly 10 digits." };
  }

  const nubanHash = hashNuban(nuban);
  const duplicate = await prisma.vendor.findFirst({
    where: { businessId: session.businessId, nubanHash, kybStatus: "approved" },
  });
  if (duplicate) {
    return { error: "This bank account is already linked to an approved vendor." };
  }

  const { cacName, nubanName } = simulateKybLookup(legalName, nuban);
  const score = computeJaroWinkler(cacName, nubanName);
  const { status } = getKybDecision(score);

  const vendor = await prisma.vendor.create({
    data: {
      id: cuid(),
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

  revalidatePath("/vendors");
  redirect("/vendors");
}

export async function approveVendor(vendorId: string, justification: string) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (!["owner", "admin"].includes(session.role)) return { error: "Only Checkers can approve vendors." };
  if (!justification || justification.trim().length < 20) {
    return { error: "Justification must be at least 20 characters." };
  }

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, businessId: session.businessId },
  });
  if (!vendor) return { error: "Vendor not found." };
  if (vendor.kybStatus === "approved") return { error: "Vendor is already approved." };

  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      kybStatus: "approved",
      manuallyApprovedBy: session.userId,
      manuallyApprovedAt: new Date(),
      manualApprovalJustification: justification.trim(),
    },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    action: "VENDOR_MANUALLY_APPROVED",
    detail: `Vendor ${vendor.legalName}: ${justification.trim()}`,
    outcome: "approved",
  });

  revalidatePath("/vendors");
  return { success: true };
}
