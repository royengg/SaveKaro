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
  Loader2,
} from "lucide-react";
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
import { getRegionMeta } from "@/lib/regions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import { PageBackButton } from "@/components/navigation/PageBackButton";

export default function SubmitDeal() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
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
        if (!["http:", "https:"].includes(new URL(formData.productUrl).protocol)) throw new Error("Unsupported URL");
      } catch {
        newErrors.productUrl = "Please enter a valid URL";
      }
    }
    if (formData.imageUrl) {
      try {
        if (!["http:", "https:"].includes(new URL(formData.imageUrl).protocol)) throw new Error("Unsupported URL");
      } catch {
        newErrors.imageUrl = "Please enter a valid image URL";
      }
    }
    for (const field of ["originalPrice", "dealPrice"] as const) {
      if (formData[field] && (!Number.isFinite(Number(formData[field])) || Number(formData[field]) < 0)) {
        newErrors[field] = "Enter a price of zero or more";
      }
    }
    if (!formData.categoryId) {
      newErrors.categoryId = "Please select a category";
    }

    setErrors(newErrors);
    const firstInvalid = ["title", "originalPrice", "dealPrice", "productUrl", "imageUrl", "categoryId"].find((field) => newErrors[field]);
    if (firstInvalid) requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
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

  const regionMeta = getRegionMeta(region);
  const priceCurrencyCode = regionMeta.currencyCode;
  const priceCurrencySymbol = regionMeta.currencySymbol;
  const regionLabel = regionMeta.label;
  const softPanelClass = "border-b pb-4";
  const nestedGlassClass = "min-w-0";
  const fieldClass =
    "h-11 rounded-2xl border-slate-300/80 bg-slate-100/92 px-3.5 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_22px_-24px_rgba(15,23,42,0.14)] placeholder:text-slate-500/90 data-[placeholder]:text-slate-500/90 transition-[border-color,box-shadow,background-color,color] duration-200 focus-visible:border-slate-400/90 focus-visible:bg-white focus-visible:ring-slate-200";
  const textAreaClass =
    "min-h-[112px] rounded-[22px] border-slate-300/80 bg-slate-100/92 px-3.5 py-3 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_22px_-24px_rgba(15,23,42,0.14)] placeholder:text-slate-500/90 transition-[border-color,box-shadow,background-color,color] duration-200 focus-visible:border-slate-400/90 focus-visible:bg-white focus-visible:ring-slate-200";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.1),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(244,114,182,0.1),transparent_30%),linear-gradient(180deg,#fff_0%,#fcfcfd_38%,#f8fafc_100%)]">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-5 pb-24 md:pb-10">
        <PageBackButton to="/" onClick={resetFilters} />

        <header className="my-4">
          <h1 className="text-2xl font-bold">Submit a Deal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Posting to {regionLabel} · Prices in {priceCurrencyCode}</p>
        </header>

        <form noValidate onSubmit={handleSubmit} className="mt-5 space-y-4">
          <section className={softPanelClass}>
            <h2 className="mb-3 text-lg font-semibold">About the deal</h2>

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
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? "title-error" : undefined}
                  placeholder="e.g. Sony Headphones - 40% Off"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className={cn(fieldClass, errors.title && "border-red-400")}
                />
                {errors.title ? (
                  <p id="title-error" className="mt-2 text-sm text-destructive">{errors.title}</p>
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
            <h2 className="mb-3 text-lg font-semibold">Pricing</h2>

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
                    aria-invalid={Boolean(errors.originalPrice)}
                    aria-describedby={errors.originalPrice ? "originalPrice-error" : undefined}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={regionMeta.originalPricePlaceholder}
                    value={formData.originalPrice}
                    onChange={(e) =>
                      handleChange("originalPrice", e.target.value)
                    }
                    className={cn(fieldClass, "pl-9")}
                  />
                </div>
                {errors.originalPrice && <p id="originalPrice-error" className="mt-2 text-sm text-destructive">{errors.originalPrice}</p>}
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
                    aria-invalid={Boolean(errors.dealPrice)}
                    aria-describedby={errors.dealPrice ? "dealPrice-error" : undefined}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={regionMeta.dealPricePlaceholder}
                    value={formData.dealPrice}
                    onChange={(e) => handleChange("dealPrice", e.target.value)}
                    className={cn(fieldClass, "pl-9")}
                  />
                </div>
                {errors.dealPrice && <p id="dealPrice-error" className="mt-2 text-sm text-destructive">{errors.dealPrice}</p>}
              </div>
            </div>

            {/* {discount ? (
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
            )} */}
          </section>

          <section className={softPanelClass}>
            <h2 className="mb-3 text-lg font-semibold">Store and sources</h2>

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
                  aria-invalid={Boolean(errors.productUrl)}
                  aria-describedby={errors.productUrl ? "productUrl-error" : undefined}
                  type="url"
                  placeholder="https://amazon.in/dp/..."
                  value={formData.productUrl}
                  onChange={(e) => handleChange("productUrl", e.target.value)}
                  className={cn(
                    fieldClass,
                    errors.productUrl && "border-red-400",
                  )}
                />
                {errors.productUrl ? (
                  <p id="productUrl-error" className="mt-2 text-sm text-destructive">
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
                    aria-invalid={Boolean(errors.imageUrl)}
                    aria-describedby={errors.imageUrl ? "imageUrl-error" : undefined}
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
                    <p id="imageUrl-error" className="mt-2 text-sm text-destructive">
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
                  <Label htmlFor="categoryId" className="mb-2 flex items-center gap-2 text-[15px] font-semibold">
                    <Tag className="h-4 w-4" />
                    Category *
                  </Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) => handleChange("categoryId", value)}
                  >
                    <SelectTrigger
                      id="categoryId"
                      aria-invalid={Boolean(errors.categoryId)}
                      aria-describedby={errors.categoryId ? "categoryId-error" : undefined}
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
                    <p id="categoryId-error" className="mt-2 text-sm text-destructive">
                      {errors.categoryId}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="sticky bottom-0 z-10 border-t bg-background py-3">
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
                className="cta-dark-pill h-11 px-5 text-[15px] font-semibold"
                disabled={createDeal.isPending}
              >
                {createDeal.isPending ? (
                  <>
                    <span className="cta-dark-pill-icon">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span className="cta-dark-pill-icon">
                      <Upload className="h-3.5 w-3.5" />
                    </span>
                    Submit Deal
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
