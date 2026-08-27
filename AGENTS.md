# MantiGestor — Contexto para Agentes de Código

## Stack
- **Monorepo:** Turborepo + pnpm
- **Web:** Next.js 14 App Router, TypeScript strict, Tailwind CSS
- **UI:** shadcn/ui (Style Luma, BaseColor Zinc, Theme Yellow hsl(47 95% 50%), Chart Emerald)
- **Font:** Roboto (Google Fonts), **Icons:** Lucide
- **DB:** Prisma 5 + PostgreSQL (Supabase)
- **Auth:** Supabase Auth (email, Google OAuth, Azure/Outlook OAuth)
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
| `/gestoria/trimestres` | `(dashboard)` | requiere auth + tier basic+ |
| `/gestoria/renta` | `(dashboard)` | requiere auth + tier basic+ |
| `/alquiler` | `(dashboard)` | requiere auth + tier basic+ |
| `/nominas` | `(dashboard)` | requiere auth + tier pro |
| `/alumnos` | `(dashboard)` | requiere auth |
| `/ai` | `(dashboard)` | requiere auth + tier pro |
| `/conversiones` | `(dashboard)` | requiere auth + tier pro |
| `/ajustes` | `(dashboard)` | requiere auth |

## Modelo de datos (Prisma)
- **Perfil** — id, userId (Supabase), email, nombre, nif, createdAt, updatedAt
- **Factura** — id, perfilId, numero, tipo(emitida/recibida), emisorReceptor, nifContraparte, fechaEmision, fechaVencimiento, baseImponible, iva, total, estado, pdfUrl, createdAt
- **Documento** — id, perfilId, tipo, nombre, tamanoBytes, url, subidoEn
- **Examen** — id, perfilId, tipo(facturas/trimestres/alquiler/nominas/alumnos), estado, resultado, creadoEn, completadoEn
- **Suscripcion** — id, perfilId, tier(BASIC/PRO), provider(stripe/paypal), providerSubscriptionId, estado, currentPeriodStart, currentPeriodEnd, createdAt
- **Notificacion** — id, perfilId, tipo, leido, contenido, creadoEn

## Suscripciones y features
- **BASIC** (free): facturas (10/mes), trimestres (auto), alumnos (10), alquiler, documentos (50MB)
- **PRO** ($15/mes): facturas ilimitadas, nóminas, alumnos ilimitados, AI, documentos (5GB), conversiones
- **Gratuito inicial:** periodo de prueba de 30 días PRO completo

## Best Practices (obligatorio seguirlas SIEMPRE)

### Formularios
- Todo formulario debe tener **Confirmar contraseña** en registro (nunca solo contraseña)
- Validar client-side **SIEMPRE** antes de enviar: email (`@` + `.`), campos requeridos, formatos (NIF, importes)
- Botones de submit con `disabled` durante async + texto de carga ("Guardando...")
- `try/catch` en todo handler asíncrono
- Mostrar errores al usuario (`setError`) con texto claro en español

### API Routes
- `try/catch` alrededor de TODO el handler, nunca exceptions sin capturar
- Rate limiting en TODAS las rutas (30/min default, 10/min AI chat, 5/min Stripe)
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
- Comando: `pnpm --filter=utils test`
- Tests web (multi-persona): `apps/web/__tests__/multi-persona/` (19 tests: resolve-perfil-activo, asociar-persona, desasociar-persona, mis-personas)
- Comando: `pnpm --filter=web test`
- Tests E2E: `apps/web/e2e/` (6 archivos Playwright: auth, navigation, public-pages, conversiones, visual)
- Coverage configurado en vitest.config.ts raíz

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
pnpm --filter=web build   # Build producción web (29 rutas, 0 errores)
pnpm --filter=web test   # Tests vitest web (multi-persona)
pnpm --filter=utils test # Tests vitest utils (fiscal)
pnpm --filter=database exec -- dotenv -e ../../.env.local -- prisma db execute --file prisma/migrations/20260825_multi_persona.sql  # Migración multi-persona
pnpm db:push          # Push schema a Supabase
pnpm db:generate      # Regenerar Prisma client
pnpm typecheck        # TypeScript check global
pnpm --filter=web lint    # Lint web
git add -A; git commit -m "msg"; git push origin master  # Deploy a Vercel
```

## Enlaces Supabase
- Google OAuth: configurado ✅
- Azure/Outlook OAuth: pendiente ⏳
- Todas las credenciales en `.env.local` raíz ✅

## Estado del proyecto
- **29 rutas, 0 errores de build.** Prácticamente todo el MVP implementado.
- Stripe integrado (checkout, portal, webhook) — opcional, si faltan env vars muestra "Próximamente"
- OCR de facturas con Anthropic Claude API — botón "Escanear factura con IA" auto-rellena formulario
- Subida de archivos con dropzone + validación + progreso
- Notificaciones en header (dropdown con badge)
- Loading/Error states en todas las rutas
- Tasas de cambio en tiempo real (Frankfurter API + fallback hardcoded)
- SEO metadata en layouts y root page
- Rate limiting en todas las API routes (in-memory, sin Redis)
- Middleware con graceful fallback si faltan NEXT_PUBLIC_SUPABASE_URL/KEY
- **Deploy en Vercel funcional** (Root Directory: apps/web)
- **Generación de exámenes con IA** desde documentos de alumno (requiere API key de Anthropic con crédito)
- **Todos los inserts corregidos**: id explícito con `crypto.randomUUID()` en todas las tablas Prisma-managed
- **Registro de perfil fijo**: ahora incluye `userId` para que las consultas por `userId` funcionen correctamente
- **Tooltips en calculadoras**: las calculadoras tienen `LabelConAyuda` + guías `GUIA_*` en `lib/fiscal/guia-fiscal.ts`
- **Pre-relleno de datos reales**: `cargarDatosReales()` auto-carga y rellena calculadoras 100, 111, 309, 349 (baseGeneral, pagosFraccionados, bases IVA, operaciones intracomunitarias)
- **Modelos fiscales implementados**: 100, 111, 115, 123, 130, 131, 151, 170, 179, 180, 184, 190, 193, 200, 202, 210, 220, 232, 233, 296, 303, 309, 345, 347, 349, 369, 390, 600, 714, 720, 721 (cada uno: utils en `packages/utils/src/fiscal/`, calculadora UI, test, guía y export PDF)
- **Export PDF**: botón `BotonPDF` en todos los modelos fiscales (id `pdf-modelo-XXX` en el wrapper `<div>`)
- **Dark mode desplegables**: `color-scheme: dark` en `.dark` de `globals.css` + `select`/`select option` con `bg-background text-foreground` (corrige popups de `<select>` nativos en modo oscuro)

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
