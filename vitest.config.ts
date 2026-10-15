import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts', 'apps/*/src/**/*.{ts,tsx}'],
      // Scene, DOM and WebGL code is verified in the browser (seeded frame comparison); unit coverage
      // targets the pure logic. Each excluded file is listed so new logic files are covered by default.
      exclude: [
        '**/*.test.ts',
        '**/index.ts',
        'apps/web/src/main.tsx',
        'apps/web/src/debug/{seeded-random,lineup}.ts',
        'apps/web/src/engine/{renderer,assets,textures}.ts',
        'apps/web/src/chog/{chog,chog-material,faces,accessories,anchors,animate,face-set,headwear,paint-eyes,paint-mouths}.ts',
        'apps/web/src/arena/**',
        'apps/web/src/fx/**',
        'apps/web/src/camera/**',
        'apps/web/src/hud/**',
        'apps/web/src/director/**',
        'apps/web/src/ui/**',
        'apps/web/src/audio/**',
        'apps/web/src/wallet/**',
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
