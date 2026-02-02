import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/authStore";
import Home from "@/pages/Home";
import Categories from "@/pages/Categories";
import DealDetail from "@/pages/DealDetail";
import SubmitDeal from "@/pages/SubmitDeal";
import Notifications from "@/pages/Notifications";
import SavedDeals from "@/pages/SavedDeals";
import Explore from "@/pages/Explore";
import AdminDashboard from "@/pages/AdminDashboard";
import Leaderboard from "@/pages/Leaderboard";
import { AuthCallback, AuthError } from "@/pages/AuthCallback";

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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/deal/:id" element={<DealDetail />} />
            <Route path="/submit" element={<SubmitDeal />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/saved" element={<SavedDeals />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/error" element={<AuthError />} />
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
