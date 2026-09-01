/**
 * Performance Audit — MantiGestor Web App
 * Audited: 2026-09-01
 *
 * Findings and recommendations organized by severity.
 * This file is a reference document — NOT executable code.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. CRITICAL: Dashboard imports 10 Recharts chart components statically
//    File: app/(dashboard)/dashboard/page.tsx:16-29
//
//    ALL 10 chart components (each pulling in the full Recharts library ~400KB
//    gzipped) are statically imported in a single 'use client' page. This means
//    the entire Recharts bundle is downloaded before the dashboard renders.
//
//    Recommendation:
//    - Use next/dynamic with { ssr: false } for each chart component.
//    - Charts below the fold (Categorias, Presupuesto, Comparativa, Interanual,
//      Prediccion, GastosCategoria) can be lazy-loaded or loaded only when the
//      user scrolls to them (IntersectionObserver).
//
//    Example:
//    const ChartIngresosGastos = dynamic(
//      () => import('@/components/dashboard/chart-ingresos-gastos'),
//      { ssr: false, loading: () => <CardSkeleton /> }
//    )
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 2. CRITICAL: Heavy client-side libraries bundled eagerly
//    File: lib/pdf.ts:3-4 — html2canvas (~200KB) + jsPDF (~200KB)
//    File: lib/descargar-excel.ts:1 — xlsx (~300KB)
//    File: lib/exportar-zip.ts:3 — jszip (~45KB)
//
//    lib/pdf.ts has 'use client' at the top, so html2canvas and jsPDF are
//    bundled into the client JS. These are only used when the user clicks
//    "Export PDF" — not on initial load.
//
//    Recommendation:
//    - Remove 'use client' from lib/pdf.ts (the functions are async and use
//      document.createElement — they already only work client-side).
//    - Dynamic-import inside the consuming functions:
//        const { default: html2canvas } = await import('html2canvas')
//        const { default: jsPDF } = await import('jspdf')
//    - Same pattern for xlsx and jszip.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 3. HIGH: Dashboard page is entirely 'use client' with useEffect data fetching
//    File: app/(dashboard)/dashboard/page.tsx:1
//
//    The dashboard is a 'use client' component that fetches data in useEffect.
//    This means:
//    - No SSR/SSG for the dashboard — it's fully client-rendered.
//    - The browser must download the full JS bundle before any data appears.
//    - Multiple sequential waterfall requests (auth → 4 queries → gastos).
//
//    Recommendation:
//    - Split into a Server Component wrapper + Client Component for interactivity.
//    - Use a Server Component to fetch data (parallel queries on the server),
//      then pass props to a client component for charts/filters.
//    - Alternatively, use React Server Components with Suspense boundaries so
//      the page shell renders immediately and data streams in.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 4. HIGH: Dashboard layout eagerly loads 4 heavy dialog/modal components
//    File: app/(dashboard)/layout.tsx:7-9
//
//    <CommandPalette />, <HelpDialog />, <MilestoneProvider /> are imported
//    statically in the layout. Each is a 'use client' component that pulls
//    Radix UI Dialog primitives. They render on every dashboard page.
//
//    Recommendation:
//    - Use next/dynamic for these overlays:
//        const CommandPalette = dynamic(() => import('@/components/command-palette'))
//        const HelpDialog = dynamic(() => import('@/components/help-dialog'))
//        const MilestoneProvider = dynamic(() => import('@/components/milestone-provider'))
//    - MilestoneProvider already uses dynamic internally, but the wrapper itself
//      is still eagerly loaded.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 5. MEDIUM: No image optimization for document thumbnails
//    File: app/(dashboard)/gestoria/documentos/page.tsx:121
//
//    <img src={doc.url} .../> is used for document previews from Supabase.
//    This bypasses Next.js image optimization (no lazy loading, no srcset,
//    no format conversion, no size optimization).
//
//    Recommendation:
//    - Use next/image with:
//        <Image src={doc.url} alt={doc.nombre} width={400} height={300}
//               fill className="object-cover" unoptimized />
//    - 'unoptimized' if Supabase URLs can't be optimized (external),
//      but at least get lazy loading and proper sizing.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 6. MEDIUM: next.config.js missing performance optimizations
//    File: next.config.js
//
//    Current config only has images.remotePatterns and bodySizeLimit.
//    Missing:
//    - compress: true (enable gzip — may be on by default but explicit is safer)
//    - poweredByHeader: false (security + minor perf)
//    - reactStrictMode: true (catches issues early)
//    - images.formats: ['image/avif', 'image/webp'] (modern formats)
//    - images.deviceSizes / images.imageSizes (tune responsive breakpoints)
//    - swcMinify: true (should be default in Next 14 but explicit)
//    - No bundle analyzer configured for monitoring
//
//    Recommendation:
//    const nextConfig = {
//      compress: true,
//      poweredByHeader: false,
//      reactStrictMode: true,
//      images: {
//        remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
//        formats: ['image/avif', 'image/webp'],
//      },
//      experimental: {
//        serverActions: { bodySizeLimit: '50mb' },
//        optimizePackageImports: ['recharts', 'lucide-react'],
//      },
//    }
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 7. MEDIUM: Recharts used in 10 chart components — tree-shaking insufficient
//    Files: components/dashboard/chart-*.tsx
//
//    Each chart file imports only the specific chart type it needs from recharts,
//    which is good. However, recharts has poor tree-shaking due to its barrel
//    export structure. Even importing BarChart vs PieChart pulls in most of
//    the library.
//
//    Recommendation:
//    - Add to next.config.js: experimental: { optimizePackageImports: ['recharts'] }
//    - Consider replacing Recharts with a lighter alternative for simple charts:
//      - chart.js (~200KB, better tree-shaking)
//      - @nivo/line (~150KB with better splitting)
//      - Lightweight SVG charts (like the existing SparkLine component)
//    - For the 4 simple charts (sparklines in KPIs), the existing SVG-based
//      SparkLine component is excellent — expand this pattern.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 8. LOW: Providers wrap entire app with heavy client dependencies
//    File: components/providers.tsx:3
//
//    @tanstack/react-query QueryClientProvider is at the root level.
//    This is fine architecturally, but note that React Query adds ~13KB gzipped.
//    next-themes and LanguageProvider are lightweight.
//
//    Recommendation:
//    - This is acceptable as-is. QueryClient is initialized with useState (good).
//    - No action needed.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 9. LOW: Font loading — only 4 weights of Roboto
//    File: app/layout.tsx:6-11
//
//    Roboto with weights 300, 400, 500, 700 is reasonable.
//    'display: swap' is correctly set.
//
//    Recommendation:
//    - Consider subset: ['latin', 'latin-ext'] if Spanish characters needed.
//    - No critical issues.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// 10. LOW: loading.tsx files exist but dashboard loading is unused
//     Files: 13 loading.tsx files exist across routes
//
//     Dashboard has loading.tsx with skeleton UI — good.
//     However, since the dashboard page is 'use client' with useEffect,
//     the loading.tsx file may not provide streaming benefits because the
//     page component itself handles loading state internally.
//
//     Recommendation:
//     - The loading.tsx files work correctly with Server Component parents.
//     - If dashboard is refactored to Server Components (see #3), loading.tsx
//       will provide real streaming benefits.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY — Estimated Impact (descending)
//
// Issue                                       | Impact   | Effort
// ────────────────────────────────────────────|──────────|────────
// 1. 10 charts × Recharts static import      | ~400KB   | Medium
// 2. html2canvas/jsPDF/xlsx eager bundle      | ~700KB   | Low
// 3. Dashboard all-client, no streaming       | ~2s TTI  | High
// 4. Layout eager-loads 3 dialog components   | ~50KB    | Low
// 5. Raw <img> for documents                  | No lazy  | Low
// 6. next.config.js missing optimizations     | Minor    | Low
// 7. Recharts poor tree-shaking               | ~200KB   | Medium
//
// Total potential savings: ~1.1MB JS reduction + ~1-2s faster TTI
// ─────────────────────────────────────────────────────────────────────────────
