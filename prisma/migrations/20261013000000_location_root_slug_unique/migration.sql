-- PostgreSQL treats NULL values as distinct in the existing (parentId, slug)
-- unique constraint, so enforce uniqueness for root locations separately.
CREATE UNIQUE INDEX "locations_root_slug_key"
ON "locations" ("slug")
WHERE "parentId" IS NULL;
