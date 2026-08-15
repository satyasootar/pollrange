import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/utils";

export function useRequestVerification() {
  return useMutation({
    mutationFn: () => authApi.requestVerification(),
    onSuccess: () => {
      toast.success("Verification email sent! Please check your inbox.");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error) || "Failed to send verification email");
    },
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authApi.verifyEmail({ token }),
    onSuccess: () => {
      toast.success("Email verified successfully!");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error) || "Verification failed. The token may be expired.");
    },
  });
}
