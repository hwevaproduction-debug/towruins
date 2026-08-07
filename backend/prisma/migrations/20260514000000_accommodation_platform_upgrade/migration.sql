CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('HOTEL', 'LODGE', 'BNB', 'APARTMENT', 'GUEST_HOUSE', 'HOSTEL');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('SINGLE', 'DOUBLE', 'TWIN', 'SUITE', 'DORMITORY', 'STUDIO', 'ENTIRE_UNIT');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('INSTANT', 'REQUEST');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('SEASONAL', 'WEEKEND', 'WEEKDAY', 'HOLIDAY', 'LONG_STAY');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('MANUAL', 'MAINTENANCE', 'EXTERNAL_SYNC');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_CONFIRMATION', 'PENDING_PAYMENT', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'CHECKED_IN', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SETTLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CancelledBy" AS ENUM ('GUEST', 'PROVIDER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CancellationPolicyType" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AmenityCategory" AS ENUM ('CONNECTIVITY', 'COMFORT', 'SAFETY', 'RECREATION', 'FOOD', 'TRANSPORT', 'ACCESSIBILITY');

-- CreateTable
CREATE TABLE "Accommodation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" "AccommodationType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "contactPhone" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "addressLine" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "verificationStatus" "VerificationStatus" NOT NULL,
    "commissionRate" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "AmenityCategory" NOT NULL,
    "icon" TEXT,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Room"
  ADD COLUMN "accommodationId" TEXT,
  ADD COLUMN "minNights" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "maxNights" INTEGER,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "Room" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Room" ALTER COLUMN "bookingMode" DROP DEFAULT;

ALTER TABLE "Room" ALTER COLUMN "roomType" TYPE "RoomType" USING (
  CASE regexp_replace(upper("roomType"), '[^A-Z0-9]+', '_', 'g')
    WHEN 'SINGLE' THEN 'SINGLE'::"RoomType"
    WHEN 'DOUBLE' THEN 'DOUBLE'::"RoomType"
    WHEN 'TWIN' THEN 'TWIN'::"RoomType"
    WHEN 'SUITE' THEN 'SUITE'::"RoomType"
    WHEN 'DORMITORY' THEN 'DORMITORY'::"RoomType"
    WHEN 'DORM' THEN 'DORMITORY'::"RoomType"
    WHEN 'STUDIO' THEN 'STUDIO'::"RoomType"
    WHEN 'ENTIRE_UNIT' THEN 'ENTIRE_UNIT'::"RoomType"
    WHEN 'ENTIRE' THEN 'ENTIRE_UNIT'::"RoomType"
    ELSE NULL
  END
);

ALTER TABLE "Room" ALTER COLUMN "status" TYPE "RoomStatus" USING (
  CASE regexp_replace(upper("status"), '[^A-Z0-9]+', '_', 'g')
    WHEN 'AVAILABLE' THEN 'AVAILABLE'::"RoomStatus"
    WHEN 'UNAVAILABLE' THEN 'UNAVAILABLE'::"RoomStatus"
    WHEN 'MAINTENANCE' THEN 'MAINTENANCE'::"RoomStatus"
    ELSE 'AVAILABLE'::"RoomStatus"
  END
);

ALTER TABLE "Room" ALTER COLUMN "bookingMode" TYPE "BookingMode" USING (
  CASE regexp_replace(upper("bookingMode"), '[^A-Z0-9]+', '_', 'g')
    WHEN 'INSTANT' THEN 'INSTANT'::"BookingMode"
    WHEN 'REQUEST' THEN 'REQUEST'::"BookingMode"
    ELSE 'INSTANT'::"BookingMode"
  END
);

ALTER TABLE "Room" ALTER COLUMN "basePricePerNight" TYPE DECIMAL(65,30) USING "basePricePerNight"::DECIMAL(65,30);
ALTER TABLE "Room" ALTER COLUMN "status" SET DEFAULT 'AVAILABLE'::"RoomStatus";
ALTER TABLE "Room" ALTER COLUMN "bookingMode" SET DEFAULT 'INSTANT'::"BookingMode";

ALTER TABLE "Room"
  DROP COLUMN "pricingRules",
  DROP COLUMN "amenities",
  DROP COLUMN "imageUrls",
  DROP COLUMN "cancellationPolicy",
  DROP COLUMN "cancellationPolicyCustomText";

-- CreateTable
CREATE TABLE "OccupancyRule" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "maxGuests" INTEGER NOT NULL,
    "maxAdults" INTEGER NOT NULL,
    "maxChildren" INTEGER NOT NULL DEFAULT 0,
    "maxInfants" INTEGER NOT NULL DEFAULT 0,
    "minGuests" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OccupancyRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonalRate" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rateType" "RateType" NOT NULL,
    "pricePerNight" DECIMAL(65,30) NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "daysOfWeek" INTEGER[],
    "minNightsToApply" INTEGER NOT NULL DEFAULT 1,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonalRate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Booking"
  ADD COLUMN "appliedRateId" TEXT,
  ADD COLUMN "adultCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "childCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "infantCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "cancellationPolicySnapshot" JSONB,
  ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "Booking"
SET "adultCount" = COALESCE("guestCount", 1);

UPDATE "Booking"
SET "totalPrice" = COALESCE("totalPrice", "totalAmount")
WHERE "totalPrice" IS NULL
  AND "totalAmount" IS NOT NULL;

UPDATE "Booking"
SET "cancellationPolicySnapshot" = jsonb_build_object('policy', "cancellationPolicy")
WHERE "cancellationPolicy" IS NOT NULL
  AND "cancellationPolicySnapshot" IS NULL;

ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "settlementStatus" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "refundAmount" DROP DEFAULT;

ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus" USING (
  CASE regexp_replace(upper("status"), '[^A-Z0-9]+', '_', 'g')
    WHEN 'PENDING_CONFIRMATION' THEN 'PENDING_CONFIRMATION'::"BookingStatus"
    WHEN 'PENDING_PAYMENT' THEN 'PENDING_PAYMENT'::"BookingStatus"
    WHEN 'CONFIRMED' THEN 'CONFIRMED'::"BookingStatus"
    WHEN 'DECLINED' THEN 'DECLINED'::"BookingStatus"
    WHEN 'CANCELLED' THEN 'CANCELLED'::"BookingStatus"
    WHEN 'CANCELED' THEN 'CANCELLED'::"BookingStatus"
    WHEN 'CHECKED_IN' THEN 'CHECKED_IN'::"BookingStatus"
    WHEN 'COMPLETED' THEN 'COMPLETED'::"BookingStatus"
    WHEN 'EXPIRED' THEN 'EXPIRED'::"BookingStatus"
    ELSE 'PENDING_CONFIRMATION'::"BookingStatus"
  END
);

ALTER TABLE "Booking" ALTER COLUMN "paymentStatus" TYPE "PaymentStatus" USING (
  CASE regexp_replace(upper("paymentStatus"), '[^A-Z0-9]+', '_', 'g')
    WHEN 'UNPAID' THEN 'UNPAID'::"PaymentStatus"
    WHEN 'PENDING' THEN 'PENDING'::"PaymentStatus"
    WHEN 'PAID' THEN 'PAID'::"PaymentStatus"
    WHEN 'REFUNDED' THEN 'REFUNDED'::"PaymentStatus"
    WHEN 'PARTIALLY_REFUNDED' THEN 'PARTIALLY_REFUNDED'::"PaymentStatus"
    WHEN 'FAILED' THEN 'FAILED'::"PaymentStatus"
    ELSE 'UNPAID'::"PaymentStatus"
  END
);

ALTER TABLE "Booking" ALTER COLUMN "settlementStatus" TYPE "SettlementStatus" USING (
  CASE regexp_replace(upper("settlementStatus"), '[^A-Z0-9]+', '_', 'g')
    WHEN 'PENDING' THEN 'PENDING'::"SettlementStatus"
    WHEN 'SETTLED' THEN 'SETTLED'::"SettlementStatus"
    WHEN 'DISPUTED' THEN 'DISPUTED'::"SettlementStatus"
    ELSE 'PENDING'::"SettlementStatus"
  END
);

ALTER TABLE "Booking" ALTER COLUMN "cancelledBy" TYPE "CancelledBy" USING (
  CASE regexp_replace(upper("cancelledBy"), '[^A-Z0-9]+', '_', 'g')
    WHEN 'GUEST' THEN 'GUEST'::"CancelledBy"
    WHEN 'PROVIDER' THEN 'PROVIDER'::"CancelledBy"
    WHEN 'ADMIN' THEN 'ADMIN'::"CancelledBy"
    WHEN 'SYSTEM' THEN 'SYSTEM'::"CancelledBy"
    ELSE NULL
  END
);

ALTER TABLE "Booking" ALTER COLUMN "pricePerNight" TYPE DECIMAL(65,30) USING "pricePerNight"::DECIMAL(65,30);
ALTER TABLE "Booking" ALTER COLUMN "subtotal" TYPE DECIMAL(65,30) USING "subtotal"::DECIMAL(65,30);
ALTER TABLE "Booking" ALTER COLUMN "commissionRate" TYPE DECIMAL(65,30) USING "commissionRate"::DECIMAL(65,30);
ALTER TABLE "Booking" ALTER COLUMN "commissionAmount" TYPE DECIMAL(65,30) USING "commissionAmount"::DECIMAL(65,30);
ALTER TABLE "Booking" ALTER COLUMN "totalPrice" TYPE DECIMAL(65,30) USING "totalPrice"::DECIMAL(65,30);
ALTER TABLE "Booking" ALTER COLUMN "netPayout" TYPE DECIMAL(65,30) USING "netPayout"::DECIMAL(65,30);
ALTER TABLE "Booking" ALTER COLUMN "refundAmount" TYPE DECIMAL(65,30) USING "refundAmount"::DECIMAL(65,30);

ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING_CONFIRMATION'::"BookingStatus";
ALTER TABLE "Booking" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID'::"PaymentStatus";
ALTER TABLE "Booking" ALTER COLUMN "settlementStatus" SET DEFAULT 'PENDING'::"SettlementStatus";
ALTER TABLE "Booking" ALTER COLUMN "refundAmount" SET DEFAULT 0;

ALTER TABLE "Booking"
  DROP COLUMN "totalAmount",
  DROP COLUMN "guestCount",
  DROP COLUMN "cancellationPolicy";

-- CreateTable
CREATE TABLE "AvailabilityBlock" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "blockType" "BlockType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityBlock_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AvailabilityBlock" (
    "id",
    "roomId",
    "blockType",
    "startDate",
    "endDate",
    "reason",
    "createdBy",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "roomId",
    'MANUAL'::"BlockType",
    "startDate",
    "endDate",
    NULLIF("reason", ''),
    "providerId",
    "createdAt",
    "updatedAt"
FROM "BlockedDate";

DROP TABLE "BlockedDate";

-- CreateTable
CREATE TABLE "CancellationPolicy" (
    "id" TEXT NOT NULL,
    "accommodationId" TEXT NOT NULL,
    "policyType" "CancellationPolicyType" NOT NULL,
    "freeCancellationHours" INTEGER,
    "refundPercentage" DECIMAL(65,30),
    "customDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInOutRules" (
    "id" TEXT NOT NULL,
    "accommodationId" TEXT NOT NULL,
    "checkInFrom" TEXT NOT NULL,
    "checkInUntil" TEXT NOT NULL,
    "checkOutBy" TEXT NOT NULL,
    "selfCheckIn" BOOLEAN NOT NULL DEFAULT false,
    "selfCheckInMethod" TEXT,
    "lateCheckOutFee" DECIMAL(65,30),
    "instructions" TEXT,

    CONSTRAINT "CheckInOutRules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccommodationAmenity" (
    "accommodationId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AccommodationAmenity_pkey" PRIMARY KEY ("accommodationId", "amenityId")
);

-- CreateTable
CREATE TABLE "RoomAmenity" (
    "roomId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "RoomAmenity_pkey" PRIMARY KEY ("roomId", "amenityId")
);

-- CreateTable
CREATE TABLE "AccommodationImage" (
    "id" TEXT NOT NULL,
    "accommodationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccommodationImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomImage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "accommodationId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "cleanlinessRating" INTEGER,
    "locationRating" INTEGER,
    "valueRating" INTEGER,
    "serviceRating" INTEGER,
    "comment" TEXT,
    "providerResponse" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Accommodation_slug_key" ON "Accommodation"("slug");

-- CreateIndex
CREATE INDEX "Accommodation_ownerId_idx" ON "Accommodation"("ownerId");

-- CreateIndex
CREATE INDEX "Accommodation_province_city_idx" ON "Accommodation"("province", "city");

-- CreateIndex
CREATE INDEX "Accommodation_type_verificationStatus_isPublished_idx" ON "Accommodation"("type", "verificationStatus", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_slug_key" ON "Amenity"("slug");

-- CreateIndex
CREATE INDEX "Room_accommodationId_status_idx" ON "Room"("accommodationId", "status");

-- CreateIndex
CREATE INDEX "Room_status_bookingMode_idx" ON "Room"("status", "bookingMode");

-- CreateIndex
CREATE UNIQUE INDEX "OccupancyRule_roomId_key" ON "OccupancyRule"("roomId");

-- CreateIndex
CREATE INDEX "SeasonalRate_roomId_rateType_idx" ON "SeasonalRate"("roomId", "rateType");

-- CreateIndex
CREATE INDEX "SeasonalRate_roomId_startDate_endDate_idx" ON "SeasonalRate"("roomId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "AvailabilityBlock_roomId_startDate_endDate_idx" ON "AvailabilityBlock"("roomId", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "CancellationPolicy_accommodationId_key" ON "CancellationPolicy"("accommodationId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInOutRules_accommodationId_key" ON "CheckInOutRules"("accommodationId");

-- CreateIndex
CREATE INDEX "AccommodationImage_accommodationId_sortOrder_idx" ON "AccommodationImage"("accommodationId", "sortOrder");

-- CreateIndex
CREATE INDEX "RoomImage_roomId_sortOrder_idx" ON "RoomImage"("roomId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_accommodationId_isPublished_idx" ON "Review"("accommodationId", "isPublished");

-- CreateIndex
CREATE INDEX "Review_guestId_idx" ON "Review"("guestId");

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccupancyRule" ADD CONSTRAINT "OccupancyRule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonalRate" ADD CONSTRAINT "SeasonalRate_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_appliedRateId_fkey" FOREIGN KEY ("appliedRateId") REFERENCES "SeasonalRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CancellationPolicy" ADD CONSTRAINT "CancellationPolicy_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInOutRules" ADD CONSTRAINT "CheckInOutRules_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationAmenity" ADD CONSTRAINT "AccommodationAmenity_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationAmenity" ADD CONSTRAINT "AccommodationAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAmenity" ADD CONSTRAINT "RoomAmenity_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomAmenity" ADD CONSTRAINT "RoomAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationImage" ADD CONSTRAINT "AccommodationImage_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomImage" ADD CONSTRAINT "RoomImage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddConstraint
ALTER TABLE "Booking" ADD CONSTRAINT "no_overlapping_bookings"
  EXCLUDE USING gist (
    "roomId" WITH =,
    tsrange("checkIn", "checkOut") WITH &&
  )
  WHERE (status NOT IN ('CANCELLED', 'DECLINED', 'EXPIRED', 'COMPLETED'));
