import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // This config applies to your TypeScript files.
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Place TypeScript-specific rules here.
    },
  },
  {
    // This override applies to CommonJS files (e.g., .cjs files like Metro config)
    files: ['**/*.cjs'],
    languageOptions: {
      // Use "script" mode for CommonJS files.
      parserOptions: {
        sourceType: 'script',
      },
      // Declare Node globals.
      globals: {
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
      },
    },
    rules: {
      // Disable the rule that forbids use of require in TypeScript files.
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
