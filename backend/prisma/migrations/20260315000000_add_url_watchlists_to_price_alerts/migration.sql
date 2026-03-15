-- CreateEnum
CREATE TYPE "PriceAlertMode" AS ENUM ('KEYWORD', 'URL');

-- AlterTable
ALTER TABLE "PriceAlert"
ADD COLUMN "mode" "PriceAlertMode" NOT NULL DEFAULT 'KEYWORD',
ADD COLUMN "watchUrl" TEXT,
ADD COLUMN "watchUrlNormalized" TEXT;

-- CreateIndex
CREATE INDEX "PriceAlert_watchUrlNormalized_idx" ON "PriceAlert"("watchUrlNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "PriceAlert_userId_watchUrlNormalized_key" ON "PriceAlert"("userId", "watchUrlNormalized");
