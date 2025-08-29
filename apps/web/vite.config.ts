import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Allow overriding the backend port via env (optional)
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 4000);
const BACKEND_TARGET = process.env.BACKEND_URL?.replace(/\/$/, '') || `http://localhost:${BACKEND_PORT}`;

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
      { find: /^react-native$/,       replacement: 'react-native-web' },
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

  // Strip out all console.* and debugger statements in production
  build: {
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  server: {
    port: 5173,
    fs: {
      allow: [
        // your app
        path.resolve(__dirname),
        // the monorepo shared package root
        path.resolve(__dirname, '../../packages/shared'),
      ],
    },

    // ✅ Dev proxy so fetch('/api/...') hits your Express server instead of Vite
    proxy: {
      // REST/HTTP API
      '/api': {
        target: BACKEND_TARGET,       // e.g., http://localhost:4000
        changeOrigin: true,
        secure: false,
        // If your backend sets cookies and you need them in dev:
        // configure: (proxy) => {
        //   proxy.on('proxyRes', (proxyRes) => {
        //     const setCookie = proxyRes.headers['set-cookie'];
        //     if (setCookie) {
        //       // Optionally tweak cookies here
        //     }
        //   });
        // },
      },

      // Socket.IO (WebSocket) — matches the path you mounted in Express by default
      '/socket.io': {
        target: BACKEND_TARGET,
        ws: true,            // 🔑 enable websockets
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
