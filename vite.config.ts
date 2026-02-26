import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'any OCR',
        short_name: 'any OCR',
        description: 'Local screen capture and OCR tool',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        // Cache Tesseract.js worker and specific language packs
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/unpkg\.com\/tesseract\.js-core@.*\/tesseract-core\.wasm\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-core-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/tessdata\.projectnaptha\.com\/4\.0\.0_best\/.*\.traineddata\.gz$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tesseract-lang-data',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
});
