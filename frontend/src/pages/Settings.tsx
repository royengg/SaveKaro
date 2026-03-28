import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Tag,
  Loader2,
  Save,
  User,
  Shield,
  Settings2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useAuthStore } from "@/store/authStore";
import { useCategories } from "@/hooks/useDeals";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Header from "@/components/layout/Header";

interface Preferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  preferredCategories: string[];
  minDiscountPercent: number;
}

const DISCOUNT_OPTIONS = [10, 20, 30, 50, 70];

export function Settings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: categories = [] } = useCategories();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    emailNotifications: true,
    pushNotifications: false,
    preferredCategories: [],
    minDiscountPercent: 30,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const softPanelClass = "surface-liquid-subtle rounded-[28px] p-4 md:p-5";
  const nestedGlassClass =
    "rounded-[22px] border border-slate-200/72 bg-slate-50/82 p-4 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.16)] backdrop-blur-md";

  const fetchPreferences = useCallback(async () => {
    try {
      const res = (await api.getPreferences()) as any;
      if (res.success) {
        setPreferences({
          emailNotifications: res.data.emailNotifications,
          pushNotifications: res.data.pushNotifications,
          preferredCategories: res.data.preferredCategories || [],
          minDiscountPercent: res.data.minDiscountPercent,
        });
      }
    } catch {
      // Use defaults if preferences not found
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updateField = <K extends keyof Preferences>(
    field: K,
    value: Preferences[K],
  ) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const toggleCategory = (categoryId: string) => {
    setPreferences((prev) => {
      const current = prev.preferredCategories;
      const updated = current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId];
      return { ...prev, preferredCategories: updated };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updatePreferences(preferences);
      toast.success("Settings saved successfully!");
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.1),transparent_30%),linear-gradient(180deg,#fff_0%,#fcfcfd_38%,#f8fafc_100%)]">
        <Header />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="surface-liquid-glass rounded-full p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.1),transparent_30%),linear-gradient(180deg,#fff_0%,#fcfcfd_38%,#f8fafc_100%)]">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-5 pb-24 md:pb-10">
        <button
          onClick={() => navigate(-1)}
          className="surface-liquid-chip inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-[transform,color,background-color] duration-200 hover:-translate-y-[1px] hover:text-foreground active:scale-[0.98]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <section className="surface-liquid-glass mt-4 rounded-[30px] p-5 md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.12),transparent_34%)]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="surface-liquid-chip flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]">
                <Settings2
                  className="h-5 w-5 text-[#e60023]"
                  strokeWidth={2.2}
                />
              </div>
              <div>
                <h1 className="text-[1.85rem] font-bold tracking-[-0.03em] text-foreground">
                  Settings
                </h1>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="surface-liquid-chip inline-flex h-8 items-center gap-1.5 rounded-full border-black/[0.045] bg-[linear-gradient(180deg,rgba(247,249,252,0.96),rgba(239,243,248,0.88))] px-3 text-[12px] font-medium text-foreground/80 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)]">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    Google account
                  </span>
                  <span className="surface-liquid-chip inline-flex h-8 items-center gap-1.5 rounded-full border-black/[0.045] bg-[linear-gradient(180deg,rgba(247,249,252,0.96),rgba(239,243,248,0.88))] px-3 text-[12px] font-medium text-foreground/80 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)]">
                    {preferences.preferredCategories.length} categories tuned
                  </span>
                  <span className="surface-liquid-chip inline-flex h-8 items-center gap-1.5 rounded-full border-black/[0.045] bg-[linear-gradient(180deg,rgba(247,249,252,0.96),rgba(239,243,248,0.88))] px-3 text-[12px] font-medium text-foreground/80 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.18)]">
                    {preferences.minDiscountPercent}% minimum discount
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {hasChanges ? (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="cta-dark-pill h-10 px-4 text-[15px] font-semibold"
                >
                  <span className="cta-dark-pill-icon">
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                  </span>
                  Save changes
                </Button>
              ) : (
                <span className="surface-liquid-chip inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  All changes saved
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="mt-5 space-y-4">
          <section className={softPanelClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="surface-liquid-chip flex h-11 w-11 items-center justify-center rounded-[18px]">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  Profile
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your account identity and sign-in method.
                </p>
              </div>
            </div>

            <div className={nestedGlassClass}>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-white/72 shadow-[0_16px_28px_-22px_rgba(15,23,42,0.28)]">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="text-lg">
                    {user?.name?.charAt(0).toUpperCase() || (
                      <User className="h-6 w-6" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-lg font-semibold">
                    {user?.name || "Anonymous User"}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                  <span className="surface-liquid-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-foreground/80">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    Signed in with Google
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className={softPanelClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="surface-liquid-chip flex h-11 w-11 items-center justify-center rounded-[18px]">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  Notifications
                </h2>
                <p className="text-sm text-muted-foreground">
                  Decide how aggressively SaveKaro should reach you.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div
                className={cn(
                  nestedGlassClass,
                  "flex items-center justify-between gap-4",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-black/6 bg-secondary/78 text-foreground/58 shadow-[0_12px_22px_-24px_rgba(15,23,42,0.18)]">
                    <Mail className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div>
                    <Label className="text-[15px] font-semibold">
                      Email notifications
                    </Label>
                    <p className="text-[13px] leading-5 text-muted-foreground">
                      Receive deal alerts and updates in your inbox.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked: boolean) =>
                    updateField("emailNotifications", checked)
                  }
                />
              </div>

              <div
                className={cn(
                  nestedGlassClass,
                  "flex items-center justify-between gap-4",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-black/6 bg-secondary/78 text-foreground/58 shadow-[0_12px_22px_-24px_rgba(15,23,42,0.18)]">
                    <Smartphone className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div>
                    <Label className="text-[15px] font-semibold">
                      Push notifications
                    </Label>
                    <p className="text-[13px] leading-5 text-muted-foreground">
                      Browser alerts when fresh deals match your rules.
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences.pushNotifications}
                  onCheckedChange={(checked: boolean) =>
                    updateField("pushNotifications", checked)
                  }
                />
              </div>
            </div>
          </section>

          <section className={softPanelClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="surface-liquid-chip flex h-11 w-11 items-center justify-center rounded-[18px]">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  Deal Preferences
                </h2>
                <p className="text-sm text-muted-foreground">
                  Shape the kind of deals and discount levels you care about.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className={nestedGlassClass}>
                <div className="mb-3 flex items-center gap-2">
                  <Label className="text-[15px] font-semibold">
                    Minimum discount threshold
                  </Label>
                </div>
                <p className="mb-3 text-[13px] leading-5 text-muted-foreground">
                  Only send or prioritize deals that clear your discount floor.
                </p>
                <div className="flex flex-wrap gap-2">
                  {DISCOUNT_OPTIONS.map((d) => {
                    const isSelected = preferences.minDiscountPercent === d;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateField("minDiscountPercent", d)}
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:scale-[0.98]",
                          isSelected
                            ? "border-foreground/5 bg-foreground text-background shadow-[0_16px_26px_-22px_rgba(15,23,42,0.34)]"
                            : "border-slate-200/80 bg-slate-100/78 text-foreground/80 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.14)] hover:border-slate-300/80 hover:bg-white hover:text-foreground",
                        )}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                        {d}% OFF
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={nestedGlassClass}>
                <Label className="text-[15px] font-semibold">
                  Preferred categories
                </Label>
                <p className="mb-3 mt-1 text-[13px] leading-5 text-muted-foreground">
                  These categories will be weighted higher in your feed and
                  alert matching.
                </p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat: any) => {
                    const isSelected = preferences.preferredCategories.includes(
                      cat.id,
                    );
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={cn(
                          "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:scale-[0.98]",
                          isSelected
                            ? "border-foreground/5 bg-foreground text-background shadow-[0_16px_26px_-22px_rgba(15,23,42,0.34)]"
                            : "border-slate-200/80 bg-slate-100/78 text-foreground/80 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.14)] hover:border-slate-300/80 hover:bg-white hover:text-foreground",
                        )}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className={softPanelClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="surface-liquid-chip flex h-11 w-11 items-center justify-center rounded-[18px]">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  Account
                </h2>
                <p className="text-sm text-muted-foreground">
                  Membership status and data handling.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className={nestedGlassClass}>
                <p className="text-[15px] font-semibold text-foreground">
                  Data & Privacy
                </p>
                <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                  Your data stays within your account context and is not shared
                  with third parties. Contact support if you need export or
                  deletion assistance.
                </p>
              </div>
              <div
                className={cn(
                  nestedGlassClass,
                  "flex flex-col justify-between gap-3",
                )}
              >
                <div>
                  <p className="text-[15px] font-semibold text-foreground">
                    Member status
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Your SaveKaro account is on free tier.
                  </p>
                </div>
                <span className="inline-flex h-8 w-fit items-center rounded-full border border-emerald-600/18 bg-emerald-600 px-3 text-[12px] font-medium text-white shadow-[0_14px_24px_-22px_rgba(5,150,105,0.42)]">
                  Active
                </span>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Settings;
