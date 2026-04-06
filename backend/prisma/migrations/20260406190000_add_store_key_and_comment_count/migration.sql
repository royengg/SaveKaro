ALTER TABLE "Deal"
ADD COLUMN IF NOT EXISTS "storeKey" TEXT,
ADD COLUMN IF NOT EXISTS "commentCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "Deal" AS d
SET "commentCount" = c.comment_count
FROM (
  SELECT "dealId", COUNT(*)::INTEGER AS comment_count
  FROM "Comment"
  GROUP BY "dealId"
) AS c
WHERE d."id" = c."dealId";

UPDATE "Deal"
SET "storeKey" = CASE
  WHEN LOWER(COALESCE("store", '')) LIKE '%amazon%'
    OR LOWER("productUrl") LIKE '%amazon.%'
    OR LOWER("productUrl") LIKE '%amzn.%'
    THEN 'amazon'
  WHEN LOWER(COALESCE("store", '')) LIKE '%myntra%'
    OR LOWER("productUrl") LIKE '%myntra.%'
    OR LOWER("productUrl") LIKE '%myntr.%'
    THEN 'myntra'
  WHEN LOWER(COALESCE("store", '')) LIKE '%ajio%'
    OR LOWER(COALESCE("store", '')) LIKE '%ajiio%'
    OR LOWER("productUrl") LIKE '%ajio.%'
    OR LOWER("productUrl") LIKE '%ajiio.%'
    THEN 'ajio'
  WHEN LOWER(COALESCE("store", '')) LIKE '%nykaa%'
    OR LOWER("productUrl") LIKE '%nykaa.%'
    THEN 'nykaa'
  WHEN LOWER(COALESCE("store", '')) LIKE '%croma%'
    OR LOWER("productUrl") LIKE '%croma.%'
    THEN 'croma'
  WHEN LOWER(COALESCE("store", '')) LIKE '%tata%'
    OR LOWER("productUrl") LIKE '%tatacliq.%'
    OR LOWER("productUrl") LIKE '%tataneu.%'
    THEN 'tata'
  WHEN LOWER(COALESCE("store", '')) LIKE '%flipkart%'
    OR LOWER("productUrl") LIKE '%flipkart.%'
    THEN 'flipkart'
  WHEN LOWER(COALESCE("store", '')) LIKE '%meesho%'
    OR LOWER("productUrl") LIKE '%meesho.%'
    THEN 'meesho'
  WHEN LOWER(COALESCE("store", '')) LIKE '%best buy%'
    OR LOWER(COALESCE("store", '')) LIKE '%bestbuy%'
    OR LOWER("productUrl") LIKE '%bestbuy.%'
    THEN 'bestbuy'
  WHEN LOWER(COALESCE("store", '')) LIKE '%walmart%'
    OR LOWER("productUrl") LIKE '%walmart.%'
    THEN 'walmart'
  WHEN LOWER(COALESCE("store", '')) LIKE '%costco%'
    OR LOWER("productUrl") LIKE '%costco.%'
    THEN 'costco'
  WHEN LOWER(COALESCE("store", '')) LIKE '%canadian tire%'
    OR LOWER(COALESCE("store", '')) LIKE '%canadiantire%'
    OR LOWER("productUrl") LIKE '%canadiantire.%'
    THEN 'canadiantire'
  WHEN LOWER(COALESCE("store", '')) LIKE '%the source%'
    OR LOWER(COALESCE("store", '')) LIKE '%thesource%'
    OR LOWER("productUrl") LIKE '%thesource.%'
    THEN 'thesource'
  WHEN LOWER(COALESCE("store", '')) LIKE '%shoppers drug mart%'
    OR LOWER(COALESCE("store", '')) LIKE '%shoppersdrugmart%'
    OR LOWER("productUrl") LIKE '%shoppersdrugmart.%'
    THEN 'shoppersdrugmart'
  WHEN LOWER(COALESCE("store", '')) LIKE '%london drugs%'
    OR LOWER(COALESCE("store", '')) LIKE '%londondrugs%'
    OR LOWER("productUrl") LIKE '%londondrugs.%'
    THEN 'londondrugs'
  WHEN NULLIF(REGEXP_REPLACE(LOWER(COALESCE("store", '')), '[^a-z0-9]+', '', 'g'), '') IS NOT NULL
    THEN REGEXP_REPLACE(LOWER(COALESCE("store", '')), '[^a-z0-9]+', '', 'g')
  ELSE NULL
END
WHERE "storeKey" IS NULL;

CREATE INDEX IF NOT EXISTS "Deal_storeKey_idx"
ON "Deal"("storeKey");

CREATE INDEX IF NOT EXISTS "Deal_region_storeKey_isActive_createdAt_idx"
ON "Deal"("region", "storeKey", "isActive", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "SavedDeal_userId_createdAt_idx"
ON "SavedDeal"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx"
ON "Notification"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx"
ON "Notification"("userId", "isRead", "createdAt" DESC);
