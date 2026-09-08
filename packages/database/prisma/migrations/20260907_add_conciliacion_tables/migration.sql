CREATE TABLE "movimientos_banco" (
  "id" TEXT NOT NULL,
  "perfilId" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL,
  "concepto" TEXT NOT NULL,
  "importe" INTEGER NOT NULL,
  "saldo" INTEGER NOT NULL,
  "referencia" TEXT,
  "categoria" TEXT,
  "conciliado" BOOLEAN NOT NULL DEFAULT false,
  "facturaId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimientos_banco_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conciliacion_logs" (
  "id" TEXT NOT NULL,
  "perfilId" TEXT NOT NULL,
  "movimientoId" TEXT NOT NULL,
  "facturaId" TEXT NOT NULL,
  "puntuacion" INTEGER NOT NULL,
  "accion" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conciliacion_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "movimientos_banco_perfilId_idx" ON "movimientos_banco"("perfilId");
CREATE INDEX "movimientos_banco_facturaId_idx" ON "movimientos_banco"("facturaId");
CREATE INDEX "conciliacion_logs_perfilId_idx" ON "conciliacion_logs"("perfilId");
CREATE INDEX "conciliacion_logs_facturaId_idx" ON "conciliacion_logs"("facturaId");

ALTER TABLE "movimientos_banco" ADD CONSTRAINT "movimientos_banco_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "movimientos_banco" ADD CONSTRAINT "movimientos_banco_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conciliacion_logs" ADD CONSTRAINT "conciliacion_logs_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conciliacion_logs" ADD CONSTRAINT "conciliacion_logs_movimientoId_fkey" FOREIGN KEY ("movimientoId") REFERENCES "movimientos_banco"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conciliacion_logs" ADD CONSTRAINT "conciliacion_logs_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
