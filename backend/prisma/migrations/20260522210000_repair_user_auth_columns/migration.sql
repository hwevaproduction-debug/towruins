-- Repair production schema drift where the deployed Prisma client expects
-- user auth columns that may be missing from databases upgraded manually or
-- from deployments that generated Prisma without running migrations.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  ADD COLUMN IF NOT EXISTS "verificationIdUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationSelfieUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "verificationSubmittedAt" TIMESTAMP(3);
