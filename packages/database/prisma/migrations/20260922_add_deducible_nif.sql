-- Migration: Add deducible to facturas and inquilinoNif to propiedades_alquiler
ALTER TABLE "facturas" ADD COLUMN "deducible" BOOLEAN DEFAULT true;
ALTER TABLE "propiedades_alquiler" ADD COLUMN "inquilinoNif" TEXT;
