import axios, { type AxiosError } from "axios";
import { toast } from "sonner";
import { config } from "@/config/config";

export const api = axios.create({
  baseURL: config.apiUrl,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// ─── Response interceptor: normalize errors ───────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ error?: { message?: string } }>) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.error?.message ?? "Something went wrong.";

    if (status === 401) {
      // Try silent token refresh
      try {
        await axios.post(
          `${config.apiUrl}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        // Retry original request
        return api.request(error.config!);
      } catch {
        // Refresh failed – clear auth and redirect
        const { clearAuth } = await import("@/store/use-auth-store").then(
          (m) => m.useAuthStore.getState()
        );
        clearAuth();
        window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    if (status === 429) {
      toast.error("Too many requests. Please slow down.");
    }

    return Promise.reject(error);
  }
);

export default api;
