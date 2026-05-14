import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import "./lib/i18n";
import App from "./App.tsx";
import { applyInitialTheme } from "./lib/theme";

applyInitialTheme();

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
        <App />
      </HelmetProvider>
    </QueryClientProvider>
  </StrictMode>
);
