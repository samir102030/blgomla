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
        manualChunks(id) {
          // Application code ships with the route chunk that imports it.
          if (!id.includes("node_modules")) return undefined;

          // Per-package vendor chunks — each caches independently so a
          // bump to axios doesn't invalidate React in the user's cache.
          if (/[/\\](react|react-dom|react-router-dom|scheduler)[/\\]/.test(id))
            return "vendor-react";
          if (/[/\\]@tanstack[/\\]react-query[/\\]/.test(id)) return "vendor-query";
          if (/[/\\]react-helmet-async[/\\]/.test(id)) return "vendor-helmet";
          if (/[/\\](@react-oauth|jwt-decode)[/\\]/.test(id)) return "vendor-oauth";
          if (/[/\\]@sentry[/\\]/.test(id)) return "vendor-sentry";
          if (/[/\\]@heroicons[/\\]/.test(id)) return "vendor-icons";
          if (/[/\\](i18next|react-i18next)[/\\]/.test(id)) return "vendor-i18n";
          if (/[/\\]react-hot-toast[/\\]/.test(id)) return "vendor-toast";
          if (/[/\\]zustand[/\\]/.test(id)) return "vendor-state";
          if (/[/\\]axios[/\\]/.test(id)) return "vendor-network";
          if (/[/\\](socket\.io-client|engine\.io-client)[/\\]/.test(id))
            return "vendor-socket";
          if (/[/\\](leaflet|react-leaflet)[/\\]/.test(id)) return "vendor-map";

          // Long-tail node_modules: one shared chunk rather than smearing
          // tiny packages across every route chunk.
          return "vendor-misc";
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
