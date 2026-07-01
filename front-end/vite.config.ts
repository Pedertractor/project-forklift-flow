import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveApiProxyTarget(): string {
  const baseUrl = process.env.VITE_BASE_URL_API?.trim();
  if (baseUrl && !baseUrl.startsWith('/')) {
    try {
      const { protocol, host } = new URL(baseUrl);
      return `${protocol}//${host}`;
    } catch {
      /* fallback */
    }
  }
  return 'http://localhost:5010';
}

const apiTarget = resolveApiProxyTarget();

// https://vite.dev/config/
export default defineConfig({
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
  optimizeDeps: {
    include: ['recharts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
