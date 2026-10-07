# MantiGestor — Contexto para Agentes de Código

## Stack
- **Monorepo:** Turborepo + pnpm
- **Web:** Next.js 14 App Router, TypeScript strict, Tailwind CSS
- **UI:** shadcn/ui (Style Luma, BaseColor Zinc, Theme Yellow hsl(47 95% 50%), Chart Emerald)
- **Font:** Roboto (Google Fonts), **Icons:** Lucide
- **DB:** Prisma 5 + PostgreSQL (Supabase)
- **Auth:** Supabase Auth (email, Google OAuth)
- **Pagos:** Stripe + PayPal
- **IA:** Claude API (Anthropic)
- **Background:** Trigger.dev
- **Tests:** Vitest (unit), Playwright (E2E)
- **Mobile:** Expo (separate, no iniciado)

## Convenciones de código
- **TypeScript estricto:** `strict: true`, `noUncheckedIndexedAccess: true`
- **Sin `any` explícito** — usar `unknown` + narrowing
- **Nombres en español** para lógica de negocio (factura, IVA, modelo-303, gestoría)
- **Nombres en inglés** para infraestructura técnica (hooks, providers, components)
- **Prisma:** nombres ASCII (anyo → año, tamanoBytes → tamañoBytes)
- **Tailwind:** usar variables CSS `--primary`, `--chart-1`, etc. definidas en `globals.css`
- **shadcn/ui:** componentes en `components/ui/`, re-export flat
- **Layout:** Sidebar colapsable + Header con avatar → layout `(dashboard)`
- **Auth pages:** `(auth)` group → login, register
- **API routes:** `app/api/` con handlers tipados
- **Validación:** Zod schemas en `packages/utils/src/validaciones/`
- **Lógica fiscal:** `packages/utils/src/fiscal/`
- **Formateadores:** `packages/utils/src/formateadores/`
- **Types compartidos:** `packages/types/src/index.ts`
- **DB client:** `packages/database/src/index.ts`

## Rutas del app
| Ruta | Grupo | Protección |
|------|-------|------------|
| `/` | pública | ninguna |
| `/login` | `(auth)` | redirige a /dashboard si auth |
| `/register` | `(auth)` | redirige a /dashboard si auth |
| `/dashboard` | `(dashboard)` | middleware: requiere auth |
| `/precios` | `(dashboard)` | pública (landing) |
| `/gestoria/facturas` | `(dashboard)` | requiere auth |
| `/gestoria/trimestres` | `(dashboard)` | requiere auth (BASIC) |
| `/gestoria/renta` | `(dashboard)` | requiere auth (BASIC) |
| `/alquiler` | `(dashboard)` | requiere auth (BASIC) |
| `/nominas` | `(dashboard)` | requiere auth (BASIC, sin IA) |
| `/alumnos` | `(dashboard)` | requiere auth |
| `/ai` | `(dashboard)` | requiere auth + tier pro (IA) |
| `/conversiones` | `(dashboard)` | requiere auth (BASIC, sin IA) |
| `/ajustes` | `(dashboard)` | requiere auth |

## Modelo de datos (Prisma)
- **Perfil** — id, userId (Supabase), email, nombre, nif, createdAt, updatedAt
- **Factura** — id, perfilId, numero, tipo(emitida/recibida), emisorReceptor, nifContraparte, fechaEmision, fechaVencimiento, baseImponible, iva, total, estado, pdfUrl, createdAt
- **Documento** — id, perfilId, tipo, nombre, tamanoBytes, url, subidoEn
- **Suscripcion** — id, perfilId, tier(BASIC/PRO), provider(stripe/paypal), providerSubscriptionId, estado, currentPeriodStart, currentPeriodEnd, createdAt
- **Notificacion** — id, perfilId, tipo, leido, contenido, creadoEn

## Suscripciones y features
- **BASIC** (free): facturas (10/mes), trimestres (auto), alumnos (10), alquiler, documentos (50MB)
- **PRO** ($15/mes): facturas ilimitadas, nóminas, alumnos ilimitados, AI, documentos (5GB), conversiones
- **Gratuito inicial:** periodo de prueba de 30 días PRO completo

## Seguridad (auditoría 2026-10-02)
- **Storage PRIVADO**: buckets `documentos` y `backups` con `public=false`; policies por carpeta usando `perfiles_accesibles(auth.uid())` (dueño + gestores, cualquier rol). **NUNCA servir un archivo sin firmar**: `getPublicUrl` solo se usa como referencia guardada en BD (FileUpload/panel); los lectores firman con `lib/storage.ts` (cliente, `firmarUrlStorage`/`firmarUrlsStorage`) o `lib/storage-server.ts` (servidor, `firmarUrlAdmin`). Las APIs que leen documentos comprueban `carpetaDeUrlStorage(url) === perfilId`.
- **RPC protegidas**: `crear_asociacion_segura` exige que el perfil pertenezca al llamante Y una invitación pendiente de ese gestor para su email (el enlace de invitación ES la confirmación del gestionado); `REVOKE ... FROM PUBLIC, anon` en las3 RPC (`20261002_seguridad_auditoria/migration.sql`).
- **Gate PRO = lo que usa IA** (regla del producto): el middleware solo protege `/ai`; las APIs `/api/ai/chat`, `/api/facturas/parsear-voz` y `fiscal/clasificar-documento` comprueban `tier==='PRO'` en servidor. Todo lo demás (nóminas, conversiones, trimestres, renta, alquiler) es BASIC.
- **Cron**: usar SIEMPRE `verificarCron(req)` de `lib/cron-auth.ts` (timing-safe, acepta Bearer o `x-cron-secret`, deniega si falta `CRON_SECRET`). `/api/*` está FUERA del gate de cookies del middleware (webhook de Stripe y crons no llevan cookies).
- **Emails**: el HTML se construye SIEMPRE en servidor con `escapeHtml` de `lib/escape-html.ts`; nunca aceptar `htmlBody` del cliente. Comprobar siempre el `{error}` de `resend.emails.send`.
- **Cabeceras**: CSP + HSTS + Permissions-Policy en `next.config.js` (revisar tras desplegar: login, Google, Stripe).
- **Demo**: `/api/demo/crear` genera la contraseña en runtime (no vive en el repo), rate limit 3/min, opera solo sobre la cuenta demo.
- **ESLint**: `next/typescript` activo con reglas en **warn** (`no-explicit-any`, `no-unused-vars`).
- **RLS blanket**: TODAS las tablas públicas tienen RLS (migración `20261006_rls_datos_fiscales`, alerta Supabase `rls_disabled_in_public`); las13 tablas de referencia fiscal tienen policy de lectura `auth.uid() IS NOT NULL` y `anon` sin grants de SELECT/TRUNCATE. Auditar con `scripts/rls-audit.ts`.
- **Ejecutar SQL con `DO $$`**: NO usar `prisma db execute` (rompe dollar-quotes/P1014) → `scripts/run-sql-pg.ts` (driver pg, multi-sentencia real).

## Best Practices (obligatorio seguirlas SIEMPRE)

### Formularios
- Todo formulario debe tener **Confirmar contraseña** en registro (nunca solo contraseña)
- Validar client-side **SIEMPRE** antes de enviar: email (`@` + `.`), campos requeridos, formatos (NIF, importes)
- Botones de submit con `disabled` durante async + texto de carga ("Guardando...")
- `try/catch` en todo handler asíncrono
- Mostrar errores al usuario (`setError`) con texto claro en español

### API Routes
- `try/catch` alrededor de TODO el handler, nunca exceptions sin capturar
- Rate limiting en51/54 rutas (30/min default, 10/min AI chat, 5/min Stripe, 3/min demo); las sin rate limit: 9 crons (`CRON_SECRET`), `stripe/webhook` (firma) y `docs` (público inofensivo)
- Auth check (`getAuthenticatedUser`) antes de procesar cualquier dato
- **NUNCA** confiar en `perfilId` del body — usar `user.id` de la sesión
- Validar input con Zod antes de tocar la BD
- Nunca pasar `historial` del cliente directamente a la IA sin filtrar `role: 'system'`
- Webhooks: idempotencia (check de duplicados antes de insert), manejo de errores con `console.error` + continue

### Seguridad
- Prompt injection: filtrar `role: 'system'` del historial del usuario antes de enviar a la IA
- IDOR: siempre verificar propiedad del recurso (`.eq('perfilId', user.id)`)
- Stripe server.ts: import dinámico `await import()` dentro del handler, no `import` estático a nivel de módulo
- Nunca exponer datos de otros usuarios por confiar en IDs del body
- Zod schemas en `packages/utils/src/validaciones/` deben reflejar EXACTAMENTE los campos de la BD
- Rate limit: clave `ip:ruta:max:ventana` (por ruta y config, no un bucket global compartido); helper `celdaCsv()` (`lib/csv-seguro.ts`) para todo export CSV (anti-fórmulas)
- `facturas.tokenCliente` lo genera un **trigger de BD** (migración `20261007_token_cliente_qr`, reutiliza el token del mismo cliente+tipo) — el QR/portal NUNCA debe usar el `id` como token público
- Al cerrar sesión o expirar: `purgarDatosPrivados()` (`lib/purgar-datos.ts`) — caches SW, localStorage privado, sessionStorage y cookie de perfil activo

### UX / Frontend
- Botones con `disabled={loadingState}` + texto alternativo mientras carga
- Formularios que escriben a BD: estado `guardando` + deshabilitar botón
- Filtros que se ven funcionales deben SER funcionales (no botones decorativos)
- Formularios que muestran "Guardar cambios" deben realmente guardar (estado + fetch + write)
- Loading states: `loading.tsx` para data fetching, inline `setLoading` para acciones de usuario
- `aria-hidden="true"` en iconos decorativos (Lucide)
- `error.tsx` en grupos de rutas raíz (`/` y `/precios`)

### Zod / Validaciones
- Los schemas en `factura.validaciones.ts` deben coincidir con los campos reales de la tabla `facturas`
- `FacturaSchema`: `tipo`, `numero`, `emisorReceptor`, `nifContraparte`, `fechaEmision`, `baseImponible`, `iva`, `total`, `estado`

### Stripe
- `try/catch` en checkout, portal y webhook
- Rate limiting en checkout y portal
- Webhook: idempotencia (comprobar si `providerSubscriptionId` ya existe antes de insert)
- Todos los errores de BD en webhook deben capturarse con `console.error`
- Retornar `200` en webhook incluso si hay error de BD (Stripe reintenta si no recibe 200)

## Testing
- Tests unitarios: `packages/utils/src/**/__tests__/`
- Tests utils (fiscal): `packages/utils/src/fiscal/__tests__/`
- Comando: `pnpm --filter=utils test` (383 tests)
- Tests web: `apps/web/__tests__/` — multi-persona (19), generador-modelos (12), cron-auth (7), middleware (6), rate-limit-ip (4), ocr (5), chunk-error (4)
- Comando: `pnpm --filter=web test` (56 tests,1 skip E2E condicional)
- Coverage web (sin thresholds): `pnpm --filter=web exec vitest run --coverage` (incluye `lib/**`, `app/api/**/route.ts`, `middleware.ts`)
- Tests E2E: `apps/web/e2e/` (14 specs Playwright: auth, navigation, public-pages, conversiones, visual)
- Coverage configurado en vitest.config.ts raíz (packages/utils + types, thresholds80/80/75)
- Lint con TODOS los dirs: `pnpm --filter=web lint` (app, components, lib, hooks, contexts, __tests__, e2e, middleware.ts)

## Deploy (Vercel)
- **Repositorio**: `github.com/JorgeMantinan/mantigestor`
- **Vercel Project**: conectado a GitHub, auto-deploy en cada push a master
- **Root Directory**: `apps/web` (configurado en Dashboard, no en vercel.json)
- **Build Command**: `cd ../.. && npx turbo build --filter=web`
- **Output Directory**: `.next`
- **Install Command**: `cd ../.. && pnpm install`
- **Env vars**: todas las del `.env.local` configuradas en Vercel (Production)
- Sin vercel.json en repo (se configuró vía Dashboard para evitar errores de parsing)

## Comandos útiles
```bash
pnpm dev              # Arrancar todo en dev
pnpm --filter=web build   # Build producción web (77 páginas +54 rutas API, 0 errores)
pnpm --filter=web test   # Tests vitest web (56)
pnpm --filter=utils test # Tests vitest utils (fiscal,383)
pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/migrations/20260825_multi_persona.sql  # Migración multi-persona
pnpm db:push          # Push schema a Supabase
pnpm --filter=database exec -- dotenv -e ../../.env.local -- tsx scripts/run-sql-pg.ts prisma/migrations/<x>/migration.sql  # Ejecutar SQL multi-sentencia (DO $$)
pnpm --filter=database exec -- dotenv -e ../../.env.local -- tsx scripts/rls-audit.ts  # Auditar RLS de todas las tablas
pnpm db:generate      # Regenerar Prisma client
pnpm typecheck        # TypeScript check global
pnpm --filter=web lint    # Lint web
git add -A; git commit -m "msg"; git push origin master  # Deploy a Vercel
```

## Enlaces Supabase
- Google OAuth: configurado ✅
- Azure/Outlook OAuth: no se usa (botón eliminado de login/registro; solo Google)
- Todas las credenciales en `.env.local` raíz ✅

## Crons y email (Vercel / Resend)
- **`vercel.json` DEBE vivir en `apps/web/`** (dentro del Root Directory): si está en la raíz del repo Vercel NO lo lee y **ningún cron se registra** (así estuvo hasta 2026-10-07:9 crons muertos desde septiembre → verificar tras cambios: `vercel crons list` debe mostrar los9 y `vercel logs <url> --since 12h`)
- **Probar crons SIEMPRE con `vercel crons run /api/cron/<ruta> --scope manti`** (dispara como Vercel, con su cabecera real). Un `curl` con el valor de `vercel env pull` da 401 SIEMPRE: el `CRON_SECRET` que ve el runtime (48 chars) no coincide con el del almacén (11 chars) — Vercel inyecta el suyo en la invocación. `verificarCron` además normaliza comillas de ambos lados
- **Resend sin dominio verificado**: solo puede enviar desde `onboarding@resend.dev` y **solo al email de la cuenta Resend** (`jorgemantinanmontero@gmail.com`). Cualquier email a otros destinatarios → 403 hasta verificar un dominio en resend.com/domains (añadir después `EMAIL_FROM` en Vercel). Los crons usan `EMAIL_FROM || onboarding@resend.dev`
- Backups por usuario (JSON: facturas/documentos/suscripciones/notificaciones): `auto-backup` (diario 03:00 → CSV al bucket privado `backups` + notificación) y `backup-semanal` (dom 02:00 → JSON al bucket + **adjunto por email**; omite destinatarios `.test`/`.local`)

## Estado del proyecto
- **77 páginas +54 rutas API, 0 errores de build.** Prácticamente todo el MVP implementado.
- Stripe integrado (checkout, portal, webhook) — opcional, si faltan env vars muestra "Próximamente"
- OCR de facturas con Anthropic Claude API — botón "Escanear factura con IA" auto-rellena formulario
- Subida de archivos con dropzone + validación + progreso
- Notificaciones en header (dropdown con badge)
- Loading/Error states en todas las rutas
- Tasas de cambio en tiempo real (Frankfurter API + fallback hardcoded)
- SEO metadata en layouts y root page
- Rate limiting en51/54 API routes (in-memory, Upstash opcional; crons con `CRON_SECRET`)
- Middleware con graceful fallback si faltan NEXT_PUBLIC_SUPABASE_URL/KEY
- **Deploy en Vercel funcional** (Root Directory: apps/web)
- **Todos los inserts corregidos**: id explícito con `crypto.randomUUID()` en todas las tablas Prisma-managed
- **Registro de perfil fijo**: ahora incluye `userId` para que las consultas por `userId` funcionen correctamente
- **Tooltips en calculadoras**: las calculadoras tienen `LabelConAyuda` + guías `GUIA_*` en `lib/fiscal/guia-fiscal.ts`
- **Pre-relleno de datos reales**: `cargarDatosReales()` auto-carga y rellena calculadoras 100, 111, 309, 349 (baseGeneral, pagosFraccionados, bases IVA, operaciones intracomunitarias)
- **Modelos fiscales implementados**: 036/037, 100, 111, 115, 117, 123, 130, 131, 143, 145, 151, 170, 179, 180, 182, 184, 189, 190, 193, 194, 200, 202, 210, 211, 216, 220, 222, 232, 233, 236, 282, 296, 303, 309, 345, 347, 349, 369, 390, 600, 714, 720, 721, **+ calculadora Plusvalía municipal (IIVTNU)** (cada uno: utils en `packages/utils/src/fiscal/`, calculadora UI, test, guía y export PDF)
- **Export PDF**: botón `BotonPDF` en todos los modelos fiscales (id `pdf-modelo-XXX` en el wrapper `<div>`)
- **Deep-link a calculadoras**: `/fiscal?seccion=<clave>` abre directamente una calculadora/modelo (se valida contra `SECCIONES_CALCULADORAS`/`SECCIONES_MODELOS`/`SECCIONES_UTILIDADES`). El sidebar tiene el grupo "Modelos rápidos" con accesos a 303/130/111/100/RETA.
- **Calc 390 auto**: `Calculadora390` auto-genera el resumen anual IVA desde las facturas del año (`resultadosIvaAnuales` + `calcularModelo390`), con export CSV.
- **Dark mode desplegables**: `color-scheme: dark` en `.dark` de `globals.css` + `select`/`select option` con `bg-background text-foreground` (corrige popups de `<select>` nativos en modo oscuro)
- **Auto-relleno 130/303**: `cargarDatosReales()` calcula también `baseSop21/10/4` (bases IVA soportadas), `base130Ingresos`, `base130Gastos` y `retencionesNomina` para pre-rellenar los modelos 130 y 303 desde facturas/nóminas
- **Recordatorios de plazos**: `useFiscalReminders` (cliente) crea notificaciones in-app de vencimientos futuros (≤15 días) al cargar sesión; cron `/api/cron/recordatorios-plazos` envía email (Resend) a usuarios con vencimientos HOY/MAÑANA. Cron configurado en `vercel.json` (`0 7 * * *`).

## Multi-persona (gestión de otras personas)
- Nueva tabla `perfil_asociado` (ownerUserId, perfilId, rol) — gestiones de otras personas (cónyuge, madre, etc.)
- `resolvePerfilActivo()` helper que lee el header `x-perfil-activo`
- `PersonaActivaProvider` context + hook `usePersonaActiva()`
- 3 API routes: `/api/fiscal/mis-personas`, `/api/fiscal/asociar-persona`, `/api/fiscal/desasociar-persona`
- Persona selector dropdown en Header + badge en Sidebar
- Página de gestión: `/ajustes/personas`
- RLS: funciones SQL `perfiles_accesibles()` + `es_gestor_del_perfil()`, acceso gestor en 7 tablas
- Email de invitación vía Resend al asociar (link `/register?invitado=true&email=...`)
- Registro invitado: adopta perfil pendiente (`userId: pending:email`)
## NOTA IMPORTANTE
- No hacer llamadas a createClient() o createServerClient() durante SSR/prerenderizado de Next.js. Usar lazy initialization (useCallback o dynamic imports) en componentes cliente que renderizan en servidor.
- Middleware usa `createServerClient` de `@supabase/ssr` con guard check de env vars para evitar crash en build/dev
- `.env.local` raíz se carga via `dotenv -e ../../.env.local` en los scripts de `apps/web/package.json`
- Stripe es **opcional** — todo el build funciona sin sus variables. Misma filosofía para cualquier integración externa.
