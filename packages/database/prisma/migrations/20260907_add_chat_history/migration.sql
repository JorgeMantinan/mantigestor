CREATE TABLE "chat_historial" (
  "id" TEXT NOT NULL,
  "perfilId" TEXT NOT NULL,
  "rol" TEXT NOT NULL,
  "contenido" TEXT NOT NULL,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "chat_historial_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "chat_historial_perfilId_idx" ON "chat_historial"("perfilId");
