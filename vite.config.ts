import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const disableHmr = process.env.DISABLE_HMR === 'true';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // File watching is disabled to prevent flickering during agent edits.
      hmr: !disableHmr,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      ...(disableHmr ? { watch: null as unknown as undefined } : {}),
      // Proxy Flask backend routes so frontend can call /api/*, /analyze, etc.
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/analyze': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/translate': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
        '/results': {
          target: 'http://127.0.0.1:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
