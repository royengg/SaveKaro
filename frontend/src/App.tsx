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
import FloatingCartButton from "@/components/cart/FloatingCartButton";
import Footer from "@/components/layout/Footer";

import Home from "@/pages/Home"; // Eager loaded for instant LCP
const IconRail = lazy(() => import("@/components/layout/IconRail"));
const BottomNav = lazy(() => import("@/components/layout/BottomNav"));
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
const Guides = lazy(() => import("@/pages/Guides"));
const GuideDiscountQuality = lazy(
  () => import("@/pages/guides/GuideDiscountQuality"),
);
const GuideOffersAndCashback = lazy(
  () => import("@/pages/guides/GuideOffersAndCashback"),
);
const GuideFashionStoresIndia = lazy(
  () => import("@/pages/guides/GuideFashionStoresIndia"),
);
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const HowSaveKaroWorks = lazy(() => import("@/pages/HowSaveKaroWorks"));
const HowSaveKaroVerifiesDeals = lazy(
  () => import("@/pages/HowSaveKaroVerifiesDeals"),
);
const Cart = lazy(() => import("@/pages/Cart"));
const AuthCallback = lazy(() =>
  import("@/pages/AuthCallback").then((m) => ({ default: m.AuthCallback })),
);
const AuthError = lazy(() =>
  import("@/pages/AuthCallback").then((m) => ({ default: m.AuthError })),
);

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const runWhenIdle = (
  callback: () => void,
  timeout = 700,
) => {
  const idleWindow = window as IdleCapableWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(() => callback(), {
      timeout,
    });
    return () => {
      if (typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }

  const timeoutId = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(timeoutId);
};

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
    return runWhenIdle(() => {
      checkAuth();
    }, 800);
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
  const routeStage = (
    <div
      key={location.pathname}
      className={isExplore ? "route-stage-fixed-safe" : "route-stage"}
    >
      <Outlet />
    </div>
  );

  if (isExplore) {
    return routeStage;
  }

  return (
    <>
      <Suspense fallback={null}>
        <IconRail />
      </Suspense>
      <div className="md:ml-24 pb-20 md:pb-0">
        {routeStage}
        <Footer />
      </div>
      <FloatingCartButton />
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
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/guides" element={<Guides />} />
                  <Route
                    path="/guides/how-to-tell-if-a-discount-is-actually-good"
                    element={<GuideDiscountQuality />}
                  />
                  <Route
                    path="/guides/how-to-compare-coupons-bank-offers-and-cashback"
                    element={<GuideOffersAndCashback />}
                  />
                  <Route
                    path="/guides/best-fashion-deal-stores-in-india"
                    element={<GuideFashionStoresIndia />}
                  />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route
                    path="/how-savekaro-works"
                    element={<HowSaveKaroWorks />}
                  />
                  <Route
                    path="/how-savekaro-verifies-deals"
                    element={<HowSaveKaroVerifiesDeals />}
                  />
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
                <Route
                  path="/auth/callback"
                  element={
                    <div className="route-stage">
                      <AuthCallback />
                    </div>
                  }
                />
                <Route
                  path="/auth/error"
                  element={
                    <div className="route-stage">
                      <AuthError />
                    </div>
                  }
                />
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
