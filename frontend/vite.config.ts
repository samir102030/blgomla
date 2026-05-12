import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
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
    // Raise the warning limit since we've manually chunked
    chunkSizeWarningLimit: 400,
  },
});
