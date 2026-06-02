import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiPort = Number(process.env.API_PORT) || 3131;
const apiTarget = `http://localhost:${apiPort}`;

// https://vite.dev/config/
export default defineConfig({
  // Carrega `.env` da raiz do monorepo (mesmo arquivo usado pelo docker-compose).
  envDir: path.resolve(__dirname, '..'),
  server: {
    host: true,
    port: Number(process.env.FRONTEND_PORT) || 5173,
    // Celular na mesma rede acessa só o Vite; API/WS/uploads são repassados ao back-end local.
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/ws': { target: apiTarget, ws: true, changeOrigin: true },
      '/uploads': { target: apiTarget, changeOrigin: true },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
