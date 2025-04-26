// .eslintrc.cjs
const path = require('path');

module.exports = {
  root: true,

  // ✂️ completely ignore every generated/native file
  ignorePatterns: [
    'node_modules/',
    'apps/mobile/android/**',
    'apps/mobile/ios/**',
    'apps/mobile/src/**/*.{native,android,ios}.{js,ts,tsx}',
    '**/*.d.ts',
    'apps/backend/**',
    'apps/mobile/src/generated/**',
    'babel.config.js',
    '.eslintrc.cjs'
  ],

  parser: require.resolve('@typescript-eslint/parser'),

  parserOptions: {
    project: [
      './tsconfig.base.json',
      './apps/mobile/tsconfig.json',
      './apps/web/tsconfig.json',
      './packages/shared/tsconfig.json',
    ],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
    ecmaVersion: 2020,
    ecmaFeatures: { jsx: true },
  },

  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
    'import',
    'prettier',
  ],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-native/all',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:prettier/recommended',
  ],

  settings: {
    react: { version: 'detect' },

    // tell eslint-plugin-import to use our TS projects & node resolution
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
    'import/resolver': {
      // first, TypeScript (so it knows about esModuleInterop + paths + allowSyntheticDefaultImports)
      typescript: {
        project: [
        path.resolve(__dirname, 'apps/mobile/tsconfig.json'),
        path.resolve(__dirname, 'tsconfig.base.json'),
        path.resolve(__dirname, 'apps/web/tsconfig.json'),
        path.resolve(__dirname, 'packages/shared/tsconfig.json'),
        ],
      },
      // fallback to Node for JS/JSON/etc
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
        moduleDirectory: ['node_modules', 'apps/mobile/node_modules', 'apps/web/node_modules'],
      },
    },
  },

  env: {
    es6: true,
    browser: true,
    node: true,
    'react-native/react-native': true,
  },

  rules: {
    'react/react-in-jsx-scope': 'off',
    "react/no-unescaped-entities": "off",
    'prettier/prettier': 'error',
    // you can also disable import/default if you still see complaints on React:
    // 'import/default': 'off',
  },

  overrides: [
    {
      files: ['apps/mobile/**/*.ts', 'apps/mobile/**/*.tsx'],
      parserOptions: {
        project: ['./apps/mobile/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      env: { 'react-native/react-native': true },
      rules: {
        // mobile-specific overrides…
      },
    },
    {
      files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx'],
      parserOptions: {
        project: ['./apps/web/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      env: { browser: true, node: true },
      rules: {
        'react-native/no-raw-text': 'off',
      },
    },
    {
      files: ['packages/shared/**/*.ts', 'packages/shared/**/*.tsx'],
      parserOptions: {
        project: ['./packages/shared/tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
      env: { browser: true, node: true },
    },
  ],
};
