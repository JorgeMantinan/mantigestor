-- CreateTable
CREATE TABLE "plantillas_factura" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "emisorReceptor" TEXT NOT NULL,
    "nifContraparte" TEXT,
    "concepto" TEXT,
    "baseImponible" INTEGER NOT NULL,
    "iva" INTEGER NOT NULL DEFAULT 21,
    "categoriaGasto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plantillas_factura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plantillas_factura_perfilId_idx" ON "plantillas_factura"("perfilId");
