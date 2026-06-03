ALTER TABLE "PlanFinanciero" ADD COLUMN "idObjetivo" INTEGER;

CREATE INDEX "PlanFinanciero_idObjetivo_idx" ON "PlanFinanciero"("idObjetivo");

ALTER TABLE "PlanFinanciero"
ADD CONSTRAINT "PlanFinanciero_idObjetivo_fkey"
FOREIGN KEY ("idObjetivo") REFERENCES "ObjetivoFinanciero"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
