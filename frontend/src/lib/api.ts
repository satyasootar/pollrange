import axios, { type AxiosError } from "axios";
import { toast } from "sonner";
import { config } from "@/config/config";

export const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Single-flight refresh: concurrent 401s share one refresh call so rotating
// refresh tokens don't invalidate each other and log the user out.
let refreshPromise: Promise<void> | null = null;

// 401s from these endpoints are real auth failures, not an expired access token.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/refresh-token"];

// ─── Response interceptor: normalize errors ───────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ error?: { message?: string } }>) => {
    const status = error.response?.status;
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => original?.url?.includes(p));

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        refreshPromise ??= axios
          .post(`${config.apiUrl}/auth/refresh-token`, {}, { withCredentials: true })
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
        await refreshPromise;
        return api.request(original);
      } catch {
        // Refresh failed – clear auth and redirect
        const { clearAuth } = await import("@/store/use-auth-store").then(
          (m) => m.useAuthStore.getState()
        );
        clearAuth();
        window.location.href = "/";
      }
    }

    if (status === 429) {
      toast.error("Too many requests. Please slow down.");
    }

    return Promise.reject(error);
  }
);

export default api;
