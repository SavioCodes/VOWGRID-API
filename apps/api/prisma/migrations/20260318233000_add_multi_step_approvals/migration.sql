ALTER TABLE "approval_requests"
ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'single_step',
ADD COLUMN "current_stage_index" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "stage_definitions" JSONB;

ALTER TABLE "approval_decisions"
ADD COLUMN "stage_index" INTEGER,
ADD COLUMN "stage_label" TEXT;

UPDATE "approval_requests"
SET "stage_definitions" = jsonb_build_array(
  jsonb_build_object(
    'label',
    'Final approval',
    'requiredCount',
    "required_count",
    'reviewerRoles',
    jsonb_build_array('owner', 'admin', 'member', 'viewer')
  )
)
WHERE "stage_definitions" IS NULL;

UPDATE "approval_decisions"
SET "stage_index" = 0,
    "stage_label" = 'Final approval'
WHERE "stage_index" IS NULL;
