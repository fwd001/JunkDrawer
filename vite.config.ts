import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves project sites under /<repo>/, so the base path is injected in CI.
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
  },
  plugins: [
    Vue(),
    UnoCSS(),
    Components({
      // Only Vant is auto-resolved; local components stay explicitly imported.
      resolvers: [VantResolver()],
      dirs: [],
      dts: 'src/components.d.ts',
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        id: base,
        name: '杂物抽屉 JunkDrawer',
        short_name: '杂物抽屉',
        description: '一个越用越顺手的纯前端工具箱，所有数据留在你自己的设备上。',
        lang: 'zh-CN',
        dir: 'ltr',
        display: 'standalone',
        start_url: base,
        scope: base,
        theme_color: '#0c0e11',
        background_color: '#0c0e11',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{css,js,html,svg,png,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { host: true },
})
