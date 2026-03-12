import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuthStore } from "@/store/authStore";
import { Loader2 } from "lucide-react";

import Home from "@/pages/Home"; // Eager loaded for instant LCP
const IconRail = lazy(() => import("@/components/layout/IconRail"));
const BottomNav = lazy(() => import("@/components/layout/BottomNav"));
const Footer = lazy(() => import("@/components/layout/Footer"));
const Toaster = lazy(() =>
  import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })),
);
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
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("@/pages/TermsAndConditions"));
const AffiliateDisclosure = lazy(() => import("@/pages/AffiliateDisclosure"));
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

function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Ensure every route starts at top across desktop + mobile browsers.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
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
      <Suspense fallback={null}>
        <IconRail />
      </Suspense>
      <div className="md:ml-24 pb-20 md:pb-0">
        <Outlet />
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <BottomNav />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTopOnRouteChange />
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
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route
                    path="/terms-and-conditions"
                    element={<TermsAndConditions />}
                  />
                  <Route
                    path="/affiliate-disclosure"
                    element={<AffiliateDisclosure />}
                  />
                  <Route path="/disclaimer" element={<AffiliateDisclosure />} />

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
        <Suspense fallback={null}>
          <Toaster position="bottom-right" richColors />
        </Suspense>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
