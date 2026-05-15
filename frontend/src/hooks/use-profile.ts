import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/api/auth.api";
import { getApiErrorMessage } from "@/lib/utils";
import { useAuthStore } from "@/store/use-auth-store";

export function useUpdateProfile() {
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { accessToken, refreshToken } = useAuthStore();

  return useMutation({
    mutationFn: (data: { name?: string; avatarUrl?: string }) => authApi.updateProfile(data),
    onSuccess: (res) => {
      const user = res.data.data;
      if (accessToken && refreshToken) {
          setAuth(user, accessToken, refreshToken);
      }
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Profile updated successfully!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: any) => authApi.changePassword(oldPassword, newPassword),
    onSuccess: () => {
      toast.success("Password changed successfully!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}
