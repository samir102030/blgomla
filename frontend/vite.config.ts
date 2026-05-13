import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: new SW takes over on next navigation, no "reload" prompt.
      registerType: "autoUpdate",
      injectRegister: "auto",
      // The existing public/manifest.json is already linked from index.html.
      manifest: false,
      workbox: {
        // Workbox precaches the hashed build output and versions per build,
        // so the "stale chunk" bug from the hand-rolled SW can't recur.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // /api/* never gets intercepted — that was the source of the auth-hang bug.
        navigateFallbackDenylist: [/^\/api\//],
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "cloudinary-images",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Modern target — drop legacy polyfills for smaller bundles
    target: "es2020",
    // Minify with esbuild (default) is fast; explicit for clarity
    minify: "esbuild",
    cssMinify: true,
    // CSS code-split per route chunk
    cssCodeSplit: true,
    // Drop sourcemaps in production builds to halve the served bytes
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks — split heavy libs into separate cacheable files
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["react-hot-toast", "react-i18next", "i18next"],
          "vendor-state": ["zustand"],
          "vendor-network": ["axios"],
        },
      },
    },
    chunkSizeWarningLimit: 400,
    // Don't inline assets > 4kb; small assets get base64'd inline (saves a request)
    assetsInlineLimit: 4096,
  },
  // esbuild drops console.* and debugger in production builds
  esbuild: {
    drop: ["console", "debugger"],
  },
});
