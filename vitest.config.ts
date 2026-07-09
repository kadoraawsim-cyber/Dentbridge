import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'server-only': path.resolve(__dirname, 'tests/noop-server-only.ts'),
    },
  },
  test: {
    clearMocks: true,
    coverage: {
      exclude: [
        'src/lib/database.types.ts',
        'src/lib/i18n/**',
        '**/*.tsx',
        '**/*.d.ts',
      ],
      include: ['src/app/api/**/*.ts', 'src/lib/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
    },
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
