-- Migration: add aiAjustado column to PlanFinanciero
ALTER TABLE "PlanFinanciero"
ADD COLUMN IF NOT EXISTS "aiAjustado" boolean DEFAULT false;
