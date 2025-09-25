import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Aumenta o limite de tamanho do arquivo para o precache do service worker.
        // O padrão é 2MB, mas nosso chunk principal está um pouco maior.
        // Aumentamos para 5MB para evitar falhas no build.
        maximumFileSizeToCacheInBytes: 5000000,
      },
      manifest: {
        name: 'Titans Fitness',
        short_name: 'Titans',
        description: 'Aplicativo de gestão de treinos para personal trainers e alunos.',
        theme_color: '#ffffff',
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
})