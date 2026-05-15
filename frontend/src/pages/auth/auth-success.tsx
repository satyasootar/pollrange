import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/use-auth-store";
import { api } from "@/lib/api";
import type { ApiResponse, User } from "@/types";

export function AuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    const handleAuth = async () => {
      const accessToken = searchParams.get("accessToken");
      const refreshToken = searchParams.get("refreshToken");

      if (accessToken && refreshToken) {
        try {
          // Since cookies are already set by the backend redirect,
          // we just need to fetch the user profile to populate the store.
          const response = await api.get<ApiResponse<User>>("/auth/me");
          setUser(response.data.data);
          
          const redirect = searchParams.get("state");
          navigate(redirect || "/dashboard", { replace: true });
        } catch (error) {
          console.error("Failed to sync auth state:", error);
          navigate("/auth/login", { replace: true });
        }
      } else {
        navigate("/auth/login", { replace: true });
      }
    };

    handleAuth();
  }, [searchParams, setUser, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-muted-foreground">Finalizing authentication...</p>
      </div>
    </div>
  );
}
