import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'prompt',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Blag',
        short_name: 'Blag',
        description: 'Твоят персонален фитнес коуч',
        theme_color: '#0A0A0F',
        background_color: '#0A0A0F',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        /* Задържане на иконата отваря трите неща, заради които приложението
           се отваря изобщо. Дотук всеки път беше „влез, изчакай сплаша,
           намери таба" — три докосвания за нещо, което е едно.

           Адресите носят ?tab=, защото навигацията тук е състояние, не
           маршрути; App.jsx чете параметъра веднъж при тръгване. */
        shortcuts: [
          {
            name: 'Впиши храна',
            short_name: 'Храна',
            url: '/?tab=nutrition',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Тренировка',
            short_name: 'Тренировка',
            url: '/?tab=training',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Навици',
            short_name: 'Навици',
            url: '/?tab=compliance',
            icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpeg,jpg,webp}'],
        globIgnores: ['**/arms.png', '**/arms.jpeg'],
      },
    }),
  ],
})
