import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: 상대경로 사용으로 어떤 repo 이름이든 작동
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
  },
});
