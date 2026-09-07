ALTER TABLE "nominas" ADD COLUMN "seguridadSocial" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "nominas" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "propiedades_alquiler" ADD COLUMN "fechaInicioContrato" TIMESTAMP(3);
ALTER TABLE "propiedades_alquiler" ADD COLUMN "duracionContratoMeses" INTEGER;
ALTER TABLE "propiedades_alquiler" ADD COLUMN "proximaRevision" TIMESTAMP(3);
ALTER TABLE "facturas" ADD COLUMN "descuentoPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 0;
