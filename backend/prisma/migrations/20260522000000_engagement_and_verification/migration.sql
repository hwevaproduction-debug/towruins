-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN "verificationIdUrl" TEXT,
  ADD COLUMN "verificationSelfieUrl" TEXT,
  ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "passwordResetToken" TEXT,
  ADD COLUMN "passwordResetExpires" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Engagement" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "landlordId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "EngagementStatus" NOT NULL DEFAULT 'PENDING',
  "landlordNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Engagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Engagement_tenantId_status_idx" ON "Engagement"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Engagement_landlordId_status_idx" ON "Engagement"("landlordId", "status");

-- CreateIndex
CREATE INDEX "Engagement_listingId_idx" ON "Engagement"("listingId");

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engagement" ADD CONSTRAINT "Engagement_landlordId_fkey" FOREIGN KEY ("landlordId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
