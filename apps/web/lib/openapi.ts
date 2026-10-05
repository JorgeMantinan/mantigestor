/**
 * Especificación OpenAPI3 de la API de MantiGestor.
 *
 * Generada a partir del código real de apps/web/app/api (todas las route.ts).
 * Si se añade una ruta o cambia un body/parámetro, ACTUALIZAR AQUÍ.
 * Consumida por app/api/docs/route.ts → UI en /api-docs (Swagger UI local).
 * El test __tests__/openapi.test.ts comprueba que spec y código no se desincronicen.
 */

const respuestasComunes = {
  SinSesion: { description: 'No autenticado' },
  SinPermiso: { description: 'Perfil activo sin acceso' },
  Invalido: { description: 'Datos de entrada inválidos (Zod)' },
  RateLimit: { description: 'Demasiadas peticiones (rate limit)' },
  Servidor: { description: 'Error interno del servidor' },
  RequierePro: { description: 'Requiere plan PRO (función con IA)' },
}

const schemas = {
  Factura: {
    type: 'object',
    required: ['tipo', 'numero', 'emisorReceptor', 'fechaEmision', 'baseImponible', 'iva', 'total'],
    properties: {
      tipo: { type: 'string', enum: ['ingreso', 'gasto', 'proforma'] },
      numero: { type: 'string', maxLength: 50, example: 'F-2026-001' },
      emisorReceptor: { type: 'string', maxLength: 200, example: 'Cliente Ejemplo S.L.' },
      nifContraparte: { type: 'string', nullable: true, pattern: '^[A-Za-z0-9]{9}$' },
      fechaEmision: { type: 'string', format: 'date', example: '2026-03-15' },
      fechaVencimiento: { type: 'string', nullable: true },
      baseImponible: { type: 'integer', description: 'céntimos', example: 100000 },
      iva: { type: 'integer', enum: [0, 4, 10, 21] },
      total: { type: 'integer', description: 'céntimos', example: 121000 },
      estado: { type: 'string', enum: ['pendiente', 'pagada', 'vencida', 'cancelada'] },
      empresaId: { type: 'string', nullable: true },
      descuentoPorcentaje: { type: 'number', minimum: 0, maximum: 100 },
      categoriaGasto: { type: 'string', maxLength: 50, nullable: true },
      notas: { type: 'string', maxLength: 5000, nullable: true },
      notasPrivadas: { type: 'string', maxLength: 5000, nullable: true },
      deducible: { type: 'boolean', nullable: true },
      tags: { type: 'string', nullable: true },
      pdfUrl: { type: 'string', nullable: true },
      moneda: { type: 'string', example: 'EUR' },
      tipoCambio: { type: 'number' },
      pagosParciales: { type: 'string', nullable: true, description: 'JSON de pagos parciales' },
    },
  },
  PlantillaRecurrente: {
    type: 'object',
    required: ['tipo', 'numero', 'emisorReceptor', 'baseImponible', 'iva', 'diaGeneracion'],
    properties: {
      tipo: { type: 'string', example: 'ingreso' },
      numero: { type: 'string', maxLength: 50 },
      emisorReceptor: { type: 'string', maxLength: 200 },
      nifContraparte: { type: 'string', maxLength: 20, nullable: true },
      baseImponible: { type: 'number', description: 'EUR (se almacena en céntimos)', example: 100.5 },
      iva: { type: 'integer', enum: [0, 4, 10, 21] },
      diaGeneracion: { type: 'integer', minimum: 1, maximum: 28 },
      diaEmail: { type: 'integer', minimum: 1, maximum: 28, nullable: true },
      notas: { type: 'string', maxLength: 2000, nullable: true },
    },
  },
  ActualizarPlantilla: {
    type: 'object',
    properties: {
      activa: { type: 'boolean' },
      diaGeneracion: { type: 'integer', minimum: 1, maximum: 28 },
      diaEmail: { type: 'integer', minimum: 1, maximum: 28, nullable: true },
      notas: { type: 'string', maxLength: 2000, nullable: true },
      tipo: { type: 'string', maxLength: 30 },
      numero: { type: 'string', maxLength: 50 },
      emisorReceptor: { type: 'string', maxLength: 200 },
      nifContraparte: { type: 'string', maxLength: 20, nullable: true },
      baseImponible: { type: 'number' },
      iva: { type: 'integer', enum: [0, 4, 10, 21] },
    },
  },
  ChatMensaje: {
    type: 'object',
    required: ['mensaje'],
    properties: {
      mensaje: { type: 'string', minLength: 1, maxLength: 4000 },
      contexto: { type: 'string', enum: ['facturas', 'fiscal', 'nominas', 'alquiler', 'general'] },
    },
  },
  Notificacion: {
    type: 'object',
    required: ['tipo', 'contenido'],
    properties: {
      tipo: { type: 'string', maxLength: 50 },
      contenido: { type: 'string', maxLength: 2000 },
    },
  },
  Preferencias: {
    type: 'object',
    required: ['preferencias'],
    properties: {
      preferencias: {
        type: 'array',
        maxItems: 50,
        items: {
          type: 'object',
          required: ['canal', 'categoria', 'diasAntelacion', 'activo'],
          properties: {
            canal: { type: 'string', enum: ['in_app', 'email'] },
            categoria: { type: 'string', maxLength: 50, example: 'iva' },
            diasAntelacion: { type: 'integer', minimum: 1, maximum: 30 },
            activo: { type: 'boolean' },
          },
        },
      },
    },
  },
  Movimiento: {
    type: 'object',
    required: ['fecha', 'concepto', 'importe', 'saldo'],
    properties: {
      fecha: { type: 'string', format: 'date' },
      concepto: { type: 'string' },
      importe: { type: 'number' },
      saldo: { type: 'number' },
      referencia: { type: 'string', nullable: true },
      categoria: { type: 'string', enum: ['ingreso', 'gasto', 'transferencia'], nullable: true },
    },
  },
  Movimientos: {
    type: 'object',
    required: ['movimientos'],
    properties: {
      movimientos: { type: 'array', minItems: 1, maxItems: 500, items: { $ref: '#/components/schemas/Movimiento' } },
    },
  },
  Conciliar: {
    type: 'object',
    required: ['movimientoId', 'facturaId', 'puntuacion', 'accion'],
    properties: {
      movimientoId: { type: 'string' },
      facturaId: { type: 'string' },
      puntuacion: { type: 'integer', minimum: 0, maximum: 100 },
      accion: { type: 'string', enum: ['auto', 'manual'] },
    },
  },
  Empresa: {
    type: 'object',
    required: ['nombre', 'nif'],
    properties: {
      nombre: { type: 'string', maxLength: 100 },
      nif: { type: 'string', maxLength: 20 },
      direccion: { type: 'string', maxLength: 200 },
    },
  },
  PerfilFiscal: {
    type: 'object',
    properties: {
      comunidadFiscal: { type: 'string', maxLength: 80, nullable: true, example: 'Madrid (Comunidad de)' },
      perfilFiscal: { type: 'string', enum: ['autonomo', 'sociedad', 'empleado', 'alquilador'], nullable: true },
      empresas: { type: 'string', maxLength: 10000, nullable: true, description: 'JSON del array de empresas' },
    },
  },
  Version: {
    type: 'object',
    required: ['entidad', 'entidadId', 'version', 'datos'],
    properties: {
      entidad: { type: 'string', example: 'factura' },
      entidadId: { type: 'string' },
      version: { type: 'integer', minimum: 1 },
      datos: { type: 'object', additionalProperties: true },
    },
  },
  SuscripcionVerify: {
    type: 'object',
    properties: {
      sessionId: { type: 'string', description: 'Stripe Checkout Session id (debe pertenecer al usuario)' },
    },
  },
}

/** Parámetro reutilizable: perfil activo (multi-persona). */
const perfilActivoParam = {
  name: 'x-perfil-activo',
  in: 'header',
  required: false,
  description: 'perfiles.id a usar como perfil activo (gestores). Si se omite, el perfil propio.',
  schema: { type: 'string' },
}

const cronSeguridad = {
  name: 'Authorization',
  in: 'header',
  required: true,
  description: 'Bearer <CRON_SECRET> (alternativo: header x-cron-secret)',
  schema: { type: 'string', example: 'Bearer TU_CRON_SECRET' },
}

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'MantiGestor API',
    version: '2.0.0',
    description: [
      'API de la plataforma de gestión fiscal MantiGestor.',
      '',
      '**Autenticación**: sesión de Supabase (cookies `sb-*-auth-token`). La UI de Swagger envía las cookies del navegador (withCredentials), así que «Try it out» funciona si estás logueado en la app.',
      '',
      '**Perfil activo (multi-persona)**: las rutas de datos aceptan la cabecera opcional `x-perfil-activo` con el id de un perfil que gestionas; sin ella se usa tu perfil propio.',
      '',
      '**Rate limiting**:30 peticiones/min por IP salvo indicación (IA10, OCR20/lote3, Stripe5, email5, demo3, recurrentes20).',
      '',
      '**Planes**: las funciones con IA (`/api/ai/chat`, `/api/facturas/parsear-voz`, `/api/fiscal/clasificar-documento`) requieren plan PRO.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Mismo origen (mantigestor.vercel.app)' }],
  tags: [
    { name: 'Facturas', description: 'CRUD de facturas, envío por email y OCR' },
    { name: 'Recurrentes', description: 'Plantillas de facturación automática' },
    { name: 'Fiscal', description: 'Perfil fiscal, modelos, escalas y datos de referencia' },
    { name: 'Multi-persona', description: 'Gestión de personas asociadas (gestores/gestionados)' },
    { name: 'Conciliación', description: 'Importación y conciliación de extractos bancarios' },
    { name: 'Empresas', description: 'Empresas del usuario' },
    { name: 'IA', description: 'Funciones con IA (requieren plan PRO)' },
    { name: 'OCR', description: 'Extracción de datos de facturas y tickets' },
    { name: 'Notificaciones', description: 'Notificaciones in-app y push' },
    { name: 'Stripe', description: 'Suscripciones y pagos (opcional)' },
    { name: 'Públicas', description: 'Endpoints sin sesión (portal de cliente, demo, tipos de cambio)' },
    { name: 'Crons', description: 'Tareas programadas (requieren CRON_SECRET)' },
  ],
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'sb-<project-ref>-auth-token' },
    },
    parameters: {
      perfilActivo: perfilActivoParam,
      cronSecret: cronSeguridad,
    },
    responses: {
      SinSesion: respuestasComunes.SinSesion,
      Invalido: respuestasComunes.Invalido,
      RateLimit: respuestasComunes.RateLimit,
      Servidor: respuestasComunes.Servidor,
      RequierePro: respuestasComunes.RequierePro,
    },
    schemas,
  },
  security: [{ cookieAuth: [] }],
  paths: {
    // ── Facturas ──────────────────────────────────────────────────────────
    '/api/facturas': {
      get: {
        tags: ['Facturas'],
        summary: 'Listar facturas del perfil activo',
        description: 'Rate limit: 30/min.',
        parameters: [
          { $ref: '#/components/parameters/perfilActivo' },
          { name: 'tipo', in: 'query', schema: { type: 'string', enum: ['ingreso', 'gasto', 'proforma'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 }, description: 'Página (10 por página en la UI)' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1000 } },
        ],
        responses: { 200: { description: 'Lista de facturas' }, 401: { $ref: '#/components/responses/SinSesion' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
      post: {
        tags: ['Facturas'],
        summary: 'Crear factura',
        description: 'Validado con FacturaSchema (importes en céntimos). Rate limit: 30/min.',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Factura' } } } },
        responses: { 201: { description: 'Factura creada' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/facturas/{id}': {
      get: {
        tags: ['Facturas'], summary: 'Obtener factura por id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/perfilActivo' }],
        responses: { 200: { description: 'Factura' }, 401: { $ref: '#/components/responses/SinSesion' }, 404: { description: 'No encontrada' } },
      },
      put: {
        tags: ['Facturas'], summary: 'Actualizar factura',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Factura' } } } },
        responses: { 200: { description: 'Factura actualizada' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      delete: {
        tags: ['Facturas'], summary: 'Eliminar factura',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/perfilActivo' }],
        responses: { 200: { description: 'Eliminada' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/facturas/enviar-email': {
      post: {
        tags: ['Facturas'],
        summary: 'Enviar factura por email (adjunto PDF)',
        description: 'El HTML se construye en servidor (no se acepta htmlBody). Rate limit: 5/min.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['facturaId', 'email'],
                properties: {
                  facturaId: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  pdfBase64: { type: 'string', description: 'PDF en base64 (máx ~10MB)', maxLength: 14000000 },
                  numero: { type: 'string' },
                  empresaNombre: { type: 'string' },
                  asunto: { type: 'string', maxLength: 200 },
                  cuerpo: { type: 'string', maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Email enviado (o skipped si falta RESEND_API_KEY)' }, 403: { description: 'La factura no pertenece al perfil activo' }, 429: { $ref: '#/components/responses/RateLimit' }, 502: { description: 'Error de envío (Resend)' } },
      },
    },
    '/api/facturas/importar-extracto': {
      post: {
        tags: ['Facturas'],
        summary: 'Parsear extracto bancario (CSV)',
        description: 'Rate limit: 30/min. Tamaño máximo500KB.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['csv', 'formato'],
                properties: {
                  csv: { type: 'string', maxLength: 500000, description: 'Texto completo del extracto' },
                  formato: { type: 'string', enum: ['csv_santander', 'csv_bbva', 'csv_caixabank', 'csv_sabadell', 'csv_bankia', 'generico'] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Movimientos clasificados (ingreso/gasto)' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/facturas/parsear-voz': {
      post: {
        tags: ['IA'],
        summary: 'Convertir texto de voz en factura (IA)',
        description: 'Requiere plan PRO. Rate limit: 10/min.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['texto'], properties: { texto: { type: 'string', maxLength: 2000 } } } } } },
        responses: { 200: { description: 'Datos extraídos (emisor, importes, fecha...)' }, 400: { $ref: '#/components/responses/Invalido' }, 403: { $ref: '#/components/responses/RequierePro' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/facturas/recurrentes': {
      get: {
        tags: ['Recurrentes'], summary: 'Listar plantillas recurrentes del perfil activo',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        responses: { 200: { description: 'Lista de plantillas' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      post: {
        tags: ['Recurrentes'], summary: 'Crear plantilla recurrente', description: 'Rate limit: 20/min.',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PlantillaRecurrente' } } } },
        responses: { 201: { description: 'Plantilla creada' }, 400: { $ref: '#/components/responses/Invalido' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/facturas/recurrentes/{id}': {
      patch: {
        tags: ['Recurrentes'], summary: 'Actualizar plantilla recurrente', description: 'Rate limit: 10/min.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ActualizarPlantilla' } } } },
        responses: { 200: { description: 'Actualizada' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      delete: {
        tags: ['Recurrentes'], summary: 'Eliminar plantilla recurrente', description: 'Rate limit: 10/min.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }, { $ref: '#/components/parameters/perfilActivo' }],
        responses: { 200: { description: 'Eliminada' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/facturas/recurrentes/enviar-email': {
      post: {
        tags: ['Recurrentes'],
        summary: 'Enviar recordatorio de facturas recurrentes generadas',
        description: 'Rate limit: 5/min.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'contrapartes', 'mes', 'anyo'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  nombre: { type: 'string', maxLength: 100 },
                  contrapartes: { type: 'array', maxItems: 200, items: { type: 'string', maxLength: 200 } },
                  mes: { type: 'integer', minimum: 1, maximum: 12 },
                  anyo: { type: 'integer', minimum: 2000, maximum: 2100 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Email enviado' }, 400: { $ref: '#/components/responses/Invalido' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    // ── Fiscal ────────────────────────────────────────────────────────────
    '/api/fiscal/perfil': {
      get: {
        tags: ['Fiscal'], summary: 'Obtener perfil fiscal y comunidad',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        responses: { 200: { description: 'Perfil fiscal' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      put: {
        tags: ['Fiscal'], summary: 'Guardar perfil fiscal',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/PerfilFiscal' } } } },
        responses: { 200: { description: 'Guardado' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/fiscal/datos': {
      get: {
        tags: ['Fiscal'],
        summary: 'Escalas y datos fiscales oficiales (minimos, escalas IRPF, etc.)',
        description: 'Caché en cliente de24h. Rate limit: 30/min.',
        parameters: [
          { name: 'comunidad', in: 'query', schema: { type: 'string', example: 'Madrid (Comunidad de)' } },
          { name: 'taxYear', in: 'query', schema: { type: 'integer', example: 2026 } },
        ],
        responses: { 200: { description: 'Datos fiscales' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/fiscal/irpf': {
      get: {
        tags: ['Fiscal'], summary: 'Escalas IRPF para una comunidad',
        parameters: [{ name: 'comunidad', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Escalas estatal y autonómica' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      post: {
        tags: ['Fiscal'], summary: 'Calcular IRPF (retenciones del trabajo)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['comunidad', 'baseLiquidableEur', 'taxYear'],
                properties: {
                  comunidad: { type: 'string' },
                  baseLiquidableEur: { type: 'number', example: 25000 },
                  taxYear: { type: 'integer', example: 2026 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Cuota estatal + autonómica' }, 400: { $ref: '#/components/responses/Invalido' }, 422: { description: 'Sin escalas para esa comunidad/año' } },
      },
    },
    '/api/fiscal/modelos': {
      get: {
        tags: ['Fiscal'], summary: 'Listar modelos generados de un periodo',
        parameters: [
          { name: 'anyo', in: 'query', required: true, schema: { type: 'integer', example: 2026 } },
          { name: 'trimestre', in: 'query', required: true, schema: { type: 'integer', enum: [1, 2, 3, 4] } },
          { $ref: '#/components/parameters/perfilActivo' },
        ],
        responses: { 200: { description: 'Modelos generados (303,111,130...)' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      post: {
        tags: ['Fiscal'], summary: '(Re)generar modelos de un periodo',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['anyo', 'trimestre'], properties: { anyo: { type: 'integer' }, trimestre: { type: 'integer', enum: [1, 2, 3, 4] } } } } } },
        responses: { 200: { description: 'Modelos regenerados' }, 400: { $ref: '#/components/responses/Invalido' } },
      },
    },
    '/api/fiscal/versiones': {
      get: {
        tags: ['Fiscal'], summary: 'Historial de versiones de una entidad',
        parameters: [
          { name: 'entidad', in: 'query', required: true, schema: { type: 'string', example: 'factura' } },
          { name: 'entidadId', in: 'query', required: true, schema: { type: 'string' } },
          { $ref: '#/components/parameters/perfilActivo' },
        ],
        responses: { 200: { description: 'Versiones' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      post: {
        tags: ['Fiscal'], summary: 'Guardar una versión de una entidad',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Version' } } } },
        responses: { 201: { description: 'Versión guardada' }, 400: { $ref: '#/components/responses/Invalido' } },
      },
    },
    '/api/fiscal/historial-actividad': {
      get: {
        tags: ['Fiscal'], summary: 'Audit log del perfil activo',
        description: 'Ordenado por createdAt desc (máx200).',
        parameters: [
          { $ref: '#/components/parameters/perfilActivo' },
          { name: 'entidad', in: 'query', schema: { type: 'string' } },
          { name: 'accion', in: 'query', schema: { type: 'string' } },
          { name: 'desde', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: { 200: { description: 'Entradas del log' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/fiscal/preferencias-notificaciones': {
      get: {
        tags: ['Notificaciones'], summary: 'Preferencias de notificación del perfil activo',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        responses: { 200: { description: 'Lista de preferencias' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      put: {
        tags: ['Notificaciones'], summary: 'Reemplazar preferencias de notificación',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Preferencias' } } } },
        responses: { 200: { description: 'Preferencias guardadas' }, 400: { $ref: '#/components/responses/Invalido' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    // ── Multi-persona ─────────────────────────────────────────────────────
    '/api/fiscal/asesor/dashboard': {
      get: {
        tags: ['Multi-persona'],
        summary: 'Dashboard consolidado del asesor (resumen por cliente)',
        description: 'Agrega facturas y suscripciones de todos los gestionados en lote. Rate limit: 30/min.',
        responses: { 200: { description: 'Una fila por persona gestionada' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/fiscal/mis-personas': {
      get: {
        tags: ['Multi-persona'], summary: 'Personas que gestiono + quienes me gestionan a mí',
        responses: { 200: { description: 'Lista de personas (tipo: gestiono | me_gestiona)' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/fiscal/asociar-persona': {
      post: {
        tags: ['Multi-persona'],
        summary: 'Invitar a una persona a ser gestionada (envía email de confirmación)',
        description: 'La asociación solo se crea cuando el invitado confirma desde el enlace. Rate limit: 5/min.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  nombre: { type: 'string', maxLength: 100 },
                  nif: { type: 'string', maxLength: 20 },
                  rol: { type: 'string', enum: ['gestor', 'visualizador'], default: 'gestor' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Invitación creada y enviada' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/fiscal/confirmar-asociacion': {
      get: {
        tags: ['Multi-persona'], summary: 'Datos del invitador (público, previo a login)',
        security: [],
        parameters: [
          { name: 'invitacion', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'email', in: 'query', required: true, schema: { type: 'string', format: 'email' } },
        ],
        responses: { 200: { description: 'Nombre/email del invitador y estado' }, 404: { description: 'Invitación no encontrada' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
      post: {
        tags: ['Multi-persona'],
        summary: 'Confirmar la invitación (crea la asociación gestor→gestionado)',
        description: 'Requiere sesión con el email de la invitación. Rate limit: 5/min.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['invitacionId', 'email'], properties: { invitacionId: { type: 'string' }, email: { type: 'string', format: 'email' } } } } } },
        responses: { 200: { description: 'Asociación confirmada' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' }, 403: { description: 'El email no coincide con la sesión' } },
      },
    },
    '/api/fiscal/desasociar-persona': {
      delete: {
        tags: ['Multi-persona'], summary: 'Desasociar un perfil que yo gestiono',
        parameters: [{ name: 'perfilId', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Desasociado' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/fiscal/revocar-acceso': {
      post: {
        tags: ['Multi-persona'], summary: 'Revocar el acceso de un gestor a MI perfil',
        description: 'El gestionado retira a su gestor. Rate limit: 30/min.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['gestorUserId', 'perfilId'], properties: { gestorUserId: { type: 'string' }, perfilId: { type: 'string' } } } } } },
        responses: { 200: { description: 'Acceso revocado' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    '/api/fiscal/referidos': {
      get: {
        tags: ['Multi-persona'], summary: 'Estadísticas de referidos',
        responses: { 200: { description: 'Código, totales y estado de invitaciones' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      post: {
        tags: ['Multi-persona'],
        summary: 'Invitar a otro usuario (programa de referidos)',
        description: 'NO crea ninguna asociación: solo cuenta para las estadísticas. Rate limit: 30/min.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' }, nombre: { type: 'string', maxLength: 100 } } } } } },
        responses: { 200: { description: 'Invitación de referido creada' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
    },
    // ── Conciliación ──────────────────────────────────────────────────────
    '/api/fiscal/importar-email': {
      post: {
        tags: ['Conciliación'],
        summary: 'Importar facturas desde un buzón IMAP',
        description: 'Conexión saliente solo a hosts IMAP públicos (143/993 con TLS verificado). Rate limit: 10/min.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'server', 'port'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  server: { type: 'string', example: 'imap.gmail.com' },
                  port: { type: 'integer', enum: [143, 993] },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Facturas encontradas en el buzón (PDF adjuntos)' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { description: 'Credenciales de email incorrectas o no autenticado' }, 429: { $ref: '#/components/responses/RateLimit' }, 502: { description: 'No se pudo conectar al servidor de correo' } },
      },
    },
    '/api/fiscal/conciliacion': {
      get: {
        tags: ['Conciliación'], summary: 'Movimientos importados del banco',
        parameters: [
          { $ref: '#/components/parameters/perfilActivo' },
          { name: 'conciliado', in: 'query', schema: { type: 'boolean' } },
          { name: 'fechaDesde', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'fechaHasta', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Movimientos' }, 401: { $ref: '#/components/responses/SinSesion' } },
      },
      post: {
        tags: ['Conciliación'], summary: 'Guardar movimientos importados (máx500)',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Movimientos' } } } },
        responses: { 200: { description: 'Movimientos guardados' }, 400: { $ref: '#/components/responses/Invalido' } },
      },
    },
    '/api/fiscal/conciliacion/conciliar': {
      post: {
        tags: ['Conciliación'], summary: 'Conciliar un movimiento con una factura',
        parameters: [{ $ref: '#/components/parameters/perfilActivo' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Conciliar' } } } },
        responses: { 200: { description: 'Conciliado' }, 400: { $ref: '#/components/responses/Invalido' } },
      },
    },
    // ── Empresas ──────────────────────────────────────────────────────────
    '/api/fiscal/empresas': {
      get: { tags: ['Empresas'], summary: 'Listar empresas', responses: { 200: { description: 'Empresas' }, 401: { $ref: '#/components/responses/SinSesion' } } },
      post: {
        tags: ['Empresas'], summary: 'Crear empresa',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Empresa' } } } },
        responses: { 201: { description: 'Empresa creada' }, 400: { $ref: '#/components/responses/Invalido' } },
      },
      put: {
        tags: ['Empresas'], summary: 'Actualizar empresa',
        requestBody: { required: true, content: { 'application/json': { schema: { allOf: [{ $ref: '#/components/schemas/Empresa' }], type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } } } },
        responses: { 200: { description: 'Empresa actualizada' }, 400: { $ref: '#/components/responses/Invalido' } },
      },
      delete: {
        tags: ['Empresas'], summary: 'Eliminar empresa',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } } } } },
        responses: { 200: { description: 'Empresa eliminada' }, 400: { $ref: '#/components/responses/Invalido' } },
      },
    },
    // ── IA / OCR ──────────────────────────────────────────────────────────
    '/api/ai/chat': {
      post: {
        tags: ['IA'],
        summary: 'Chat con el asistente fiscal (Claude)',
        description: 'Requiere plan PRO. Rate limit: 10/min. El historial se guarda en BD con rol user/assistant.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ChatMensaje' } } } },
        responses: { 200: { description: 'Respuesta del asistente' }, 400: { $ref: '#/components/responses/Invalido' }, 403: { $ref: '#/components/responses/RequierePro' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/fiscal/clasificar-documento': {
      post: {
        tags: ['IA'],
        summary: 'Clasificar un documento PDF con IA (nómina/factura/alquiler/extracto)',
        description: 'Requiere plan PRO y que el documento pertenezca al perfil activo. Rate limit: 10/min.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['pdfUrl'], properties: { pdfUrl: { type: 'string', description: 'URL de Storage (pública o firmada) del documento' } } } } } },
        responses: { 200: { description: 'Clasificación: tipo, confianza, campos y resumen' }, 400: { $ref: '#/components/responses/Invalido' }, 403: { $ref: '#/components/responses/RequierePro' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/ocr': {
      post: {
        tags: ['OCR'], summary: 'Extraer datos de una factura PDF (OCR local, sin IA)', description: 'Rate limit: 20/min. El PDF debe pertenecer al perfil activo.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['pdfUrl'], properties: { pdfUrl: { type: 'string' } } } } } },
        responses: { 200: { description: 'OcrResult (numero, emisor, base, iva, total, fecha...)' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/ocr-image': {
      post: {
        tags: ['OCR'], summary: 'Extraer datos de un ticket desde imagen (OCR Tesseract)', description: 'Rate limit: 30/min. Máx5MB. Formatos: jpeg, png, webp, gif.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['image', 'mediaType'], properties: { image: { type: 'string', description: 'data URL en base64' }, mediaType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] } } } } } },
        responses: { 200: { description: 'OcrResult' }, 400: { $ref: '#/components/responses/Invalido' }, 413: { description: 'Imagen >5MB' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/ocr-batch': {
      post: {
        tags: ['OCR'], summary: 'OCR en lote (máx10 archivos)', description: 'Rate limit: 3/min. Concurrencia5.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['archivos'], properties: { archivos: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object', required: ['url', 'nombre'], properties: { url: { type: 'string' }, nombre: { type: 'string' } } } } } } } } },
        responses: { 200: { description: 'Resultados por archivo' }, 400: { $ref: '#/components/responses/Invalido' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    // ── Notificaciones / push ─────────────────────────────────────────────
    '/api/notificaciones': {
      post: {
        tags: ['Notificaciones'], summary: 'Crear notificación in-app', description: 'Rate limit: 30/min.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Notificacion' } } } },
        responses: { 201: { description: 'Notificación creada' }, 400: { $ref: '#/components/responses/Invalido' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/push-subscribe': {
      post: {
        tags: ['Notificaciones'], summary: 'Suscribirse a notificaciones push', description: 'Rate limit: 10/min.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subscription'],
                properties: {
                  subscription: {
                    type: 'object',
                    required: ['endpoint', 'keys'],
                    properties: {
                      endpoint: { type: 'string', format: 'uri' },
                      keys: { type: 'object', required: ['p256dh', 'auth'], properties: { p256dh: { type: 'string' }, auth: { type: 'string' } } },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Suscrito' }, 400: { $ref: '#/components/responses/Invalido' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/push-unsubscribe': {
      post: { tags: ['Notificaciones'], summary: 'Eliminar todas las suscripciones push del usuario', description: 'Sin body. Rate limit: 10/min.', responses: { 200: { description: 'Eliminadas' }, 401: { $ref: '#/components/responses/SinSesion' }, 429: { $ref: '#/components/responses/RateLimit' } } },
    },
    // ── Stripe ────────────────────────────────────────────────────────────
    '/api/stripe/checkout': {
      post: { tags: ['Stripe'], summary: 'Crear sesión de Checkout (plan PRO)', description: 'Sin body. Devuelve la URL de pago. Rate limit: 5/min. 503 si Stripe no está configurado.', responses: { 200: { description: 'URL de Stripe Checkout' }, 401: { $ref: '#/components/responses/SinSesion' }, 429: { $ref: '#/components/responses/RateLimit' }, 503: { description: 'Stripe no configurado' } } },
    },
    '/api/stripe/checkout-recurring': {
      post: {
        tags: ['Stripe'],
        summary: 'Cobro recurrente a partir de una plantilla',
        description: 'El importe se deriva EN SERVIDOR de la plantilla (el body no lo lleva). Rate limit: 5/min.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['facturaId'], properties: { facturaId: { type: 'string', description: 'id de facturas_recurrentes' }, descripcion: { type: 'string', maxLength: 200 } } } } } },
        responses: { 200: { description: 'URL de Stripe Checkout' }, 400: { $ref: '#/components/responses/Invalido' }, 401: { $ref: '#/components/responses/SinSesion' }, 404: { description: 'Plantilla no encontrada' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/stripe/portal': {
      post: { tags: ['Stripe'], summary: 'Portal de gestión de facturación (Stripe Billing Portal)', description: 'Sin body. Rate limit: 5/min.', responses: { 200: { description: 'URL del portal' }, 401: { $ref: '#/components/responses/SinSesion' }, 404: { description: 'Sin suscripción' }, 429: { $ref: '#/components/responses/RateLimit' } } },
    },
    '/api/stripe/verify-subscription': {
      post: {
        tags: ['Stripe'],
        summary: 'Verificar tras el checkout y guardar la suscripción',
        description: 'La sessionId debe pertenecer al usuario. Se guarda el estado REAL de Stripe. Rate limit: 5/min.',
        requestBody: { required: false, content: { 'application/json': { schema: { $ref: '#/components/schemas/SuscripcionVerify' } } } },
        responses: { 200: { description: 'tier + estado (PRO o BASIC)' }, 401: { $ref: '#/components/responses/SinSesion' }, 429: { $ref: '#/components/responses/RateLimit' }, 500: { description: 'Error guardando la suscripción' } },
      },
    },
    '/api/stripe/webhook': {
      post: {
        tags: ['Stripe'],
        summary: 'Webhook de Stripe (eventos de suscripción)',
        description: 'Público: se autentica con la firma `stripe-signature`. Devuelve200 siempre (idempotente).',
        security: [],
        parameters: [{ name: 'stripe-signature', in: 'header', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Evento recibido' }, 400: { description: 'Firma ausente o inválida' } },
      },
    },
    // ── Públicas ──────────────────────────────────────────────────────────
    '/api/docs': {
      get: { tags: ['Públicas'], summary: 'Esta especificación OpenAPI (JSON)', security: [], responses: { 200: { description: 'Spec OpenAPI3' } } },
    },
    '/api/stripe/status': {
      get: { tags: ['Públicas'], summary: '¿Stripe está configurado?', security: [], responses: { 200: { description: '{ configured: boolean }' } } },
    },
    '/api/tipos-cambio': {
      get: {
        tags: ['Públicas'],
        summary: 'Tipos de cambio (Frankfurter API + fallback)',
        security: [],
        parameters: [
          { name: 'base', in: 'query', schema: { type: 'string', default: 'EUR', example: 'EUR' } },
          { name: 'simbolos', in: 'query', schema: { type: 'string' }, description: 'Lista separada por comas (USD,GBP...)' },
          { name: 'publica', in: 'query', schema: { type: 'string', enum: ['1'] }, description: '1 = usar tasas fallback locales (sin salir de la app)' },
        ],
        responses: { 200: { description: 'Tasas de cambio' } },
      },
    },
    '/api/factura-publica': {
      get: {
        tags: ['Públicas'], summary: 'Factura compartida por token de cliente',
        security: [],
        parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Datos de la factura' }, 404: { description: 'Token no válido' } },
      },
    },
    '/api/cliente-portal': {
      get: {
        tags: ['Públicas'], summary: 'Portal del cliente: todas sus facturas por token',
        description: 'El token es el tokenCliente de la factura (un ID de factura NO sirve).',
        security: [],
        parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Facturas del cliente' }, 404: { description: 'Token no válido' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    '/api/demo/crear': {
      post: {
        tags: ['Públicas'],
        summary: 'Crear/resetear la cuenta demo y devolver sus credenciales',
        description: 'Público con rate limit estricto: 3/min por IP. La contraseña se genera en cada llamada.',
        requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { caso: { type: 'string', example: 'lucia-diseno' } } } } } },
        responses: { 200: { description: 'Credenciales de la demo (email, password) + datos creados' }, 400: { description: 'Caso no encontrado' }, 429: { $ref: '#/components/responses/RateLimit' } },
      },
    },
    // ── Crons ─────────────────────────────────────────────────────────────
    '/api/cron/alertas-inteligentes': { get: { tags: ['Crons'], summary: 'Alertas inteligentes por email (lunes09:00)', parameters: [{ $ref: '#/components/parameters/cronSecret' }], security: [], responses: { 200: { description: 'Alertas enviadas' }, 401: { description: 'CRON_SECRET incorrecto' } } } },
    '/api/cron/auto-backup': { get: { tags: ['Crons'], summary: 'Backup automático diario (03:00)', parameters: [{ $ref: '#/components/parameters/cronSecret' }], security: [], responses: { 200: { description: 'Backups creados' }, 401: { description: 'CRON_SECRET incorrecto' } } } },
    '/api/cron/backup-semanal': { get: { tags: ['Crons'], summary: 'Backup semanal con email (dom02:00)', parameters: [{ $ref: '#/components/parameters/cronSecret' }], security: [], responses: { 200: { description: 'Backups + emails' }, 401: { description: 'CRON_SECRET incorrecto' } } } },
    '/api/cron/generar-facturas-recurrentes': { get: { tags: ['Crons'], summary: 'Generar facturas de las plantillas recurrentes', parameters: [{ $ref: '#/components/parameters/cronSecret' }], security: [], responses: { 200: { description: 'Facturas generadas' }, 401: { description: 'CRON_SECRET incorrecto' } } } },
    '/api/cron/generar-modelos-trimestrales': { get: { tags: ['Crons'], summary: 'Regenerar modelos del trimestre cerrado', parameters: [{ $ref: '#/components/parameters/cronSecret' }], security: [], responses: { 200: { description: 'Modelos regenerados' }, 401: { description: 'CRON_SECRET incorrecto' } } } },
    '/api/cron/push-notifications': { get: { tags: ['Crons'], summary: 'Push de vencimientos fiscales (09:00)', parameters: [{ $ref: '#/components/parameters/cronSecret' }], security: [], responses: { 200: { description: 'Push enviados' }, 401: { description: 'CRON_SECRET incorrecto' } } } },
    '/api/cron/recordatorios-cobro': { get: { tags: ['Crons'], summary: 'Recordatorio de cobro de vencidas (10:00)', parameters: [{ $ref: '#/components/parameters/cronSecret' }], security: [], responses: { 200: { description: 'Emails enviados' }, 401: { description: 'CRON_SECRET incorrecto' } } } },
    '/api/cron/recordatorios-facturas': { get: { tags: ['Crons'], summary: 'Facturas por vencer (08:00)', parameters: [{ $ref: '#/components/parameters/cronSecret' }], security: [], responses: { 200: { description: 'Emails enviados' }, 401: { description: 'CRON_SECRET incorrecto' } } } },
    '/api/cron/recordatorios-plazos': { get: { tags: ['Crons'], summary: 'Vencimientos fiscales (07:00)', parameters: [{ $ref: '#/components/parameters/cronSecret' }], security: [], responses: { 200: { description: 'Emails enviados' }, 401: { description: 'CRON_SECRET incorrecto' } } } },
  },
}
