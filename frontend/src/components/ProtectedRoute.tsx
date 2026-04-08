import { type ReactNode, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    hasAttemptedSessionRestore,
    checkAuth,
  } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoading && !hasAttemptedSessionRestore) {
      void checkAuth({ force: true });
    }
  }, [checkAuth, hasAttemptedSessionRestore, isAuthenticated, isLoading]);

  if (isLoading || (!isAuthenticated && !hasAttemptedSessionRestore)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
