-- A6: regresión del QR "Compartir" y del portal de cliente.
-- /api/factura-publica y /api/cliente-portal buscan por tokenCliente, pero
-- ningún insert generaba token → desde la auditoría el QR (?token=<id>) daba 404.

-- 1) Backfill: un token compartido por cliente y TIPO (perfilId + nif + tipo),
--    para que un QR emitido a un cliente no mezcle con facturas de compra
UPDATE facturas f
SET "tokenCliente" = g.token
FROM (
  SELECT DISTINCT ON ("perfilId", "nifContraparte", "tipo")
    "perfilId", "nifContraparte", "tipo", gen_random_uuid()::text AS token
  FROM facturas
  WHERE "tokenCliente" IS NULL
    AND "nifContraparte" IS NOT NULL
    AND "nifContraparte" <> ''
  ORDER BY "perfilId", "nifContraparte", "tipo", id
) g
WHERE f."tokenCliente" IS NULL
  AND f."perfilId" = g."perfilId"
  AND f."nifContraparte" = g."nifContraparte"
  AND f."tipo" = g."tipo";

-- facturas sin contraparte: token propio
UPDATE facturas SET "tokenCliente" = gen_random_uuid()::text WHERE "tokenCliente" IS NULL;

-- 2) Trigger: TODO insert nuevo recibe token (reutiliza el del mismo cliente+tipo
--    para que el portal muestre todas las facturas de esa relación)
CREATE OR REPLACE FUNCTION generar_token_cliente_factura() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE token_existente text;
BEGIN
  IF NEW."tokenCliente" IS NULL THEN
    IF NEW."nifContraparte" IS NOT NULL AND NEW."nifContraparte" <> '' THEN
      SELECT f."tokenCliente" INTO token_existente
        FROM facturas f
        WHERE f."perfilId" = NEW."perfilId"
          AND f."nifContraparte" = NEW."nifContraparte"
          AND f."tipo" = NEW."tipo"
          AND f."tokenCliente" IS NOT NULL
        LIMIT 1;
    END IF;
    NEW."tokenCliente" := COALESCE(token_existente, gen_random_uuid()::text);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generar_token_cliente ON facturas;
CREATE TRIGGER trg_generar_token_cliente
  BEFORE INSERT ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION generar_token_cliente_factura();
