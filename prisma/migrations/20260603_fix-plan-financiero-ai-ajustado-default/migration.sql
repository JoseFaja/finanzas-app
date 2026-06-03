UPDATE "PlanFinanciero"
SET "aiAjustado" = false
WHERE "aiAjustado" IS NULL;

ALTER TABLE "PlanFinanciero"
ALTER COLUMN "aiAjustado" SET DEFAULT false;

ALTER TABLE "PlanFinanciero"
ALTER COLUMN "aiAjustado" SET NOT NULL;
