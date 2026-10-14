import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

const NON_DETERMINISTIC = 'The sim must be deterministic: use the seeded RNG and sim time instead.';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.wrangler/**',
      '**/test-results/**',
      '**/playwright-report/**',
      'game/**',
      'chog-arena/**',
      'apps/web/public/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-console': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['packages/sim/src/**/*.ts'],
    // tests may time things; only the sim itself must stay deterministic
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: NON_DETERMINISTIC },
        { object: 'Date', property: 'now', message: NON_DETERMINISTIC },
        { object: 'performance', property: 'now', message: NON_DETERMINISTIC },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'Date', message: NON_DETERMINISTIC },
        { name: 'performance', message: NON_DETERMINISTIC },
        { name: 'crypto', message: NON_DETERMINISTIC },
      ],
    },
  },
);
