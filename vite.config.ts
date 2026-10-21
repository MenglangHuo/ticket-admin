import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_PORT) || 4000
  // Default proxy target is strictly for local development (127.0.0.1:8000).
  // In production / preview, backend domains must be supplied via environment variables
  // (e.g. VITE_PROXY_TARGET in .env.production or CI/CD) to prevent domain lock-in.
  const defaultProxyTarget = mode === 'development' ? 'http://127.0.0.1:8000' : ''

  let rawProxyTarget = (
    env.VITE_PROXY_TARGET ||
    env.PROXY_TARGET ||
    (env.VITE_AUTH_BASE_URL && env.VITE_AUTH_BASE_URL.startsWith('http') ? env.VITE_AUTH_BASE_URL : '') ||
    (env.VITE_API_BASE_URL && env.VITE_API_BASE_URL.startsWith('http') ? env.VITE_API_BASE_URL.replace(/\/api(\/.*)?$/, '') : '') ||
    defaultProxyTarget
  ).trim().replace(/\/+$/, '')

  if (rawProxyTarget && !/^https?:\/\//i.test(rawProxyTarget)) {
    rawProxyTarget = `http://${rawProxyTarget}`
  }
  const proxyTarget = rawProxyTarget

  if (proxyTarget) {
    console.log(`[vite] Reverse proxy target: ${proxyTarget}`)
  } else {
    console.log('[vite] No reverse proxy target configured (same-origin / relative mode)')
  }

  const proxyConfig = proxyTarget
    ? {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/token': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/login': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/two-factor': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/files': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      }
    : undefined

  return {
    plugins: [
      vue(),
      vueDevTools(),
      tailwindcss(),
    ],
    server: {
      port,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
      proxy: proxyConfig,
    },
    preview: {
      port,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
      proxy: proxyConfig,
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@tiptap') || id.includes('prosemirror')) {
                return 'vendor-tiptap';
              }
              if (id.includes('@lezer')) {
                return 'vendor-lezer';
              }
              if (id.includes('codemirror') || id.includes('vue-codemirror6')) {
                return 'vendor-codemirror';
              }
              if (id.includes('lucide-vue-next')) {
                return 'vendor-icons';
              }
              if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
                return 'vendor-vue';
              }
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
