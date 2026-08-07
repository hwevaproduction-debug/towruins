ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

CREATE TABLE "BookingGuestInfo" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nationalId" TEXT,
    "estimatedArrivalTime" TEXT,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingGuestInfo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingGuestInfo_bookingId_key" ON "BookingGuestInfo"("bookingId");

ALTER TABLE "BookingGuestInfo"
ADD CONSTRAINT "BookingGuestInfo_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
