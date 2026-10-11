const baseUrl = import.meta.env.VITE_ENV === "production"
  ? {
    apiUrl: import.meta.env.VITE_API_URL || "/api",
    socketUrl: import.meta.env.VITE_SOCKET_URL || "/",
    appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  }
  : {
    apiUrl: "http://localhost:3030/api",
    socketUrl: "http://localhost:3030",
    appUrl: import.meta.env.VITE_APP_URL || window.location.origin,
  };

export const config = {
  apiUrl: baseUrl.apiUrl,
  socketUrl: baseUrl.socketUrl,
  appUrl: baseUrl.appUrl,
  siteDomain: import.meta.env.VITE_SITE_DOMAIN || "kollects.com",
  // Opt-in: hide all AI UI unless the backend has MISTRAL_API_KEY configured.
  aiEnabled: import.meta.env.VITE_ENABLE_AI === "true",
} as const;

// Optional: Validate required config on startup
if (!import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL is not defined in environment variables, falling back to default.");
}
 