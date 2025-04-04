import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  resolve: {
    extensions: ['.web.ts', '.web.tsx', '.shared.ts', '.shared.tsx', '.ts', '.tsx', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/shared'),
    },
  },
  plugins: [react()],
});
