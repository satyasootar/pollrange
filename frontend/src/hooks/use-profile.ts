import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authApi } from "@/api/auth.api";
import { getApiErrorMessage } from "@/lib/utils";
import { useAuthStore } from "@/store/use-auth-store";
import type { UserBranding } from "@/types";

export function useUpdateProfile() {
  const qc = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: (data: { name?: string; avatarUrl?: string; branding?: Partial<UserBranding> }) => authApi.updateProfile(data),
    onSuccess: (res) => {
      const user = res.data.data.user;
      setUser(user);
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Profile updated successfully!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) => authApi.changePassword(oldPassword, newPassword),
    onSuccess: () => {
      toast.success("Password changed successfully!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });
}
