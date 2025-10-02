import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        cleanupOutdatedCaches: true,
        // Garante que o service worker seja atualizado corretamente
        skipWaiting: false,
        clientsClaim: false,
      },
      // Configuração explícita para desenvolvimento
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'Titans Fitness',
        short_name: 'Titans',
        description: 'Aplicativo de gestão de treinos para personal trainers e alunos.',
        theme_color: '#AA1808',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
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