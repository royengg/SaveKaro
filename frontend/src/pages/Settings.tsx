import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Tag,
  Percent,
  Loader2,
  Save,
  User,
  Shield,
  Settings2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useAuthStore } from "@/store/authStore";
import { useCategories } from "@/hooks/useDeals";
import api from "@/lib/api";
import { toast } from "sonner";

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
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div>
        {/* Header */}
        <div className="border-b">
          <div className="container max-w-3xl mx-auto py-6 px-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground mb-4 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Settings2 className="h-6 w-6 text-primary" />
                  Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your account and notification preferences
                </p>
              </div>
              {hasChanges && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container max-w-3xl mx-auto py-6 px-4 space-y-8 pb-24 md:pb-8">
          {/* Profile Section */}
          <section className="border rounded-xl p-5 bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Profile</h2>
            </div>
            <Separator />
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="text-lg">
                  {user?.name?.charAt(0).toUpperCase() || (
                    <User className="h-6 w-6" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="font-semibold text-lg">
                  {user?.name || "Anonymous User"}
                </p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="outline" className="text-xs gap-1">
                  <Shield className="h-3 w-3" />
                  Signed in with Google
                </Badge>
              </div>
            </div>
          </section>

          {/* Notification Preferences */}
          <section className="border rounded-xl p-5 bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            <Separator />

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <Label className="text-base font-medium">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive deal alerts and updates via email
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

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <Label className="text-base font-medium">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified in your browser when new deals match
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
          </section>

          {/* Deal Preferences */}
          <section className="border rounded-xl p-5 bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Deal Preferences</h2>
            </div>
            <Separator />

            {/* Minimum Discount */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label className="text-base font-medium">
                  Minimum Discount Threshold
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Only notify me about deals with at least this much discount
              </p>
              <div className="flex flex-wrap gap-2">
                {DISCOUNT_OPTIONS.map((d) => (
                  <Badge
                    key={d}
                    variant={
                      preferences.minDiscountPercent === d
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer py-2 px-4 text-sm transition-colors"
                    onClick={() => updateField("minDiscountPercent", d)}
                  >
                    {preferences.minDiscountPercent === d && (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    {d}%+ OFF
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Preferred Categories */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Preferred Categories
              </Label>
              <p className="text-sm text-muted-foreground">
                Select categories you're most interested in — these will be
                prioritized in your feed and alerts
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat: any) => {
                  const isSelected = preferences.preferredCategories.includes(
                    cat.id,
                  );
                  return (
                    <Badge
                      key={cat.id}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3 text-sm transition-colors"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      {isSelected && <Check className="h-3 w-3 mr-1" />}
                      {cat.name}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Account Section */}
          <section className="border rounded-xl p-5 bg-card shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Account</h2>
            </div>
            <Separator />

            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-foreground">Member Since</p>
                  <p>Your SaveKaro account</p>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
              <Separator />
              <div className="py-2">
                <p className="font-medium text-foreground mb-1">
                  Data & Privacy
                </p>
                <p>
                  Your data is stored securely and never shared with third
                  parties. Contact support to request data export or account
                  deletion.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
