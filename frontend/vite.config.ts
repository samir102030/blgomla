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
  server: {
    host: true,
    // Vite has no interest in $PORT on its own — it takes 5173 and walks up
    // from there. Reading it here lets a supervisor that already picked a free
    // port hand it over, instead of guessing where the server landed.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    // Vite rejects Host headers it doesn't recognise (DNS-rebinding defence).
    // Named suffixes rather than `true`, so only the tunnel providers we
    // actually use get through and any other hostname is still refused.
    allowedHosts: [".trycloudflare.com", ".loca.lt", ".ngrok-free.app", ".ngrok.io"],
    // Serve the API from the same origin as the app. Two wins: no CORS at all,
    // and the site works over one URL — a phone on the LAN or a temporary
    // tunnel gets the backend for free instead of asking it for `localhost`.
    // Needs VITE_API_URL=/api (see .env.local); with the absolute URL still
    // set, requests skip the proxy and this block does nothing.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        // Same-origin POST/PUT/DELETE still carry an Origin header, and the
        // backend's CORS allowlist would reject a tunnel hostname it has
        // never heard of. Present ourselves as the dev origin it already
        // trusts, so a new tunnel URL never needs a backend restart.
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            if (proxyReq.getHeader("origin")) {
              proxyReq.setHeader("origin", "http://localhost:5173");
            }
          });
        },
      },
      "/socket.io": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  // `vite preview` serves the built bundle. Same proxy and host rules as the
  // dev server, because the reason to reach for preview is a slow link: the
  // dev server ships every module as its own request, which is fine locally
  // and painfully slow through a tunnel. The build collapses that to a handful
  // of files.
  preview: {
    host: true,
    allowedHosts: [".trycloudflare.com", ".loca.lt", ".ngrok-free.app", ".ngrok.io"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            if (proxyReq.getHeader("origin")) {
              proxyReq.setHeader("origin", "http://localhost:5173");
            }
          });
        },
      },
      "/socket.io": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
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
