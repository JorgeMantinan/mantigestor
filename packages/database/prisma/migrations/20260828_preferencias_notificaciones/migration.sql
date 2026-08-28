-- CreateTable
CREATE TABLE "preferencias_notificaciones" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'in_app',
    "categoria" TEXT NOT NULL,
    "diasAntelacion" INTEGER NOT NULL DEFAULT 15,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferencias_notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "preferencias_notificaciones_perfilId_canal_categoria_key" ON "preferencias_notificaciones"("perfilId", "canal", "categoria");

-- AddForeignKey
ALTER TABLE "preferencias_notificaciones" ADD CONSTRAINT "preferencias_notificaciones_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
