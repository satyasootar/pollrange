import { useEffect } from "react";
import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth.api";
import { useAuthStore } from "@/store/use-auth-store";

export function ProtectedRoute() {
  const { user, setUser, isHydrated } = useAuthStore();
  const navigate = useNavigate();

  const { isLoading, isError } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me(),
    enabled: !user, // Only fetch if no cached user
    select: (res) => res.data.data,
    retry: false,
  });

  useEffect(() => {
    // Sync fetched user into store
    // This is handled via onSuccess in the query below separately
  }, []);

  // Simplified: user is synced via the main query below

  // Simpler approach: watch query data
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await authApi.me();
      setUser(res.data.data);
      return res.data.data;
    },
    enabled: isHydrated && !user,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  if (!isHydrated || meQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user && (isError || meQuery.isError)) {
    const redirect = encodeURIComponent(window.location.pathname);
    return <Navigate to={`/auth/login?redirect=${redirect}`} replace />;
  }

  if (!user) return null;

  return <Outlet />;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
