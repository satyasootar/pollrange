import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { toast } from "sonner";

export function useRequestVerification() {
  return useMutation({
    mutationFn: () => authApi.requestVerification(),
    onSuccess: () => {
      toast.success("Verification email sent! Please check your inbox.");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send verification email");
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail(token),
    onSuccess: () => {
      toast.success("Email verified successfully!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Verification failed. The token may be expired.");
    },
  });
}
