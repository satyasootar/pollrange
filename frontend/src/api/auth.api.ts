import api from "@/lib/api";
import type { User } from "@/types";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    api.post<{ data: { user: User } }>("/auth/register", data),

  login: (data: LoginPayload) =>
    api.post<{ data: { user: User } }>("/auth/login", data),

  logout: () => api.post("/auth/logout"),

  me: () => api.get<{ data: User }>("/auth/me"),

  refreshToken: () => api.post("/auth/refresh-token"),

  changePassword: (oldPassword: string, newPassword: string) =>
    api.post("/auth/change-password", { oldPassword, newPassword }),

  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/reset-password", { token, newPassword }),

  requestVerification: () =>
    api.post("/auth/request-verification"),

  verifyEmail: (data: { token: string }) =>
    api.post("/auth/verify-email", data),

  updateProfile: (data: { name?: string; avatarUrl?: string }) =>
    api.patch<{ data: User }>("/auth/me", data),
};
