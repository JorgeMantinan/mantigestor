CREATE TABLE "facturas_recurrentes" (
  "id" TEXT NOT NULL,
  "perfilId" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "emisorReceptor" TEXT NOT NULL,
  "nifContraparte" TEXT,
  "baseImponible" INTEGER NOT NULL,
  "iva" INTEGER NOT NULL,
  "diaGeneracion" INTEGER NOT NULL,
  "diaEmail" INTEGER,
  "activa" BOOLEAN NOT NULL DEFAULT true,
  "ultimaGeneracion" TIMESTAMP(3),
  "notas" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "facturas_recurrentes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "facturas_recurrentes_perfilId_idx" ON "facturas_recurrentes"("perfilId");
