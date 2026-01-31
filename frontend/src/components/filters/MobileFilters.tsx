import { useState } from "react";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useCategories } from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "discount", label: "Highest Discount" },
] as const;

const STORES = ["Amazon", "Flipkart", "Myntra", "Ajio", "Nykaa", "Croma", "Tata"];
const DISCOUNTS = [30, 50, 70];

export function MobileFilters() {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="lg:hidden sticky top-16 z-40 bg-background border-b px-4 py-2">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
            <SheetHeader className="text-left pb-4">
              <div className="flex items-center justify-between">
                <SheetTitle>Filters</SheetTitle>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Clear all
                  </Button>
                )}
              </div>
            </SheetHeader>
            
            <ScrollArea className="h-[calc(85vh-120px)]">
              <div className="space-y-6 pr-4">
                {/* Sort By */}
                <div>
                  <h4 className="font-medium mb-3">Sort By</h4>
                  <div className="flex flex-wrap gap-2">
                    {SORT_OPTIONS.map((option) => (
                      <Badge
                        key={option.value}
                        variant={sortBy === option.value ? "default" : "outline"}
                        className="cursor-pointer py-2 px-3 text-sm"
                        onClick={() => setSortBy(option.value)}
                      >
                        {sortBy === option.value && <Check className="h-3 w-3 mr-1" />}
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Categories */}
                <div>
                  <h4 className="font-medium mb-3">Category</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={category === null ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3 text-sm"
                      onClick={() => setCategory(null)}
                    >
                      {category === null && <Check className="h-3 w-3 mr-1" />}
                      All
                    </Badge>
                    {!isLoading &&
                      categories?.map((cat) => (
                        <Badge
                          key={cat.id}
                          variant={category === cat.slug ? "default" : "outline"}
                          className="cursor-pointer py-2 px-3 text-sm"
                          onClick={() => setCategory(cat.slug)}
                        >
                          {category === cat.slug && <Check className="h-3 w-3 mr-1" />}
                          {cat.icon} {cat.name}
                        </Badge>
                      ))}
                  </div>
                </div>

                <Separator />

                {/* Stores */}
                <div>
                  <h4 className="font-medium mb-3">Store</h4>
                  <div className="flex flex-wrap gap-2">
                    {STORES.map((s) => (
                      <Badge
                        key={s}
                        variant={store === s ? "default" : "outline"}
                        className="cursor-pointer py-2 px-3 text-sm"
                        onClick={() => setStore(store === s ? null : s)}
                      >
                        {store === s && <Check className="h-3 w-3 mr-1" />}
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Min Discount */}
                <div>
                  <h4 className="font-medium mb-3">Minimum Discount</h4>
                  <div className="flex flex-wrap gap-2">
                    {DISCOUNTS.map((d) => (
                      <Badge
                        key={d}
                        variant={minDiscount === d ? "default" : "outline"}
                        className="cursor-pointer py-2 px-3 text-sm"
                        onClick={() => setMinDiscount(minDiscount === d ? null : d)}
                      >
                        {minDiscount === d && <Check className="h-3 w-3 mr-1" />}
                        {d}%+ OFF
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t">
              <Button className="w-full" onClick={() => setOpen(false)}>
                Show Results
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Quick filter chips */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-2 pb-1">
            {category && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                {category}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setCategory(null)} />
              </Badge>
            )}
            {store && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                {store}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setStore(null)} />
              </Badge>
            )}
            {minDiscount && (
              <Badge variant="secondary" className="shrink-0 gap-1">
                {minDiscount}%+
                <X className="h-3 w-3 cursor-pointer" onClick={() => setMinDiscount(null)} />
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileFilters;
