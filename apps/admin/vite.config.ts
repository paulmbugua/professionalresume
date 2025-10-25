// apps/web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const BACKEND_PORT = Number(process.env.BACKEND_PORT || 4000)
const BACKEND_TARGET =
  process.env.BACKEND_URL?.replace(/\/$/, '') || `http://localhost:${BACKEND_PORT}`

export default defineConfig({
  plugins: [react()],
  resolve: {
    // 'dedupe' is mainly needed for react/react-dom; 'three' is optional here
    dedupe: ['react', 'react-dom', 'motion-dom', 'react-native-web'],
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.jsx', '.json'],
    alias: [
      { find: /^react-native$/, replacement: 'react-native-web' },
      { find: /^react-native\/(.*)$/, replacement: 'react-native-web/dist/exports/$1' },

      { find: /^@shared$/, replacement: path.resolve(__dirname, '../../packages/shared/index.ts') },
      { find: /^@shared\/(.*)$/, replacement: path.resolve(__dirname, '../../packages/shared/$1') },
      { find: /^@mytutorapp\/shared$/, replacement: path.resolve(__dirname, '../../packages/shared/index.ts') },
      { find: /^@mytutorapp\/shared\/(.*)$/, replacement: path.resolve(__dirname, '../../packages/shared/$1') },

      { find: '@', replacement: path.resolve(__dirname, 'src') },

      // Optional “pin”: fine to keep, but not required
      { find: 'three', replacement: path.resolve(__dirname, 'node_modules/three') },
    ],
  },

  optimizeDeps: {
    include: ['framer-motion', 'motion-dom', 'react-native-web', 'three'],
    exclude: ['react-native'], // ⬅️ removed 'three'
  },

  css: { devSourcemap: true },
  build: {
    sourcemap: true,
    cssCodeSplit: true,
  },

  server: {
    port: 5173,
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, '../../packages/shared'),
      ],
    },
    proxy: {
      '/api': { target: BACKEND_TARGET, changeOrigin: true, secure: false },
      '/socket.io': { target: BACKEND_TARGET, ws: true, changeOrigin: true, secure: false },
    },
  },
})
