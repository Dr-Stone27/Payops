-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cacNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "pinHash" TEXT,
    "role" TEXT NOT NULL,
    "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0,
    "pinLockedUntil" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "cacNumber" TEXT NOT NULL,
    "nubanHash" TEXT NOT NULL,
    "nubanEncrypted" TEXT NOT NULL,
    "nubanLast4" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "cacRegisteredName" TEXT NOT NULL,
    "nubanAccountName" TEXT NOT NULL,
    "kybStatus" TEXT NOT NULL DEFAULT 'verification_pending',
    "jaroWinklerScore" REAL,
    "manuallyApprovedBy" TEXT,
    "manuallyApprovedAt" DATETIME,
    "manualApprovalJustification" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vendor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "makerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "invoicePdfName" TEXT,
    "costCenter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "exceptionCategory" TEXT,
    "complianceReviewResolvedBy" TEXT,
    "complianceTrigger" TEXT,
    "rejectionReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "retentionLocked" BOOLEAN NOT NULL DEFAULT false,
    "transactionReference" TEXT,
    "settledAmount" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentRequest_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRequest_makerId_fkey" FOREIGN KEY ("makerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "paymentId" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "outcome" TEXT NOT NULL,
    "ipAddress" TEXT,
    "retentionLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "paymentId" TEXT NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "settlementStatus" TEXT NOT NULL,
    "settledAmount" INTEGER NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "retentionLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "PaymentRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Business_cacNumber_key" ON "Business"("cacNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_transactionReference_key" ON "WebhookEvent"("transactionReference");
