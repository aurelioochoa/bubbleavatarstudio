import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { import: importPlugin },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // Layer boundary: domain/ and render/ must stay pure (FR-11.1)
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/domain',
              from: './src/app',
              message: 'domain must not import app (React)',
            },
            {
              target: './src/domain',
              from: './src/runtime',
              message: 'domain must not import runtime',
            },
            {
              target: './src/render',
              from: './src/app',
              message: 'render must not import app (React)',
            },
          ],
        },
      ],
      'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.*', 'vite.config.ts', 'eslint.config.js'] }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'vite.config.ts', 'eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
  }
);
