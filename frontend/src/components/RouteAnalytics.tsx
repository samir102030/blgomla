import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../lib/analytics";

export default function RouteAnalytics() {
  const location = useLocation();

  useEffect(() => {
    // Defer one tick so <SEO> has a chance to update document.title first.
    const id = window.setTimeout(() => {
      trackPageView(location.pathname + location.search);
    }, 0);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.search]);

  return null;
}
