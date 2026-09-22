-- Support submitted-deal lists and paginated comment threads.
CREATE INDEX "Deal_submittedById_createdAt_idx"
ON "Deal"("submittedById", "createdAt" DESC);

CREATE INDEX "Comment_dealId_parentId_createdAt_idx"
ON "Comment"("dealId", "parentId", "createdAt" DESC);

CREATE INDEX "Comment_parentId_createdAt_idx"
ON "Comment"("parentId", "createdAt");

-- Prisma's case-insensitive `contains` filters compile to ILIKE '%term%'.
-- Trigram indexes keep those searches indexed without changing query results.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Deal_title_trgm_idx"
ON "Deal" USING GIN ("title" gin_trgm_ops);

CREATE INDEX "Deal_description_trgm_idx"
ON "Deal" USING GIN ("description" gin_trgm_ops);

CREATE INDEX "Deal_store_trgm_idx"
ON "Deal" USING GIN ("store" gin_trgm_ops);
