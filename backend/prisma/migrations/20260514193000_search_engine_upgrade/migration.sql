-- CreateTable
CREATE TABLE "SearchAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "params" JSONB NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchAnalyticsEvent_createdAt_idx" ON "SearchAnalyticsEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Room_accommodationId_status_basePricePerNight_idx" ON "Room"("accommodationId", "status", "basePricePerNight");

-- CreateIndex
CREATE INDEX "Room_accommodationId_status_roomType_idx" ON "Room"("accommodationId", "status", "roomType");

-- CreateIndex
CREATE INDEX "Accommodation_lat_lng_idx" ON "Accommodation"("lat", "lng");

-- CreateIndex
CREATE INDEX "Review_accommodationId_overallRating_isPublished_idx" ON "Review"("accommodationId", "overallRating", "isPublished");
