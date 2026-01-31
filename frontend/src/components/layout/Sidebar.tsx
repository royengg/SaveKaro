import { useCategories } from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "discount", label: "Best Discount" },
] as const;

const STORES = [
  "Amazon",
  "Flipkart",
  "Myntra",
  "Ajio",
  "Nykaa",
  "Croma",
  "Tata",
];

export function Sidebar() {
  const { data: categories, isLoading } = useCategories();
  const { category, store, sortBy, minDiscount, setCategory, setStore, setSortBy, setMinDiscount, resetFilters } =
    useFilterStore();

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 space-y-6">
        {/* Sort By */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Sort By
          </h3>
          <div className="flex flex-col gap-1">
            {SORT_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={sortBy === option.value ? "secondary" : "ghost"}
                className="justify-start"
                onClick={() => setSortBy(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Categories
          </h3>
          <ScrollArea className="h-[280px]">
            <div className="flex flex-col gap-1 pr-4">
              <Button
                variant={category === null ? "secondary" : "ghost"}
                className="justify-start"
                onClick={() => setCategory(null)}
              >
                All Categories
              </Button>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))
                : categories?.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={category === cat.slug ? "secondary" : "ghost"}
                      className="justify-between"
                      onClick={() => setCategory(cat.slug)}
                    >
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </span>
                      <Badge variant="outline" className="ml-2">
                        {cat.dealCount}
                      </Badge>
                    </Button>
                  ))}
            </div>
          </ScrollArea>
        </div>

        {/* Stores */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Stores
          </h3>
          <div className="flex flex-wrap gap-2">
            {STORES.map((s) => (
              <Badge
                key={s}
                variant={store === s ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  store === s ? "" : "hover:bg-secondary"
                )}
                onClick={() => setStore(store === s ? null : s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>

        {/* Minimum Discount */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Min. Discount
          </h3>
          <div className="flex flex-wrap gap-2">
            {[30, 50, 70].map((discount) => (
              <Badge
                key={discount}
                variant={minDiscount === discount ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors",
                  minDiscount === discount ? "" : "hover:bg-secondary"
                )}
                onClick={() => setMinDiscount(minDiscount === discount ? null : discount)}
              >
                {discount}%+ off
              </Badge>
            ))}
          </div>
        </div>

        {/* Reset Filters */}
        {(category || store || minDiscount || sortBy !== "newest") && (
          <Button variant="outline" className="w-full" onClick={resetFilters}>
            Reset Filters
          </Button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
