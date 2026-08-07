/*
  Warnings:

  - The `bookingMode` column on the `Booking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `createdAt` on the `Listing` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Listing` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EngagementStatus" ADD VALUE 'CHARGED';
ALTER TYPE "EngagementStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "EngagementStatus" ADD VALUE 'EXPIRED';

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_accommodationId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "bookingMode",
ADD COLUMN     "bookingMode" "BookingMode";

-- AlterTable
ALTER TABLE "LegalDocument" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "UserNotificationPreferences" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserPushSubscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ListingRestoration" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "tokensSpent" INTEGER NOT NULL,
    "restoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingRestoration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListingRestoration_listingId_idx" ON "ListingRestoration"("listingId");

-- CreateIndex
CREATE INDEX "ListingRestoration_userId_idx" ON "ListingRestoration"("userId");

-- CreateIndex
CREATE INDEX "ListingRestoration_restoredAt_idx" ON "ListingRestoration"("restoredAt");

-- AddForeignKey
ALTER TABLE "ListingRestoration" ADD CONSTRAINT "ListingRestoration_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingRestoration" ADD CONSTRAINT "ListingRestoration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
