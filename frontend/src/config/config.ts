const isProd = import.meta.env.VITE_ENV === "production";

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || (isProd ? "/api" : "http://localhost:3030/api"),
  socketUrl: import.meta.env.VITE_SOCKET_URL || (isProd ? "/" : "http://localhost:3030"),
  appUrl: window.location.origin,
} as const;

// Optional: Validate required config on startup
if (!import.meta.env.VITE_API_URL) {
  console.warn("VITE_API_URL is not defined in environment variables, falling back to default.");
}
 