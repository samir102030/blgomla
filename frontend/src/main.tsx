import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./index.css";
import "./lib/i18n";
import App from "./App.tsx";
import { applyInitialTheme } from "./lib/theme";
import { initSentry } from "./lib/sentry";
import { installImageFallback } from "./lib/imageFallback";

initSentry();
applyInitialTheme();
installImageFallback();

// When a new deploy replaces the hashed asset files, a tab still running the
// old build fails to lazy-load chunks ("Failed to fetch dynamically imported
// module"). Reload once to pull the fresh bundle. The 10s guard prevents a
// reload loop if the chunk is genuinely missing for another reason.
const recoverFromChunkError = () => {
  const KEY = "chunk-reload-ts";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last < 10_000) return;
  sessionStorage.setItem(KEY, String(Date.now()));
  window.location.reload();
};
window.addEventListener("vite:preloadError", recoverFromChunkError);

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Most product/brand/category data is safe to serve stale for a minute
      // while we refetch in the background.
      staleTime: 60_000,
      // Keep results in cache for 5 minutes after the last component unmounts —
      // lets users go back/forward without re-hitting the network.
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <App />
        </GoogleOAuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  </StrictMode>
);
