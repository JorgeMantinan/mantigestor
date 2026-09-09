-- CreateTable
CREATE TABLE "versiones_registro" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "datos" JSONB NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "versiones_registro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "versiones_registro_perfilId_idx" ON "versiones_registro"("perfilId");

-- CreateIndex
CREATE INDEX "versiones_registro_entidad_entidadId_idx" ON "versiones_registro"("entidad", "entidadId");
