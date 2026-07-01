-- AlterTable
ALTER TABLE "PaymentRequest" ADD COLUMN "acknowledgedAt" DATETIME;
ALTER TABLE "PaymentRequest" ADD COLUMN "acknowledgedBy" TEXT;
