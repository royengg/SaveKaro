import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  Banknote,
  Tag,
  Store,
  Image,
  Globe2,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  BadgePercent,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, useCreateDeal } from "@/hooks/useDeals";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Header from "@/components/layout/Header";

export default function SubmitDeal() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { region, resetFilters } = useFilterStore();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createDeal = useCreateDeal();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    originalPrice: "",
    dealPrice: "",
    productUrl: "",
    imageUrl: "",
    store: "",
    categoryId: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title || formData.title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    }
    if (formData.title.length > 200) {
      newErrors.title = "Title must be less than 200 characters";
    }
    if (!formData.productUrl) {
      newErrors.productUrl = "Product URL is required";
    } else {
      try {
        new URL(formData.productUrl);
      } catch {
        newErrors.productUrl = "Please enter a valid URL";
      }
    }
    if (formData.imageUrl) {
      try {
        new URL(formData.imageUrl);
      } catch {
        newErrors.imageUrl = "Please enter a valid image URL";
      }
    }
    if (!formData.categoryId) {
      newErrors.categoryId = "Please select a category";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error("Please sign in to submit deals");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    try {
      await createDeal.mutateAsync({
        title: formData.title,
        description: formData.description || undefined,
        originalPrice: formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : undefined,
        dealPrice: formData.dealPrice
          ? parseFloat(formData.dealPrice)
          : undefined,
        productUrl: formData.productUrl,
        imageUrl: formData.imageUrl || undefined,
        store: formData.store || undefined,
        categoryId: formData.categoryId,
        region,
      });

      toast.success("Deal submitted successfully!");
      navigate("/");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit deal",
      );
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Calculate discount automatically
  const calculateDiscount = () => {
    const original = parseFloat(formData.originalPrice);
    const deal = parseFloat(formData.dealPrice);
    if (original && deal && original > deal) {
      return Math.round(((original - deal) / original) * 100);
    }
    return null;
  };

  const discount = calculateDiscount();
  const priceCurrencyCode = region === "INDIA" ? "INR" : "USD";
  const priceCurrencySymbol = region === "INDIA" ? "₹" : "$";
  const regionLabel = region === "INDIA" ? "India" : "World";
  const softPanelClass = "surface-liquid-subtle rounded-[28px] p-4 md:p-5";
  const nestedGlassClass =
    "rounded-[24px] border border-white/58 bg-white/56 p-4 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.28)] backdrop-blur-md";
  const fieldClass =
    "h-11 rounded-2xl border-white/58 bg-white/62 px-3.5 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.22)] backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-200 focus-visible:border-foreground/18 focus-visible:ring-foreground/10";
  const textAreaClass =
    "min-h-[112px] rounded-[22px] border-white/58 bg-white/62 px-3.5 py-3 shadow-[0_14px_26px_-24px_rgba(15,23,42,0.22)] backdrop-blur-md transition-[border-color,box-shadow,background-color] duration-200 focus-visible:border-foreground/18 focus-visible:ring-foreground/10";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.1),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.1),transparent_30%),linear-gradient(180deg,#fff_0%,#fcfcfd_38%,#f8fafc_100%)]">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-5 pb-24 md:pb-10">
        <Link
          to="/"
          onClick={resetFilters}
          className="surface-liquid-chip inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-[transform,color,background-color] duration-200 hover:-translate-y-[1px] hover:text-foreground active:scale-[0.98]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Deals
        </Link>

        <section className="surface-liquid-glass mt-4 rounded-[30px] p-5 md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_34%)]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="surface-liquid-chip flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]">
                <Upload className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-[1.9rem] font-bold tracking-[-0.03em] text-foreground">
                  Submit a Deal
                </h1>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="surface-liquid-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-foreground/80">
                    <Globe2 className="h-3.5 w-3.5 text-primary" />
                    Posting to {regionLabel}
                  </span>
                  <span className="surface-liquid-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-foreground/80">
                    <Banknote className="h-3.5 w-3.5 text-amber-500" />
                    {priceCurrencyCode} pricing
                  </span>
                  <span className="surface-liquid-chip inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-foreground/80">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Community submission
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <span className="surface-liquid-chip inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Goes live after submit
              </span>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <section className={softPanelClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="surface-liquid-chip flex h-11 w-11 items-center justify-center rounded-[18px]">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  The deal itself
                </h2>
                <p className="text-sm text-muted-foreground">
                  Keep the title crisp and give just enough context to make the
                  offer easy to trust.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className={nestedGlassClass}>
                <Label
                  htmlFor="title"
                  className="mb-2 flex items-center justify-between gap-3 text-[15px] font-semibold"
                >
                  <span>Deal title *</span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {formData.title.length}/200
                  </span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Sony WH-1000XM5 Headphones - 40% Off"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className={cn(fieldClass, errors.title && "border-red-400")}
                />
                <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                  Aim for brand, product, and why the price is good in one line.
                </p>
                {errors.title ? (
                  <p className="mt-2 text-sm text-red-500">{errors.title}</p>
                ) : null}
              </div>

              <div className={nestedGlassClass}>
                <Label
                  htmlFor="description"
                  className="mb-2 block text-[15px] font-semibold"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Add any extra context like coupon details, seller notes, or why this is a standout deal..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  className={textAreaClass}
                />
              </div>
            </div>
          </section>

          <section className={softPanelClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="surface-liquid-chip flex h-11 w-11 items-center justify-center rounded-[18px]">
                <BadgePercent className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  Pricing
                </h2>
                <p className="text-sm text-muted-foreground">
                  The discount preview updates automatically from the numbers
                  you enter.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className={nestedGlassClass}>
                <Label
                  htmlFor="originalPrice"
                  className="mb-2 flex items-center justify-between gap-2 text-[15px] font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Original Price
                  </span>
                  <span className="surface-liquid-chip inline-flex h-7 items-center rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {priceCurrencyCode}
                  </span>
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-muted-foreground">
                    {priceCurrencySymbol}
                  </span>
                  <Input
                    id="originalPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={region === "INDIA" ? "999" : "19.99"}
                    value={formData.originalPrice}
                    onChange={(e) =>
                      handleChange("originalPrice", e.target.value)
                    }
                    className={cn(fieldClass, "pl-9")}
                  />
                </div>
              </div>

              <div className={nestedGlassClass}>
                <Label
                  htmlFor="dealPrice"
                  className="mb-2 flex items-center justify-between gap-2 text-[15px] font-semibold"
                >
                  <span className="flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Deal Price
                  </span>
                  <span className="surface-liquid-chip inline-flex h-7 items-center rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {priceCurrencyCode}
                  </span>
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-muted-foreground">
                    {priceCurrencySymbol}
                  </span>
                  <Input
                    id="dealPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={region === "INDIA" ? "599" : "12.99"}
                    value={formData.dealPrice}
                    onChange={(e) => handleChange("dealPrice", e.target.value)}
                    className={cn(fieldClass, "pl-9")}
                  />
                </div>
              </div>
            </div>

            {discount ? (
              <div className="rounded-[24px] border border-emerald-200/80 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.84),rgba(236,253,245,0.78))] px-4 py-3 text-center shadow-[0_18px_32px_-28px_rgba(5,150,105,0.3)] backdrop-blur-md">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {discount}% discount preview
                </span>
              </div>
            ) : (
              <div className="surface-liquid-chip rounded-[22px] px-4 py-3 text-[13px] leading-5 text-muted-foreground">
                Add both prices to show the discount preview automatically.
              </div>
            )}
          </section>

          <section className={softPanelClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="surface-liquid-chip flex h-11 w-11 items-center justify-center rounded-[18px]">
                <LinkIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  Store and linking
                </h2>
                <p className="text-sm text-muted-foreground">
                  Add the destination link, a category, and any optional
                  image/store metadata.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className={nestedGlassClass}>
                <Label
                  htmlFor="productUrl"
                  className="mb-2 flex items-center gap-2 text-[15px] font-semibold"
                >
                  <LinkIcon className="h-4 w-4" />
                  Product URL *
                </Label>
                <Input
                  id="productUrl"
                  type="url"
                  placeholder="https://amazon.in/dp/..."
                  value={formData.productUrl}
                  onChange={(e) => handleChange("productUrl", e.target.value)}
                  className={cn(
                    fieldClass,
                    errors.productUrl && "border-red-400",
                  )}
                />
                <p className="mt-2 text-[13px] leading-5 text-muted-foreground">
                  Use the direct product page so the community lands on the
                  right listing.
                </p>
                {errors.productUrl ? (
                  <p className="mt-2 text-sm text-red-500">
                    {errors.productUrl}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className={nestedGlassClass}>
                  <Label
                    htmlFor="imageUrl"
                    className="mb-2 flex items-center gap-2 text-[15px] font-semibold"
                  >
                    <Image className="h-4 w-4" />
                    Image URL
                  </Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.imageUrl}
                    onChange={(e) => handleChange("imageUrl", e.target.value)}
                    className={cn(
                      fieldClass,
                      errors.imageUrl && "border-red-400",
                    )}
                  />
                  {errors.imageUrl ? (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.imageUrl}
                    </p>
                  ) : null}
                </div>

                <div className={nestedGlassClass}>
                  <Label
                    htmlFor="store"
                    className="mb-2 flex items-center gap-2 text-[15px] font-semibold"
                  >
                    <Store className="h-4 w-4" />
                    Store
                  </Label>
                  <Input
                    id="store"
                    placeholder="e.g. Amazon, Myntra"
                    value={formData.store}
                    onChange={(e) => handleChange("store", e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <div className={nestedGlassClass}>
                  <Label className="mb-2 flex items-center gap-2 text-[15px] font-semibold">
                    <Tag className="h-4 w-4" />
                    Category *
                  </Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => handleChange("categoryId", value)}
                  >
                    <SelectTrigger
                      className={cn(
                        fieldClass,
                        "w-full",
                        errors.categoryId && "border-red-400",
                      )}
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="surface-liquid-glass rounded-[20px] border-white/60">
                      {categoriesLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading...
                        </SelectItem>
                      ) : (
                        categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.categoryId ? (
                    <p className="mt-2 text-sm text-red-500">
                      {errors.categoryId}
                    </p>
                  ) : null}
                </div>

                <div className="surface-liquid-chip rounded-[24px] px-4 py-4 text-[13px] leading-5 text-muted-foreground">
                  The selected region controls the pricing label and how the
                  deal is categorized in the feed.
                </div>
              </div>
            </div>
          </section>

          <section className={softPanelClass}>
            <div className="mb-4 flex items-center gap-3">
              <div className="surface-liquid-chip flex h-11 w-11 items-center justify-center rounded-[18px]">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em]">
                  Review and submit
                </h2>
                <p className="text-sm text-muted-foreground">
                  Double-check the details, then send it live to the community.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className={nestedGlassClass}>
                <div className="flex items-center gap-3">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user?.name || "User"}
                      className="h-11 w-11 rounded-full ring-4 ring-white/72 shadow-[0_16px_26px_-22px_rgba(15,23,42,0.24)]"
                    />
                  ) : (
                    <div className="surface-liquid-chip flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-foreground">
                      {(user?.name || user?.email || "Y")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold">
                      {user?.name || "You"}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {user?.email || "Submitting as community member"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface-liquid-chip rounded-[24px] px-4 py-4 text-[13px] leading-5 text-muted-foreground">
                Make sure your URL opens cleanly and your pricing is accurate
                before posting.
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium text-muted-foreground transition-[transform,color] duration-200 hover:-translate-y-[1px] hover:text-foreground active:scale-[0.985]"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </button>

              <Button
                type="submit"
                size="lg"
                className="h-11 rounded-full bg-foreground px-5 text-[15px] font-semibold text-background shadow-[0_18px_32px_-24px_rgba(15,23,42,0.42)] transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-[1px] hover:bg-foreground/92 active:scale-[0.985]"
                disabled={createDeal.isPending}
              >
                {createDeal.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Deal
                    <Upload className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}
