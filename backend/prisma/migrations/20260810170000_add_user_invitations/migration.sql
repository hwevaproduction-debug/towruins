-- Create AdminImportBatch first
CREATE TABLE "AdminImportBatch" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminImportBatch_pkey" PRIMARY KEY ("id")
);

-- Create AdminImportRow
CREATE TABLE "AdminImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "email" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminImportRow_pkey" PRIMARY KEY ("id")
);

-- Create UserInvitation
CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "UserInvitation_userId_key"
ON "UserInvitation"("userId");

CREATE INDEX "UserInvitation_tokenHash_idx"
ON "UserInvitation"("tokenHash");

CREATE INDEX "UserInvitation_status_expiresAt_idx"
ON "UserInvitation"("status", "expiresAt");

-- Foreign keys
ALTER TABLE "AdminImportBatch"
ADD CONSTRAINT "AdminImportBatch_adminId_fkey"
FOREIGN KEY ("adminId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "AdminImportRow"
ADD CONSTRAINT "AdminImportRow_batchId_fkey"
FOREIGN KEY ("batchId")
REFERENCES "AdminImportBatch"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "UserInvitation"
ADD CONSTRAINT "UserInvitation_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "UserInvitation"
ADD CONSTRAINT "UserInvitation_adminId_fkey"
FOREIGN KEY ("adminId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "UserInvitation"
ADD CONSTRAINT "UserInvitation_batchId_fkey"
FOREIGN KEY ("batchId")
REFERENCES "AdminImportBatch"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
