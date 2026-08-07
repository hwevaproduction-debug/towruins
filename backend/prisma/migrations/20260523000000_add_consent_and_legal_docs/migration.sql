-- Add consentAcceptedAt to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consentAcceptedAt" TIMESTAMP(3);
