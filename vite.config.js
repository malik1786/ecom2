import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true, // Fail if port 5173 is busy
    hmr: {
      host: '127.0.0.1',
      protocol: 'ws',
      port: 5173
    },
    proxy: {
      '/api/logs': {
        target: 'http://127.0.0.1:5004',
        changeOrigin: true,
        proxyTimeout: 0, // Prevent timeout for long-lived SSE
        timeout: 0,
      },
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        headers: { 'x-internal-secret': 'SUPER_SECRET_INTERNAL_KEY_123' },
        rewrite: (path) => path.replace(/^\/api\/api(\/|$)/, '/api$1'),
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        headers: { 'x-internal-secret': 'SUPER_SECRET_INTERNAL_KEY_123' },
        // ⚠️ Use rewrite so /auth-success is NOT proxied — only /auth/* API routes
        bypass(req) {
          // Let /auth-success reach the React SPA, not the auth service
          if (req.url && req.url.startsWith('/auth-success')) {
            return req.url; // return the path to serve SPA instead of proxying
          }
        },
      },
      '/payment': {
        target: 'http://127.0.0.1:5002',
        changeOrigin: true,
        headers: { 'x-internal-secret': 'SUPER_SECRET_INTERNAL_KEY_123' },
      },
    },
  },
})
