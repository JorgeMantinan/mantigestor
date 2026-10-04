# MantiGestor

> **Gestión inteligente para autónomos con IA** — facturas, fiscalidad, nóminas y alquileres en una sola app.

**🌐 Demo en producción:** [mantigestor.vercel.app](https://mantigestor.vercel.app) · **🎯 Estado:** desplegada y accesible con registro

---

## Qué es

SaaS para autónomos españoles que resuelve lo que normalmente se hace en Excel y con un gestoría: emitir facturas, controlar IVA e IRPF, preparar declaraciones, gestionar nóminas y llevar el control de alquileres.

El diferencial es la **IA aplicada a un dominio regulado (fiscalidad española)**: fotografías una factura o ticket y la IA extrae los datos (incluso manuscritos), y la app calcula los modelos fiscales con avisos de vencimiento.

**Usuario objetivo:** autónomo sin conocimientos contables, en España.

## Funcionalidades

| Área | Qué hace |
|---|---|
| 🧾 **Facturas con IA** | OCR + extracción automática de datos desde foto (Tesseract) + Claude para normalizar campos y validar. Lectura de PDF e imágenes. |
| 📊 **Fiscalidad** | Modelos 303, 130, 111, 100, 347, 349, 190, 200, plusvalía municipal y más de 30 modelos. Cálculo automático y alertas de vencimiento con guía paso a paso. |
| 👥 **Nóminas y retenciones** | Generación de nóminas y cálculo de retenciones de IRPF. |
| 🏠 **Alquileres** | Inquilinos, cobros, gastos deducibles y control de propiedades. |
| 📁 **Documentos** | Almacenamiento, organización y backup automático en la nube. Exportación a PDF/Excel/ZIP. |
| 🧮 **Escaneo de tickets** | Captura con la cámara del móvil para gastos deductibles. |
| 👤 **Multi-persona** | Varios perfiles (cónyuge, familiares) desde una única cuenta. |
| 💳 **Suscripciones** | Plan Básico gratuito y plan PRO con pago recurrente (Stripe + PayPal). |
| 🔔 **Notificaciones** | Web Push y email transaccional (Resend). |

## Stack técnico

| Capa | Tecnología |
|---|---|
| Frontend | **Next.js (App Router) + React + TypeScript**, Tailwind CSS, Radix UI, React Hook Form + **Zod**, Recharts |
| Backend / API | Next.js Server Actions y Route Handlers |
| Datos | **PostgreSQL (Supabase)** + **Prisma** (migraciones y cliente tipado) |
| Auth | Supabase Auth (SSR cookies, sesiones con encriptación) |
| IA | **Anthropic SDK (Claude)** + Tesseract.js (OCR) |
| Pagos | Stripe + PayPal |
| Email / Push | Resend, Web Push (VAPID), IMAP (lectura de bandeja) |
| Seguridad y calidad | Rate limiting distribuido (Upstash Redis), Sentry, validación Zod en la frontera |
| Tareas programadas | Trigger.dev |
| Monorepo | **Turborepo + pnpm workspaces** (`apps/web`, `packages/database`, `packages/types`, `packages/utils`) |
| Testing | **Vitest** (unitario) + **Playwright** (e2e) |
| Despliegue | Vercel (producción), variables de entorno por entorno |

## Arquitectura

```
mantigestor/
├── apps/
│   └── web/               Next.js: app router, api routes, e2e (Playwright)
├── packages/
│   ├── database/          Prisma schema, migraciones y seeds
│   ├── types/             Tipos y DTOs compartidos (TypeScript estricto)
│   └── utils/             Utilidades puras compartidas
├── e2e/                   Tests end-to-end con Playwright
├── turbo.json             Pipeline: dev · build · lint · typecheck · test
└── vitest.config.ts       Configuración de tests unitarios
```

**Decisiones de diseño:**
- *Monorepo*: `types` y `utils` compartidos entre app y tests — sin duplicar modelos de dominio.
- *Zod en la frontera*: toda entrada de usuario/IA se valida antes de tocar la base de datos (fiscalidad = cero datos corruptos).
- *RLS y claves separadas*: `anon_key` en cliente, `service_role` solo en servidor.
- *IA con validación*: la IA propone, el código valida. El resultado de un OCR nunca se persiste sin pasar por el esquema Zod.

## Cómo se construyó

Desarrollado de extremo a extremo (diseño, arquitectura, código, tests y despliegue) por **Jorge Mantiñán Montero**, usando IA como acelerador de desarrollo. Las decisiones técnicas —modelo de datos, esquema fiscal, seguridad, flujos de pago— y la revisión del código generado son propias. Ver `AGENTS.md` para el flujo de trabajo con agentes de IA.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local       # rellena Supabase, Anthropic, Stripe, etc.
pnpm db:push                     # sincroniza el esquema Prisma
pnpm dev                         # turbo dev → http://localhost:3000
pnpm test                        # tests unitarios (Vitest)
pnpm test:e2e                    # tests end-to-end (Playwright)
pnpm lint && pnpm typecheck      # calidad
```

## Roadmap

- [ ] Modo offline progresivo para facturación sin conexión
- [ ] Firma digital de facturas y remisión a TicketBAI/Facturación VER*
- [ ] Alertas de vencimiento por WhatsApp
- [ ] Exportación contable directa a modelos AEAT desde el navegador

## Licencia

Código visible bajo **[PolyForm Noncommercial 1.0.0](LICENSE)**: puedes verlo, clonarlo, estudiarlo y
usarlo para fines personales, de aprendizaje o de investigación. **Cualquier uso comercial (venderlo,
ofrecerlo como servicio, incorporarlo a un producto de pago) requiere mi autorización expresa.**

© 2026 Jorge Mantiñán Montero — contacto a través de [LinkedIn](https://www.linkedin.com/in/jorge-manti%C3%B1%C3%A1n-montero/).

---

<p align="center"><sub>Proyecto personal · España · 2026 — Los datos fiscales calculados son orientativos y no sustituyen a un asesor fiscal.</sub></p>
