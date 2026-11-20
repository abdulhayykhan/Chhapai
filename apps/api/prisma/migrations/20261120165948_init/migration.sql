-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'PRINTING', 'COMPLETED', 'REJECTED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateEnum
CREATE TYPE "ColorMode" AS ENUM ('BW', 'COLOR');

-- CreateEnum
CREATE TYPE "Sides" AS ENUM ('SINGLE', 'DOUBLE');

-- CreateEnum
CREATE TYPE "PaperSize" AS ENUM ('A4', 'A3', 'LEGAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'STAFF');

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameUrdu" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "autoPrint" BOOLEAN NOT NULL DEFAULT true,
    "bwPrinter" TEXT,
    "colorPrinter" TEXT,
    "rateBwSingle" DECIMAL(8,2) NOT NULL DEFAULT 5,
    "rateBwDouble" DECIMAL(8,2) NOT NULL DEFAULT 4,
    "rateColorSingle" DECIMAL(8,2) NOT NULL DEFAULT 30,
    "rateColorDouble" DECIMAL(8,2) NOT NULL DEFAULT 25,
    "maxFileMb" INTEGER NOT NULL DEFAULT 25,
    "maxPages" INTEGER NOT NULL DEFAULT 200,
    "retentionMinutes" INTEGER NOT NULL DEFAULT 60,
    "pendingExpiryHours" INTEGER NOT NULL DEFAULT 24,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "originalMime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "tokenDate" DATE NOT NULL,
    "tokenSeq" INTEGER NOT NULL,
    "tokenLabel" TEXT NOT NULL,
    "publicToken" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "uploadId" TEXT NOT NULL,
    "copies" INTEGER NOT NULL,
    "colorMode" "ColorMode" NOT NULL,
    "sides" "Sides" NOT NULL,
    "paperSize" "PaperSize" NOT NULL DEFAULT 'A4',
    "pageRange" TEXT,
    "pagesPerCopy" INTEGER NOT NULL,
    "printedPages" INTEGER NOT NULL,
    "unitRate" DECIMAL(8,2) NOT NULL,
    "calculatedAmount" INTEGER NOT NULL,
    "finalAmount" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "failReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "printStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "fileDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobEvent" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" "JobStatus",
    "toStatus" "JobStatus",
    "actorUserId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PrintJob_publicToken_key" ON "PrintJob"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "PrintJob_uploadId_key" ON "PrintJob"("uploadId");

-- CreateIndex
CREATE INDEX "PrintJob_shopId_status_createdAt_idx" ON "PrintJob"("shopId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PrintJob_shopId_tokenDate_tokenSeq_key" ON "PrintJob"("shopId", "tokenDate", "tokenSeq");

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobEvent" ADD CONSTRAINT "JobEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "PrintJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
