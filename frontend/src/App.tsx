import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/store/authStore";
import { IconRail } from "@/components/layout/IconRail";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";

import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

import Home from "@/pages/Home"; // Eager loaded for instant LCP
const Categories = lazy(() => import("@/pages/Categories"));
const DealDetail = lazy(() => import("@/pages/DealDetail"));
const SubmitDeal = lazy(() => import("@/pages/SubmitDeal"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const SavedDeals = lazy(() => import("@/pages/SavedDeals"));
const Explore = lazy(() => import("@/pages/Explore"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PriceAlerts = lazy(() => import("@/pages/PriceAlerts"));
const Settings = lazy(() => import("@/pages/Settings"));
const AuthCallback = lazy(() =>
  import("@/pages/AuthCallback").then((m) => ({ default: m.AuthCallback })),
);
const AuthError = lazy(() =>
  import("@/pages/AuthCallback").then((m) => ({ default: m.AuthError })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
}

/** Global layout: IconRail on desktop, BottomNav on mobile */
function AppLayout() {
  const location = useLocation();
  const isExplore = location.pathname === "/explore";

  if (isExplore) {
    return <Outlet />;
  }

  return (
    <>
      <IconRail />
      <div className="md:ml-24 pb-20 md:pb-0">
        <Outlet />
        <Footer />
      </div>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthInitializer>
            <Suspense
              fallback={
                <div className="min-h-[100dvh] flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              }
            >
              <Routes>
                {/* All pages wrapped in AppLayout (IconRail + BottomNav) */}
                <Route element={<AppLayout />}>
                  {/* Public routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/deal/:id" element={<DealDetail />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />

                  {/* Protected routes (require auth) */}
                  <Route
                    path="/submit"
                    element={
                      <ProtectedRoute>
                        <SubmitDeal />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <Notifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/saved"
                    element={
                      <ProtectedRoute>
                        <SavedDeals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/alerts"
                    element={
                      <ProtectedRoute>
                        <PriceAlerts />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Auth routes outside layout (no nav needed) */}
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/auth/error" element={<AuthError />} />
              </Routes>
            </Suspense>
          </AuthInitializer>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
