import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text'],
      // Sin thresholds por ahora: recolectar visibilidad sobre los módulos
      // críticos (rutas API, lib y middleware) sin romper el gate de CI.
      include: ['lib/**/*.ts', 'app/api/**/route.ts', 'middleware.ts'],
      exclude: ['lib/i18n/**', '**/*.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
})
