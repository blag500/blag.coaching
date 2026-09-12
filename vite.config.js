import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/* Коя сглобка е това.
   Един и същ ред в client_errors от вчерашната и от днешната версия е един и
   същ ред само на пръв поглед — без това не се вижда дали нещо е поправено
   или още гърми. */
const BUILD = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(BUILD),
  },
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
        /* Споделяне на снимка право в приложението.
           Най-извървяният път при клиент е „снимай ядене → впиши го", а дотук
           той минаваше през галерията и обратно през приложението. Оттук
           телефонът показва Blag в листа за споделяне и снимката влиза право
           в разпознаването.

           POST, защото файл не се носи в адрес; service worker-ът хваща
           заявката, оставя снимката настрана и препраща на /?share=1 —
           страницата никога не вижда самия POST. */
        share_target: {
          action: '/share',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            files: [{ name: 'photo', accept: ['image/jpeg', 'image/png', 'image/webp', 'image/*'] }],
          },
        },
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
