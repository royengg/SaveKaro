import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCategories } from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "discount", label: "Best Discount" },
] as const;

const STORES = ["Amazon", "Flipkart", "Myntra", "Ajio", "Nykaa", "Croma", "Tata"];
const DISCOUNTS = [30, 50, 70];

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilterDialog({ open, onOpenChange }: FilterDialogProps) {
  const { data: categories, isLoading } = useCategories();
  const {
    category,
    store,
    sortBy,
    minDiscount,
    setCategory,
    setStore,
    setSortBy,
    setMinDiscount,
    resetFilters,
  } = useFilterStore();

  const activeFiltersCount = [category, store, minDiscount, sortBy !== "newest" ? sortBy : null].filter(Boolean).length;

  const handleApply = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Filters</DialogTitle>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear all
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] p-4">
          <div className="space-y-6">
            {/* Sort By */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Sort By</h4>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((option) => (
                  <Badge
                    key={option.value}
                    variant={sortBy === option.value ? "default" : "outline"}
                    className="cursor-pointer py-2 px-4 text-sm rounded-full"
                    onClick={() => setSortBy(option.value)}
                  >
                    {sortBy === option.value && <Check className="h-3 w-3 mr-1.5" />}
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Categories */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Category</h4>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={category === null ? "default" : "outline"}
                  className="cursor-pointer py-2 px-4 text-sm rounded-full"
                  onClick={() => setCategory(null)}
                >
                  {category === null && <Check className="h-3 w-3 mr-1.5" />}
                  All
                </Badge>
                {!isLoading &&
                  categories?.map((cat) => (
                    <Badge
                      key={cat.id}
                      variant={category === cat.slug ? "default" : "outline"}
                      className="cursor-pointer py-2 px-4 text-sm rounded-full"
                      onClick={() => setCategory(cat.slug)}
                    >
                      {category === cat.slug && <Check className="h-3 w-3 mr-1.5" />}
                      {cat.icon} {cat.name}
                    </Badge>
                  ))}
              </div>
            </div>

            <Separator />

            {/* Stores */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Store</h4>
              <div className="flex flex-wrap gap-2">
                {STORES.map((s) => (
                  <Badge
                    key={s}
                    variant={store === s ? "default" : "outline"}
                    className="cursor-pointer py-2 px-4 text-sm rounded-full"
                    onClick={() => setStore(store === s ? null : s)}
                  >
                    {store === s && <Check className="h-3 w-3 mr-1.5" />}
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* Min Discount */}
            <div>
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">Minimum Discount</h4>
              <div className="flex flex-wrap gap-2">
                {DISCOUNTS.map((d) => (
                  <Badge
                    key={d}
                    variant={minDiscount === d ? "default" : "outline"}
                    className="cursor-pointer py-2 px-4 text-sm rounded-full"
                    onClick={() => setMinDiscount(minDiscount === d ? null : d)}
                  >
                    {minDiscount === d && <Check className="h-3 w-3 mr-1.5" />}
                    {d}%+ OFF
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button className="w-full rounded-full" onClick={handleApply}>
            Show Results
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FilterDialog;
