// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // ✅ Override specifically for CommonJS config files
  {
    files: ['babel.config.cjs', 'metro.config.cjs', '*.cjs'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        exports: 'writable',
        process: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
