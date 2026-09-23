ALTER TABLE "User" ALTER COLUMN "googleId" DROP NOT NULL;

CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'APPLE');

CREATE TABLE "AuthIdentity" (
    "id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "subject" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthIdentity_provider_subject_key" ON "AuthIdentity"("provider", "subject");
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve provider IDs exactly; never infer an identity from matching email.
INSERT INTO "AuthIdentity" ("id", "provider", "subject", "userId")
SELECT 'google_' || "id", 'GOOGLE', "googleId", "id" FROM "User" WHERE "googleId" IS NOT NULL;

CREATE TABLE "MobileSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileSession_refreshTokenHash_key" ON "MobileSession"("refreshTokenHash");
CREATE INDEX "MobileSession_familyId_idx" ON "MobileSession"("familyId");
CREATE INDEX "MobileSession_userId_idx" ON "MobileSession"("userId");
CREATE INDEX "MobileSession_expiresAt_idx" ON "MobileSession"("expiresAt");
ALTER TABLE "MobileSession" ADD CONSTRAINT "MobileSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
