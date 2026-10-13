import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageview, watchConsent } from "@/lib/tracker";

/** Sends a page view per route change (only with analytics consent; see lib/tracker). */
export function SiteTracker() {
  const { pathname } = useLocation();
  useEffect(() => trackPageview(pathname), [pathname]);
  // Granting consent mid-visit counts the page they're on; withdrawing deletes the cookies.
  useEffect(() => watchConsent(() => trackPageview(window.location.pathname)), []);
  return null;
}
