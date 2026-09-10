-- AlterTable: Add personal data fields for Declaración de la Renta (Modelo 100)
ALTER TABLE "perfiles" ADD COLUMN "situacionCivil" TEXT,
ADD COLUMN "fechaNacimiento" TIMESTAMP(3),
ADD COLUMN "numeroHijos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "hijosEdades" TEXT,
ADD COLUMN "tieneDiscapacidad" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "porcentajeDiscapacidad" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "familiaNumerosa" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "planPensiones" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "segurosDependencia" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "donaciones" INTEGER NOT NULL DEFAULT 0;
