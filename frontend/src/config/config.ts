const baseUrl = import.meta.env.VITE_ENV === "production"
  ? {
    apiUrl: import.meta.env.VITE_API_URL || "/api",
    socketUrl: import.meta.env.VITE_SOCKET_URL || "/",
    appUrl: window.location.origin,
  }
  : {
    apiUrl: "http://localhost:3030/api",
    socketUrl: "http://localhost:3030",
    appUrl: window.location.origin,
  };

export const config = {
  apiUrl: baseUrl.apiUrl,
  socketUrl: baseUrl.socketUrl,
  appUrl: baseUrl.appUrl,
  siteDomain: import.meta.env.VITE_SITE_DOMAIN || "kollects.com",
} as const;

// Optional: Validate required config on startup
if (!import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL is not defined in environment variables, falling back to default.");
}
 