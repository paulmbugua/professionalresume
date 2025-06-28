// apps/web/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    dedupe: ['motion-dom', 'react-native-web'],
    extensions: [
      '.web.tsx', '.web.ts', '.web.js',
      '.tsx',      '.ts',     '.js',      '.jsx', '.json'
    ],
    alias: [
      // React Native → Web
      { find: /^react-native$/,      replacement: 'react-native-web' },
      { find: /^react-native\/(.*)$/, replacement: 'react-native-web/dist/exports/$1' },

      // Bare "@shared" → packages/shared/index.ts
      {
        find: /^@shared$/,
        replacement: path.resolve(__dirname, '../../packages/shared/index.ts'),
      },
      // "@shared/whatever" → packages/shared/whatever
      {
        find: /^@shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/shared/$1'),
      },

      // Bare "@mytutorapp/shared" → packages/shared/index.ts
      {
        find: /^@mytutorapp\/shared$/,
        replacement: path.resolve(__dirname, '../../packages/shared/index.ts'),
      },
      // "@mytutorapp/shared/whatever" → packages/shared/whatever
      {
        find: /^@mytutorapp\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/shared/$1'),
      },
    ],
  },

  optimizeDeps: {
    include: ['framer-motion', 'motion-dom', 'react-native-web'],
    exclude: ['react-native'],
  },

  server: {
    fs: {
      allow: [
        // your app
        path.resolve(__dirname),
        // the monorepo shared package root
        path.resolve(__dirname, '../../packages/shared'),
      ],
    },
  },
});
