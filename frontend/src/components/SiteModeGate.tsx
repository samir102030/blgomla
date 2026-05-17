import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteModeStore } from "../stores/siteMode.store";
import { useUserStore } from "../stores/user.store";
import ComingSoonPage from "../pages/ComingSoonPage";

const PREVIEW_STORAGE_KEY = "belgomla.previewBypass";

// Routes that must always be reachable, even when coming-soon is active:
// admin dashboard (to flip the toggle back), auth (so admins can sign in),
// and the splash itself.
const BYPASS_PREFIXES = [
  "/dashboard",
  "/vendor",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const isBypassPath = (path: string) =>
  BYPASS_PREFIXES.some((p) => path.startsWith(p));

interface Props {
  children: React.ReactNode;
}

const SiteModeGate: React.FC<Props> = ({ children }) => {
  const mode = useSiteModeStore((s) => s.mode);
  const fetchPublicMode = useSiteModeStore((s) => s.fetchPublicMode);
  const user = useUserStore((s) => s.user);
  const location = useLocation();

  // Sticky preview bypass — if the visitor lands with ?previewKey=… we mark
  // them as a preview viewer for the rest of the session so deep links keep
  // working without the param.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const previewKey = params.get("previewKey");
    if (previewKey) {
      sessionStorage.setItem(PREVIEW_STORAGE_KEY, previewKey);
    }
  }, [location.search]);

  useEffect(() => {
    fetchPublicMode();
  }, [fetchPublicMode]);

  // Until we know, render children — fail-open is better UX than a flash of
  // splash for legit visitors when the API is slow.
  if (!mode) return <>{children}</>;
  if (!mode.comingSoon) return <>{children}</>;

  // Admin / super_admin always bypass.
  if (user && (user.role === "admin" || user.role === "super_admin")) {
    return <>{children}</>;
  }

  // Preview key bypass (either in URL or stashed in sessionStorage).
  const hasPreview = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
  if (hasPreview) return <>{children}</>;

  // Allowlisted routes — admins still need to be able to log in.
  if (isBypassPath(location.pathname)) return <>{children}</>;

  return <ComingSoonPage mode={mode} />;
};

export default SiteModeGate;
