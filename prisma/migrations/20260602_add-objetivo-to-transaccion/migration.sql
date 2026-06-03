ALTER TABLE "Transaccion" ADD COLUMN "idObjetivo" INTEGER;

ALTER TABLE "Transaccion"
ADD CONSTRAINT "Transaccion_idObjetivo_fkey"
FOREIGN KEY ("idObjetivo") REFERENCES "ObjetivoFinanciero"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Transaccion_idObjetivo_idx" ON "Transaccion"("idObjetivo");
