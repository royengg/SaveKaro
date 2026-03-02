import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Link as LinkIcon,
  DollarSign,
  Tag,
  Store,
  Image,
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
import { toast } from "sonner";
import Header from "@/components/layout/Header";

export default function SubmitDeal() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Deals
        </Link>

        <div className="bg-card rounded-2xl border p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Submit a Deal</h1>
              <p className="text-muted-foreground">
                Share great deals with the community
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Deal Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Sony WH-1000XM5 Headphones - 40% Off"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add any extra details about the deal..."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
              />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="originalPrice"
                  className="flex items-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Original Price
                </Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="999"
                  value={formData.originalPrice}
                  onChange={(e) =>
                    handleChange("originalPrice", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dealPrice" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Deal Price
                </Label>
                <Input
                  id="dealPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="599"
                  value={formData.dealPrice}
                  onChange={(e) => handleChange("dealPrice", e.target.value)}
                />
              </div>
            </div>

            {/* Discount Preview */}
            {discount && (
              <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 text-center">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  🎉 {discount}% discount!
                </span>
              </div>
            )}

            {/* Product URL */}
            <div className="space-y-2">
              <Label htmlFor="productUrl" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Product URL *
              </Label>
              <Input
                id="productUrl"
                type="url"
                placeholder="https://amazon.in/dp/..."
                value={formData.productUrl}
                onChange={(e) => handleChange("productUrl", e.target.value)}
                className={errors.productUrl ? "border-red-500" : ""}
              />
              {errors.productUrl && (
                <p className="text-sm text-red-500">{errors.productUrl}</p>
              )}
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Image URL
              </Label>
              <Input
                id="imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={formData.imageUrl}
                onChange={(e) => handleChange("imageUrl", e.target.value)}
                className={errors.imageUrl ? "border-red-500" : ""}
              />
              {errors.imageUrl && (
                <p className="text-sm text-red-500">{errors.imageUrl}</p>
              )}
            </div>

            {/* Category & Store */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Category *
                </Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => handleChange("categoryId", value)}
                >
                  <SelectTrigger
                    className={errors.categoryId ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
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
                {errors.categoryId && (
                  <p className="text-sm text-red-500">{errors.categoryId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="store" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Store
                </Label>
                <Input
                  id="store"
                  placeholder="e.g. Amazon, Flipkart"
                  value={formData.store}
                  onChange={(e) => handleChange("store", e.target.value)}
                />
              </div>
            </div>

            {/* Submitter info */}
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
              {user?.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-8 w-8 rounded-full"
                />
              )}
              <div className="text-sm">
                <p className="font-medium">{user?.name || "You"}</p>
                <p className="text-muted-foreground">Submitting as</p>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={createDeal.isPending}
            >
              {createDeal.isPending ? "Submitting..." : "Submit Deal"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
