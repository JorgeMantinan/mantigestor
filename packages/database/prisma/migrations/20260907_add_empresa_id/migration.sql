ALTER TABLE "facturas" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "nominas" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "documentos" ADD COLUMN "empresaId" TEXT;
ALTER TABLE "propiedades_alquiler" ADD COLUMN "empresaId" TEXT;
CREATE INDEX "facturas_empresaId_idx" ON "facturas"("empresaId");
CREATE INDEX "nominas_empresaId_idx" ON "nominas"("empresaId");
CREATE INDEX "documentos_empresaId_idx" ON "documentos"("empresaId");
CREATE INDEX "propiedades_alquiler_empresaId_idx" ON "propiedades_alquiler"("empresaId");