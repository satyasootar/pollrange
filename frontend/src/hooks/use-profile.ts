import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { toastApiError } from "@/lib/utils";
import { toast } from "sonner";
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
    onError: (err) => toastApiError(err),
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword?: string | undefined; newPassword: string }) =>
      authApi.changePassword(oldPassword, newPassword),
    onSuccess: (res) => {
      const created = res.data.data.created;
      toast.success(created ? "Password added. You can now also sign in with your email and password." : "Password changed successfully!");
      // Refresh /me so the form switches from "Add" to "Update".
      if (created) qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err) => toastApiError(err),
  });
}
