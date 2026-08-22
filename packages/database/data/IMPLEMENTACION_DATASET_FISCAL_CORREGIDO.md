# ESPECIFICACIÓN DE IMPLEMENTACIÓN — DATASET FISCAL ESPAÑA CORREGIDO

## Archivos de entrada

Usar estos archivos:

1. `Espana_Fiscal_2025_CORREGIDO.xlsx`
2. `csv_bbdd_importables_CORREGIDOS.zip`

No utilizar directamente los archivos originales como fuente de producción.

Los archivos originales deben conservarse como `raw/original`.

---

# 1. OBJETIVO

Integrar el dataset fiscal corregido en la aplicación existente y en la BBDD actual.

La aplicación debe ser capaz de:

- determinar jurisdicción;
- determinar administración competente;
- determinar impuesto;
- determinar modelo;
- determinar obligación;
- determinar plazo;
- determinar documentación;
- aplicar reglas;
- realizar cálculos;
- preguntar únicamente por variables que falten;
- conservar trazabilidad de cada resultado;
- saber de qué fuente procede cada dato;
- saber para qué ejercicio era válido;
- distinguir territorio común y régimen foral;
- distinguir dato verificado de dato pendiente;
- no usar datos históricos o futuros como si fueran vigentes.

---

# 2. REGLA PRINCIPAL

NO hacer una importación destructiva.

Crear primero una capa:

`raw`

para conservar los CSV originales.

Después:

`staging`

para importar los archivos corregidos.

Después:

`normalized`

para las entidades normalizadas.

Después:

`production`

para las reglas que el motor puede utilizar.

Flujo:

RAW
→ STAGING
→ NORMALIZED
→ VALIDATION
→ PRODUCTION

---

# 3. ESTADOS

Implementar exactamente:

DRAFT
RESEARCH
SECONDARY_SOURCE
OFFICIAL_UNVERIFIED
OFFICIAL_VERIFIED
SUPERSEDED
EXPIRED

Regla:

```text
production_allowed = true
SOLO
status == OFFICIAL_VERIFIED
```

Excepciones únicamente para entidades puramente descriptivas que no produzcan un resultado fiscal.

---

# 4. FUENTES

Crear tabla:

`sources`

Campos:

```text
id
authority
title
source_type
url
document_url
publication_date
effective_from
effective_to
tax_year
retrieved_at
verification_status
notes
```

Importar inicialmente `21_fuentes_oficiales.csv`.

Las URLs oficiales ya incluidas deben conservarse.

Toda regla fiscal de producción necesita:

`source_id`

No aceptar:

```text
source = "varias fuentes"
source = "internet"
source = "fuentes especializadas"
```

como fuente de producción.

---

# 5. JURISDICCIONES

Crear tabla:

`jurisdictions`

Importar `22_jurisdicciones.csv`.

MUY IMPORTANTE:

NO representar País Vasco como una única jurisdicción fiscal.

Debe existir:

```text
Álava
Bizkaia
Gipuzkoa
```

por separado.

También:

```text
Navarra
```

por separado.

Y:

```text
Territorio común
```

como ámbito estatal común.

Ceuta y Melilla deben existir como ciudades autónomas.

---

# 6. ADMINISTRACIONES

Crear:

`administrations`

Importar `23_administraciones.csv`.

No confundir:

jurisdiction
con
administration

Ejemplo:

```text
jurisdiction = Bizkaia
administration = Hacienda Foral de Bizkaia
```

---

# 7. MODELOS

Migrar:

`01_modelos_y_obligaciones.csv`

a:

```text
tax_models
```

y crear:

```text
tax_model_versions
```

Clave lógica:

```text
administration_id
model_number
tax_year
version
```

NO usar únicamente:

```text
model_number
```

---

# 8. MODELO 037 — CORRECCIÓN OBLIGATORIA

El archivo corregido contiene:

```text
MOD037
status = SUPERSEDED
effective_to = 2025-02-02
replacement_model = MOD036
production_eligible = NO
```

Esto debe mantenerse.

Desde el 03/02/2025 no permitir que el motor recomiende el 037 como modelo vigente.

Crear una prueba:

```text
case:
persona_fisica
alta_actividad
tax_year = 2025
date >= 2025-02-03
```

Resultado esperado:

```text
MOD036
```

NO:

```text
MOD037
```

El 037 puede aparecer únicamente si el caso se sitúa históricamente antes del 03/02/2025.

---

# 9. TEMPORALIDAD

Toda entidad fiscal relevante debe disponer de:

```text
tax_year
application_year
effective_from
effective_to
```

Nunca sustituir:

`tax_year`

por un simple:

`year`.

Ejemplo:

```text
publication_date = 2026
tax_year = 2025
```

es válido si la norma publicada en 2026 regula el ejercicio 2025.

---

# 10. RETA / SEGURIDAD SOCIAL

Los archivos corregidos marcan:

```text
04_RETA...
tax_year = 2026

05_Cotizaciones...
tax_year = 2026
```

NO utilizar estos datos para resolver consultas 2025.

No borrar los datos.

Mantenerlos como históricos/versionados.

---

# 11. IMPUESTO SOBRE SOCIEDADES

La tabla de tipos contiene columnas de previsión:

```text
tipo_2027_previsto
tipo_2028_previsto
tipo_2029_previsto
```

NO usar estas columnas directamente en el motor.

Migrarlas a versiones por año:

```text
tax = IS
tax_year = 2025
status = ...

tax = IS
tax_year = 2026
status = ...

tax = IS
tax_year = 2027
status = DRAFT/RESEARCH
```

Hasta verificación oficial, los datos futuros no son resultados fiscales definitivos.

---

# 12. CALENDARIO

No construir el motor exclusivamente con:

```text
fecha_limite_2026
```

Migrar el calendario como datos de referencia.

Crear:

`deadlines`

con:

```text
obligation_id
tax_year
period_type
deadline_type
deadline_rule
deadline_rule_json
effective_from
effective_to
source_id
status
```

El motor debe poder calcular:

```text
mes siguiente
trimestre siguiente
X días después del hecho
X meses después del hecho
fin del ejercicio
fecha fija
```

Las fechas concretas del CSV corregido son referencias 2026 y están marcadas como `RULE_REVIEW_REQUIRED`.

---

# 13. TERRITORIO COMÚN / FORAL

Implementar una capa de competencia territorial antes de calcular impuestos.

Flujo:

```text
USER_FACTS
↓
RESIDENCE / LOCATION
↓
JURISDICTION_ENGINE
↓
ADMINISTRATION_ENGINE
↓
TAX_ENGINE
↓
MODEL_ENGINE
```

NO hacer:

```text
CCAA = País Vasco
→ aplicar escala autonómica estándar
```

Hacer:

```text
territory = Álava
→ jurisdiction = ES-PV-AR
→ administration = ADM_AL
→ aplicar normativa foral correspondiente
```

Lo mismo para Bizkaia, Gipuzkoa y Navarra.

---

# 14. IRPF

Separar:

```text
IRPF_TERRITORIO_COMUN
IRPF_NAVARRA
IRPF_ALAVA
IRPF_BIZKAIA
IRPF_GIPUZKOA
```

Las hojas 10 y 11 actuales son datos de partida, no deben convertirse automáticamente en una única escala universal.

Para territorio común:

```text
parte estatal
+
parte autonómica
```

según las reglas del ejercicio.

Para Navarra/País Vasco:

usar el régimen foral correspondiente.

---

# 15. IVA

La hoja `08_iva_tipos` es un catálogo inicial.

NO construir una regla:

```text
producto = alimentación
→ IVA 10%
```

sin analizar:

- producto concreto
- servicio
- operación
- destinatario
- territorio
- régimen especial
- exención
- operación intracomunitaria
- exportación/importación
- fecha
- condiciones especiales

Crear:

```text
vat_rules
```

con:

```text
product_category
operation_type
recipient_type
territory
tax_year
rate
conditions_json
exceptions_json
source_id
effective_from
effective_to
status
```

---

# 16. ISD

No almacenar únicamente:

```text
territorio
tipo
```

Crear reglas independientes para:

```text
sucesión
donación de dinero
donación de inmueble
donación de otros bienes
seguro de vida
no residente
residente
```

Variables importantes:

```text
causante_residencia
donante_residencia
donatario_residencia
ubicacion_inmueble
tipo_bien
parentesco
grado_parentesco
importe
fecha
```

La competencia territorial debe resolverse antes del cálculo.

---

# 17. ITP / AJD

NO utilizar una tabla:

```text
CCAA → tipo general
```

como cálculo definitivo.

Crear:

```text
itp_rules
```

Variables:

```text
operation_type
asset_type
property_location
value
buyer_type
seller_type
habitual_residence
age
disability
large_family
first_home
conditions_json
```

Distinguir al menos:

```text
inmueble
vehículo
derechos reales
arrendamientos
operaciones societarias cuando proceda
AJD
```

Los tipos generales actuales del dataset que provienen de fuentes secundarias permanecen como `SECONDARY_SOURCE` hasta verificación oficial.

---

# 18. SANCIONES

Las hojas 18 y 19 contienen información útil, pero parte de sus fuentes son secundarias.

Migrar:

```text
source_class = SECONDARY
```

como:

```text
SECONDARY_SOURCE
```

hasta que exista fuente oficial exacta.

No convertir:

```text
"múltiples fuentes coincidentes"
```

en:

```text
OFFICIAL_VERIFIED
```

---

# 19. PYME / EMPRESA

No utilizar:

```text
PYME
```

como categoría fiscal universal.

Crear:

```text
classification_system
purpose
legal_basis
effective_from
effective_to
```

Ejemplos de sistemas distintos:

```text
PYME_UE
EMPRESA_REDUCIDA_DIMENSION_IS
AUDITORIA
CONTABILIDAD
AYUDAS
ESTADISTICA
MERCANTIL
```

Una empresa puede pertenecer a una categoría en un sistema y no en otro.

---

# 20. MOTOR DE CASOS

Crear:

`tax_cases`

Ejemplo:

```json
{
  "case": "DONATION_MONEY_PARENT_CHILD",
  "tax_year": 2025,
  "facts": {
    "amount": 50000,
    "asset": "MONEY",
    "relationship": "PARENT_CHILD"
  }
}
```

Después ejecutar:

```text
jurisdiction_engine
tax_engine
obligation_engine
model_engine
deadline_engine
document_engine
calculation_engine
```

---

# 21. QUESTION ENGINE

El sistema debe preguntar únicamente por variables que cambien el resultado.

Ejemplo:

Usuario:

"Mi padre me ha dado 50.000 €."

Primero:

```text
candidate_event = MONEY_RECEIVED_FROM_PERSON
```

Preguntar:

1. ¿Es una donación o un préstamo?
2. ¿Dónde reside fiscalmente tu padre?
3. ¿Dónde resides fiscalmente tú?
4. ¿Cuándo se realizó?
5. ¿Importe exacto?
6. ¿Existe documento?
7. ¿Dinero, inmueble u otro bien?

Después de cada respuesta:

```text
update_context()
reevaluate_rules()
remove_irrelevant_questions()
add_required_questions()
```

---

# 22. RESULTADO

Cada resultado fiscal debe devolver algo similar a:

```json
{
  "tax_year": 2025,
  "jurisdiction": "ES-GA",
  "administration": "ADM_GA",
  "tax": "ISD",
  "models": [],
  "obligations": [],
  "deadlines": [],
  "documents": [],
  "calculation": {},
  "confidence": "NEEDS_REVIEW",
  "sources": [],
  "warnings": []
}
```

Nunca devolver únicamente:

```text
"tienes que pagar X"
```

---

# 23. TRAZABILIDAD

Cada resultado debe poder reconstruirse:

```text
resultado
→ regla
→ fuente
→ versión
→ jurisdicción
→ impuesto
→ ejercicio
→ hechos de entrada
```

Esto es obligatorio para auditoría.

---

# 24. VALIDACIONES DE IMPORTACIÓN

Crear validaciones:

```text
source_id obligatorio
tax_year válido
effective_from <= effective_to
jurisdiction_id existente
administration_id existente
tax_id existente
model_id existente
status válido
currency válido
porcentajes numéricos
importes numéricos
sin versiones solapadas
```

Errores de integridad deben impedir la importación a `production`.

---

# 25. AUDITOR AUTOMÁTICO

Crear checks:

1. modelo sin fuente
2. modelo sin ejercicio
3. modelo histórico tratado como vigente
4. dato 2026 utilizado en 2025
5. dato futuro utilizado como vigente
6. regla sin jurisdicción cuando es territorial
7. regla sin administración cuando procede
8. fuente secundaria en producción
9. dato inferido en producción
10. versión solapada
11. regla contradictoria
12. plazo sin fuente
13. cálculo sin fórmula
14. beneficio sin condición
15. caso sin variables suficientes
16. modelo duplicado
17. moneda inválida
18. porcentaje inválido
19. importe almacenado como texto
20. territorio foral tratado como territorio común

---

# 26. TESTS OBLIGATORIOS

Crear tests para:

## Test 1 — Modelo 037

Fecha:

2025-01-15

Resultado histórico:

MOD037 permitido.

Fecha:

2025-02-03

Resultado:

MOD036.

---

## Test 2 — Navarra

Usuario residente fiscal en Navarra.

No devolver escala autonómica de territorio común.

Debe seleccionar jurisdicción foral Navarra.

---

## Test 3 — Álava

Usuario residente fiscal en Álava.

Debe seleccionar:

```text
ES-PV-AR
ADM_AL
```

No:

```text
País Vasco genérico
```

---

## Test 4 — Bizkaia

Debe seleccionar:

```text
ES-PV-BI
ADM_BI
```

---

## Test 5 — Gipuzkoa

Debe seleccionar:

```text
ES-PV-SS
ADM_SS
```

---

## Test 6 — RETA

Consulta:

tax_year = 2025

No puede utilizar filas con:

tax_year = 2026.

---

## Test 7 — IS futuro

Consulta:

tax_year = 2025

No puede utilizar:

tipo_2027_previsto.

---

## Test 8 — Fuente secundaria

Regla:

status = SECONDARY_SOURCE

No puede producir:

`confidence = VERIFIED`.

---

## Test 9 — ITP inmueble

Debe preguntar ubicación del inmueble si falta.

---

## Test 10 — Donación dinero

Debe preguntar residencia del donante y donatario si son necesarias para determinar competencia.

---

# 27. MIGRACIÓN

Crear scripts:

```text
/scripts/import_raw
/scripts/import_staging
/scripts/normalize
/scripts/validate
/scripts/promote_production
```

Nunca ejecutar SQL de producción directamente desde una conversación de IA.

El código de importación debe ser idempotente.

Es decir:

ejecutarlo dos veces no debe duplicar registros.

Usar claves naturales o UUID estables.

---

# 28. LOG DE IMPORTACIÓN

Crear:

`import_log`

Campos:

```text
run_id
file
sheet
rows_read
rows_inserted
rows_updated
rows_rejected
errors
started_at
finished_at
```

---

# 29. DATOS RECHAZADOS

Crear:

`data_quality_errors`

Campos:

```text
id
run_id
source_file
row_number
field
value
error_code
message
severity
resolved
```

No descartar silenciosamente ninguna fila.

---

# 30. ESTRUCTURA RECOMENDADA

```text
data/
  raw/
  staging/
  normalized/
  production/
  rejected/
  sources/
  tests/

scripts/
  import_raw/
  import_staging/
  normalize/
  validate/
  promote_production/

docs/
  DATA_MODEL.md
  SOURCE_POLICY.md
  RULE_ENGINE.md
  JURISDICTION_RULES.md
  DATA_QUALITY_REPORT.md
```

---

# 31. CRITERIO DE PRODUCCIÓN

Un dato puede pasar a producción solo cuando:

```text
source_id != null
AND
status = OFFICIAL_VERIFIED
AND
tax_year != null
AND
effective_from != null
AND
jurisdiction correcta
AND
no existe conflicto
```

Para reglas territoriales:

```text
jurisdiction_id != null
```

Para modelos:

```text
administration_id != null
```

---

# 32. NO HACER

NO:

- inventar modelos;
- inventar plazos;
- inferir tipos;
- convertir fuentes secundarias en oficiales;
- mezclar 2025 con 2026;
- mezclar territorio común con foral;
- usar País Vasco como una sola Hacienda;
- utilizar previsiones como normativa;
- sobrescribir versiones históricas;
- borrar datos originales;
- ejecutar cálculos con datos sin fuente;
- ocultar datos rechazados.

---

# 33. ORDEN DE EJECUCIÓN

Ejecutar en este orden:

1. backup
2. RAW
3. STAGING
4. importar `21_fuentes_oficiales`
5. importar `22_jurisdicciones`
6. importar `23_administraciones`
7. importar `24_estados_verificacion`
8. importar `25_auditoria_correcciones`
9. importar modelos
10. importar impuestos
11. importar tipos
12. importar IRPF
13. importar RETA/Seguridad Social
14. importar calendario
15. importar IVA
16. importar ISD
17. importar ITP/AJD
18. importar sanciones
19. crear reglas territoriales
20. normalizar
21. ejecutar auditor
22. ejecutar tests
23. corregir errores
24. promover únicamente OFFICIAL_VERIFIED a production

---

# 34. RESULTADO FINAL

La aplicación debe poder contestar:

- qué impuesto aplica;
- qué administración es competente;
- qué modelo corresponde;
- si existe obligación;
- cuándo se presenta;
- qué documentación hace falta;
- cómo se calcula;
- qué beneficio puede aplicar;
- qué reglas territoriales intervienen;
- qué fuente respalda cada resultado;
- para qué ejercicio es válido;
- si el resultado está verificado.

Y debe poder explicar:

```text
RESULTADO
↓
REGLA
↓
FUENTE
↓
EJERCICIO
↓
JURISDICCIÓN
↓
ADMINISTRACIÓN
```

No marcar el sistema como `production-ready` hasta que el auditor y los tests pasen.
