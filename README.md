# MantiGestor

Webapp de gestión para autónomos españoles: facturas, modelos fiscales, nóminas, alquileres y documentos en una sola aplicación, con OCR de facturas por IA y cálculo automático de declaraciones. SaaS con planes BASIC (gratuito) y PRO de pago. Desplegada en producción y accesible con registro.

## Características

| Área | Qué hace |
|---|---|
| Facturas con IA | OCR (Tesseract.js) + Claude para extraer y validar datos desde foto o PDF; facturas emitidas y recibidas |
| Fiscalidad | Más de 40 modelos y calculadoras (303, 130, 111, 100, 347, 349, 190, 200, plusvalía municipal, etc.) con cálculo automático, guías y export PDF |
| Recordatorios | Avisos de vencimientos fiscales y de facturas (in-app y email vía Resend), cron diario |
| Nóminas y retenciones | Cálculo de retenciones de IRPF (plan BASIC, sin IA) |
| Alquileres | Inquilinos, cobros y gastos deducibles |
| Documentos | Subida con dropzone, buckets privados de Supabase con URLs firmadas, backup automático diario/semanal |
| Multi-persona | Gestión de otras personas (cónyuge, familiares) desde una cuenta, con invitación por email |
| Suscripciones | Planes BASIC y PRO con Stripe (checkout, portal, webhook); PayPal como proveedor adicional |
| Conversiones | Conversión de documentos (plan BASIC, sin IA) |

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript estricto, Tailwind CSS, shadcn/ui, Lucide |
| Backend | Next.js Route Handlers + Server Actions, validación con Zod |
| Datos | PostgreSQL (Supabase) + Prisma 5 |
| Auth | Supabase Auth (email y Google OAuth) |
| IA | Anthropic Claude API (OCR de facturas, clasificación, chat) |
| Pagos | Stripe (+ PayPal como proveedor de suscripción) |
| Email / Push | Resend, Web Push (VAPID) |
| Rate limiting | In-memory (Upstash Redis opcional) |
| Tareas programadas | Crons de Vercel (Trigger.dev no se usa) |
| Monorepo | Turborepo + pnpm workspaces |
| Testing | Vitest (unit) + Playwright (E2E) |

## Estructura

```
mantigestor/
├── apps/
│   └── web/               Next.js: app router, api routes, e2e (Playwright)
├── packages/
│   ├── database/          Prisma schema, migraciones, scripts (RLS, SQL multi-sentencia)
│   ├── types/             Tipos y DTOs compartidos (TypeScript estricto)
│   └── utils/             Utilidades puras: fiscal, validaciones (Zod), formateadores, suscripción
├── turbo.json             Pipeline: dev · build · lint · typecheck · test
└── vitest.config.ts       Configuración de tests unitarios (utils + types)
```

## Requisitos

- Node.js >= 20
- pnpm 11
- Proyecto Supabase (base de datos PostgreSQL)
- Clave de API de Anthropic (Claude)
- Cuentas de Stripe y/o PayPal (opcionales; sin ellas la app muestra "Próximamente")

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local    # rellena Supabase, Anthropic, Stripe, etc.
pnpm db:push                  # sincroniza el esquema Prisma con Supabase
pnpm dev                      # turbo dev → http://localhost:3000
```

Comandos útiles:

```bash
pnpm --filter=web build       # build de producción de la web
pnpm db:generate              # regenerar el cliente Prisma
pnpm typecheck                # TypeScript check global
pnpm --filter=web lint        # lint de la web
```

Para ejecutar SQL multi-sentencia (migraciones con `DO $$`), usar el script `run-sql-pg.ts` de `packages/database` (no `prisma db execute`):

```bash
pnpm --filter=database exec -- dotenv -e ../../.env.local -- tsx scripts/run-sql-pg.ts prisma/migrations/<x>/migration.sql
```

## Tests

```bash
pnpm --filter=utils test      # tests unitarios de utils (fiscal, validaciones): 383 tests
pnpm --filter=web test        # tests unitarios de la web: 56 tests
pnpm test                     # todos (turbo)
pnpm test:e2e                 # E2E con Playwright (14 specs: auth, navigation, fiscal, etc.)
pnpm test:e2e:ui              # E2E en modo interactivo
```

Coverage:

- Utils + types: configurado en `vitest.config.ts` raíz (umbrales 80/80/75)
- Web: `pnpm --filter=web exec vitest run --coverage` (sin umbrales)

## Variables de entorno

Definidas en `.env.example` (copiar a `.env.local` en la raíz):

| Grupo | Variables |
|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Base de datos | `DATABASE_URL`, `DIRECT_URL` |
| IA (Claude) | `ANTHROPIC_API_KEY` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRO_PRICE_ID` |
| Web Push (VAPID) | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` |
| App | `NEXT_PUBLIC_APP_URL` |
| Upstash (opcional) | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

Además, el código usa (no están en `.env.example`): `RESEND_API_KEY` y `EMAIL_FROM` (emails transaccionales; si falta `RESEND_API_KEY` los envíos se omiten sin romper el flujo) y `CRON_SECRET` (autenticación de los crons de Vercel).

## Despliegue

- Repositorio: `github.com/JorgeMantinan/mantigestor`
- Vercel en producción, auto-deploy en cada push a `master`
- Root Directory en Vercel: `apps/web` (configurado en el Dashboard)
- Build Command: `cd ../.. && npx turbo build --filter=web`; Output: `.next`; Install: `cd ../.. && pnpm install`
- `vercel.json` (crons) vive en `apps/web/`, no en la raíz
- Variables de entorno configuradas en Vercel (Production)

## Estado

- Funciona en producción: 77 páginas + 54 rutas API, build sin errores; MVP prácticamente completo
- Multi-persona, OCR con IA, modelos fiscales con export PDF, backups automáticos y recordatorios implementados
- Stripe integrado (checkout, portal, webhook); es opcional: sin variables, la sección de pagos muestra "Próximamente"
- Resend sin dominio verificado solo puede enviar al email de la propia cuenta Resend
- Pendientes declarados: modo offline, firma digital / TicketBAI, alertas por WhatsApp, exportación contable directa a AEAT; app móvil Expo no iniciada

## Licencia

Código visible bajo [PolyForm Noncommercial 1.0.0](LICENSE): uso personal, de aprendizaje o investigación permitido; cualquier uso comercial requiere autorización expresa. © 2026 Jorge Mantiñán Montero.

Los datos fiscales calculados son orientativos y no sustituyen a un asesor fiscal.
