import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/use-auth-store";
import { toastApiError } from "@/lib/utils";
import { toast } from "sonner";

export function useLogin() {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      setUser(res.data.data.user);
      qc.invalidateQueries({ queryKey: ["me"] });
      const params = new URLSearchParams(window.location.search);
      navigate(params.get("redirect") || "/dashboard/overview", { replace: true });
    },
    onError: (err) => toastApiError(err),
  });
}

export function useRegister() {
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      setUser(res.data.data.user);
      toast.success("Account created! A verification email has been sent to your inbox.");
      const params = new URLSearchParams(window.location.search);
      navigate(params.get("redirect") || "/dashboard", { replace: true });
    },
    onError: (err) => toastApiError(err),
  });
}

export function useLogout() {
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      qc.clear();
      navigate("/", { replace: true });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () =>
      toast.success("Reset email sent! Check your inbox."),
    onError: (err) => toastApiError(err),
  });
}

export function useResetPassword() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authApi.resetPassword(token, newPassword),
    onSuccess: () => {
      toast.success("Password reset! Please log in.");
      navigate("/auth/login");
    },
    onError: (err) => toastApiError(err),
  });
}
