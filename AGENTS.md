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

## Seguridad
- Middleware auth check en todas rutas protegidas
- Verificación tier en servidor (API routes) y cliente (FeatureGate)
- Validación Zod en inputs
- Sin secretos en código
- Enlaces OAuth solo desde acciones del usuario, nunca en SSR

## Testing
- Tests unitarios: `packages/utils/src/**/__tests__/`
- Comando: `pnpm --filter=utils test`
- Tests E2E (preparado): `apps/web/e2e/`
- Coverage configurado en vitest.config.ts raíz

## Comandos útiles
```bash
pnpm dev              # Arrancar todo en dev
pnpm --filter=web build   # Build producción web
pnpm --filter=utils test  # Tests unitarios
pnpm db:push          # Push schema a Supabase
pnpm db:generate      # Regenerar Prisma client
pnpm typecheck        # TypeScript check global
```

## Enlaces Supabase
- Google OAuth: configurado ✅
- Azure/Outlook OAuth: pendiente ⏳
- Supabase project: pendiente de añadir credenciales a .env.local

## NOTA IMPORTANTE
No hacer llamadas a createClient() o createServerClient() durante SSR/prerenderizado de Next.js. Usar lazy initialization (useCallback o dynamic imports) en componentes cliente que renderizan en servidor.
