INSERT INTO "Prioridad" ("nombre")
SELECT 'Alto impacto'
WHERE NOT EXISTS (
  SELECT 1 FROM "Prioridad" WHERE lower("nombre") = lower('Alto impacto')
);

INSERT INTO "Prioridad" ("nombre")
SELECT 'Impacto medio'
WHERE NOT EXISTS (
  SELECT 1 FROM "Prioridad" WHERE lower("nombre") = lower('Impacto medio')
);

INSERT INTO "Prioridad" ("nombre")
SELECT 'Bajo impacto'
WHERE NOT EXISTS (
  SELECT 1 FROM "Prioridad" WHERE lower("nombre") = lower('Bajo impacto')
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'EstrategiaPlan'
      AND column_name = 'tipoEstrategia'
  ) THEN
    UPDATE "EstrategiaPlan" AS estrategia
    SET "idPrioridad" = prioridad."id"
    FROM "Prioridad" AS prioridad
    WHERE estrategia."idPrioridad" IS NULL
      AND estrategia."tipoEstrategia" = 'high'
      AND lower(prioridad."nombre") = lower('Alto impacto');

    UPDATE "EstrategiaPlan" AS estrategia
    SET "idPrioridad" = prioridad."id"
    FROM "Prioridad" AS prioridad
    WHERE estrategia."idPrioridad" IS NULL
      AND estrategia."tipoEstrategia" = 'medium'
      AND lower(prioridad."nombre") = lower('Impacto medio');

    UPDATE "EstrategiaPlan" AS estrategia
    SET "idPrioridad" = prioridad."id"
    FROM "Prioridad" AS prioridad
    WHERE estrategia."idPrioridad" IS NULL
      AND estrategia."tipoEstrategia" = 'low'
      AND lower(prioridad."nombre") = lower('Bajo impacto');

    ALTER TABLE "EstrategiaPlan" DROP COLUMN "tipoEstrategia";
  END IF;
END $$;

UPDATE "EstrategiaPlan" AS estrategia
SET "idPrioridad" = prioridad."id"
FROM "Prioridad" AS prioridad
WHERE estrategia."idPrioridad" IS NULL
  AND lower(prioridad."nombre") = lower('Impacto medio');

ALTER TABLE "EstrategiaPlan"
ALTER COLUMN "idPrioridad" SET NOT NULL;
