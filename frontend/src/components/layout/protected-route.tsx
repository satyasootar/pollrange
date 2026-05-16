import { Outlet, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/use-auth-store";

export function ProtectedRoute() {
  const { user, setUser, clearAuth, isHydrated } = useAuthStore();

  const { isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const res = await authApi.me();
        setUser(res.data.data);
        return res.data.data;
      } catch (err) {
        clearAuth();
        throw err;
      }
    },
    // We check auth if we have a user (to verify session) or if we don't (to try to login)
    enabled: isHydrated,
    retry: false,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });

  if (!isHydrated || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
