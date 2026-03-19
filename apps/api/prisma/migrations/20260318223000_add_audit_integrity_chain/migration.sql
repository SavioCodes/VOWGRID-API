ALTER TABLE "audit_events"
ADD COLUMN "previous_hash" TEXT,
ADD COLUMN "integrity_hash" TEXT NOT NULL DEFAULT '';

UPDATE "audit_events"
SET "integrity_hash" = md5(
  concat_ws(
    '|',
    coalesce("action", ''),
    coalesce("entity_type", ''),
    coalesce("entity_id", ''),
    coalesce("actor_type", ''),
    coalesce("actor_id", ''),
    coalesce("workspace_id", ''),
    coalesce("created_at"::text, ''),
    coalesce("metadata"::text, '')
  )
)
WHERE "integrity_hash" = '';

CREATE INDEX "audit_events_workspace_id_created_at_idx"
ON "audit_events"("workspace_id", "created_at");
