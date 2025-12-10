import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // Critical: Use relative base path for Capacitor to load assets correctly
    base: './',
    define: {
      // Critical: Polyfill process.env to prevent "process is not defined" crash
      'process.env': env
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    }
  };
});