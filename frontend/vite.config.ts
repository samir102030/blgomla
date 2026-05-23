import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: false,
      // Custom SW so we can handle push events (browser push notifications).
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json,webmanifest}"],
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
