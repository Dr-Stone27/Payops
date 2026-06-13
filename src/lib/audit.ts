import { prisma } from "./db";

interface AuditEntry {
  businessId: string;
  userId?: string;
  paymentId?: string;
  action: string;
  detail?: string;
  outcome: string;
  ipAddress?: string;
}

export async function log(entry: AuditEntry) {
  await prisma.auditLog.create({ data: entry });
}
