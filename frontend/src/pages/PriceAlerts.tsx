import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Bell,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Loader2,
  Search,
  IndianRupee,
  Tag,
  Globe,
  Link2,
} from "lucide-react";
import Header from "@/components/layout/Header";

interface PriceAlert {
  id: string;
  mode: "KEYWORD" | "URL";
  keywords: string;
  watchUrl: string | null;
  maxPrice: number | null;
  categoryId: string | null;
  region: string | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export function PriceAlerts() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [mode, setMode] = useState<"KEYWORD" | "URL">("KEYWORD");
  const [keywords, setKeywords] = useState("");
  const [watchUrl, setWatchUrl] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [region, setRegion] = useState("");

  const fetchAlerts = useCallback(async () => {
    try {
      const res = (await api.getAlerts()) as any;
      if (res.success) setAlerts(res.data);
    } catch {
      toast.error("Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = (await api.getCategories()) as any;
      if (res.success) setCategories(res.data);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
    fetchAlerts();
    fetchCategories();
  }, [isAuthenticated, navigate, fetchAlerts, fetchCategories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "KEYWORD" && !keywords.trim()) return;
    if (mode === "URL" && !watchUrl.trim()) return;
    setIsCreating(true);

    try {
      const data: any = { mode };
      if (mode === "KEYWORD") {
        data.keywords = keywords.trim();
      } else {
        data.watchUrl = watchUrl.trim();
      }
      if (maxPrice) data.maxPrice = Number(maxPrice);
      if (mode === "KEYWORD" && categoryId) data.categoryId = categoryId;
      if (region) data.region = region;

      await api.createAlert(data);
      toast.success(
        mode === "URL"
          ? "Watchlist added. You'll be notified when that product link appears at your target price."
          : "Alert created! You'll be notified when matching deals appear.",
      );
      setMode("KEYWORD");
      setKeywords("");
      setWatchUrl("");
      setMaxPrice("");
      setCategoryId("");
      setRegion("");
      setShowForm(false);
      fetchAlerts();
    } catch (err: any) {
      toast.error(err.message || "Failed to create alert");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Alert deleted");
    } catch {
      toast.error("Failed to delete alert");
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = (await api.toggleAlert(id)) as any;
      if (res.success) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === id ? { ...a, isActive: res.data.isActive } : a,
          ),
        );
        toast.success(res.data.isActive ? "Alert activated" : "Alert paused");
      }
    } catch {
      toast.error("Failed to toggle alert");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Header */}
      <div className="border-b">
        <div className="container max-w-3xl mx-auto py-6 px-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="h-6 w-6 text-[#e60023]" strokeWidth={2.2} />
                Price Alerts
              </h1>
              <p className="text-muted-foreground mt-1">
                Track deals by keywords or exact product URL and get notified at your target price
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="cta-dark-pill shrink-0 self-start px-4 py-2.5 text-sm font-semibold"
            >
              <span className="cta-dark-pill-icon">
                <Plus className="h-3.5 w-3.5" />
              </span>
              New Alert
            </button>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto py-6 px-4 space-y-6">
        {/* Create form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="border rounded-xl p-5 space-y-4 bg-card shadow-sm"
          >
            <h3 className="font-semibold text-lg">Create Alert</h3>

            <div className="inline-flex rounded-full border bg-secondary/40 p-1">
              <button
                type="button"
                onClick={() => setMode("KEYWORD")}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "KEYWORD"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Keyword
              </button>
              <button
                type="button"
                onClick={() => setMode("URL")}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "URL"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Product URL
              </button>
            </div>

            {mode === "KEYWORD" ? (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Keywords <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder='e.g. "PS5", "iPhone 15 Pro", "Nike shoes"'
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                    minLength={2}
                    maxLength={200}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All keywords must appear in the deal title or description
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Product URL <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={watchUrl}
                    onChange={(e) => setWatchUrl(e.target.value)}
                    placeholder="https://www.amazon.in/dp/..."
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste a specific HTTPS product link. SaveKaro will watch that item for future matching deals.
                </p>
              </div>
            )}

            {/* Max Price + Category + Region row */}
            <div className={`grid grid-cols-1 gap-3 ${mode === "KEYWORD" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Max Price (optional)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="e.g. 40000"
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    min={1}
                  />
                </div>
              </div>
              {mode === "KEYWORD" && (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Category (optional)
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                    >
                      <option value="">Any category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Region (optional)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                  >
                    <option value="">Any region</option>
                    <option value="INDIA">🇮🇳 India</option>
                    <option value="WORLD">🌍 World</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={
                  isCreating ||
                  (mode === "KEYWORD" ? !keywords.trim() : !watchUrl.trim())
                }
                className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Alert"
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Alert list */}
        {alerts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-6">🔔</div>
            <h3 className="text-2xl font-semibold mb-3">No alerts yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Create your first price alert and we'll notify you when a matching
              deal drops — by email and in-app notification.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`border rounded-xl p-4 flex items-center justify-between gap-4 transition-colors ${
                  alert.isActive ? "bg-card" : "bg-muted/30 opacity-60"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base truncate">
                      {alert.keywords}
                    </span>
                    {alert.mode === "URL" && (
                      <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
                        URL watchlist
                      </span>
                    )}
                    {alert.maxPrice && (
                      <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                        ≤ ₹{Number(alert.maxPrice).toLocaleString("en-IN")}
                      </span>
                    )}
                    {alert.region && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                        {alert.region === "INDIA" ? "🇮🇳" : "🌍"} {alert.region}
                      </span>
                    )}
                    {!alert.isActive && (
                      <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {alert.watchUrl && (
                      <div className="truncate max-w-full">
                        {alert.watchUrl}
                      </div>
                    )}
                    Created {new Date(alert.createdAt).toLocaleDateString()}
                    {alert.lastTriggeredAt && (
                      <span>
                        {" · "}Last triggered{" "}
                        {new Date(alert.lastTriggeredAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(alert.id)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    title={alert.isActive ? "Pause alert" : "Activate alert"}
                  >
                    {alert.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                    title="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <p className="text-xs text-center text-muted-foreground pt-2">
              {alerts.length} / 10 alerts used
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PriceAlerts;
