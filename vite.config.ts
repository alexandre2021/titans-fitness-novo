import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'sw-push-handler.js'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
        // Garante que o service worker seja atualizado corretamente
        skipWaiting: false,
        clientsClaim: false,
        // Importa o arquivo com handlers de push notification
        importScripts: ['sw-push-handler.js'],
        // Estratégias de cache para runtime
        runtimeCaching: [
          {
            // Cache para chamadas de API do Supabase
            urlPattern: ({ url }) => url.pathname.includes('/rest/v1/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60, // 1 hora
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            // Cache para mídias (imagens, vídeos)
            urlPattern: ({ url }) =>
              url.hostname.includes('supabase.co') &&
              (url.pathname.includes('/storage/v1/object/public/') ||
               url.pathname.includes('/storage/v1/render/image/')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
            },
          },
        ],
      },
      // Configuração explícita para desenvolvimento
      devOptions: {
        enabled: true, // Habilita em DEV para testar notificações
        type: 'module',
      },
      manifest: {
        name: 'Titans Fitness',
        short_name: 'Titans',
        description: 'Aplicativo de gestão de treinos para professores e alunos.',
        theme_color: '#AA1808',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'notification-badge.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'monochrome'
          }
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
})