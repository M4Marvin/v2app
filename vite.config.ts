import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'use-sync-external-store/shim/with-selector': 'use-sync-external-store/shim/with-selector.js',
      'use-sync-external-store/shim': 'use-sync-external-store/shim/index.js',
    },
  },
  optimizeDeps: {
    include: [
      'use-sync-external-store/shim/with-selector',
      'use-sync-external-store/shim',
    ],
  },
  plugins: [
    devtools(),
    tailwindcss(),
    {
      name: 'force-nitro-image-api',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const dest = req.headers['sec-fetch-dest']
          const url = req.url || ''
          if (dest === 'image' && (url.startsWith('/api/') || url.startsWith('/uploads/'))) {
            req.headers['sec-fetch-dest'] = 'empty'
          }
          next()
        })
      },
    },
    nitro(),
    tanstackStart({
      router: {
        // Colocated route tests (e.g. characters/new.test.tsx) would otherwise be
        // picked up as route candidates and warned about on every build.
        routeFileIgnorePattern: '\\.test\\.',
      },
    }),
    viteReact(),
  ],
})

export default config
