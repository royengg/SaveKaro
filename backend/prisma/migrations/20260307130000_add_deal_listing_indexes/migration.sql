-- Improve hottest deal listing filters/sorts under load
CREATE INDEX IF NOT EXISTS "Deal_region_isActive_createdAt_idx"
ON "Deal"("region", "isActive", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Deal_isActive_upvoteCount_createdAt_idx"
ON "Deal"("isActive", "upvoteCount" DESC, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Deal_isActive_discountPercent_createdAt_idx"
ON "Deal"("isActive", "discountPercent" DESC, "createdAt" DESC);
