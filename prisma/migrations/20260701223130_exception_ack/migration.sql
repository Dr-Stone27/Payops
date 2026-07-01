-- AlterTable
ALTER TABLE "PaymentRequest" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedBy" TEXT;
