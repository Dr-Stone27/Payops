import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import NewPaymentForm from "./NewPaymentForm";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage() {
  const session = await getSession();
  if (!session) return null;

  const vendors = await prisma.vendor.findMany({
    where: { businessId: session.businessId },
    select: { id: true, legalName: true, kybStatus: true, nubanLast4: true, bankName: true },
    orderBy: { legalName: "asc" },
  });

  const approvedVendors = vendors.filter(v => v.kybStatus === "approved");
  const pendingCount = vendors.filter(v => v.kybStatus !== "approved").length;

  return <NewPaymentForm approvedVendors={approvedVendors} pendingCount={pendingCount} />;
}
