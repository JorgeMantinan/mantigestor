-- CreateTable
CREATE TABLE "nominas" (
    "id" TEXT NOT NULL,
    "perfilId" TEXT NOT NULL,
    "empleada" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anyo" INTEGER NOT NULL,
    "salarioBruto" INTEGER NOT NULL,
    "irpf" DOUBLE PRECISION NOT NULL,
    "neto" INTEGER NOT NULL,
    "rol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nominas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nominas_perfilId_anyo_idx" ON "nominas"("perfilId", "anyo");

-- AddForeignKey
ALTER TABLE "nominas" ADD CONSTRAINT "nominas_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
