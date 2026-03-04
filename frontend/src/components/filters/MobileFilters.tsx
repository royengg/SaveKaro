import { useState } from "react";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useFilterStore } from "@/store/filterStore";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "discount", label: "Highest Discount" },
] as const;

const DISCOUNTS = [30, 50, 70];

export function MobileFilters() {
  const [open, setOpen] = useState(false);
  const {
    category,
    sortBy,
    minDiscount,
    setCategory,
    setSortBy,
    setMinDiscount,
    resetFilters,
  } = useFilterStore();

  const activeFiltersCount = [
    category,
    minDiscount,
    sortBy !== "newest" ? sortBy : null,
  ].filter(Boolean).length;

  return (
    <div className="bg-background border-b px-3 py-1.5">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-xl px-4">
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

            <ScrollArea className="pb-2">
              <div className="space-y-6 pb-4">
                {/* Sort By */}
                <div>
                  <h4 className="font-medium mb-3">Sort By</h4>
                  <div className="flex flex-wrap gap-2">
                    {SORT_OPTIONS.map((option) => (
                      <Badge
                        key={option.value}
                        variant={
                          sortBy === option.value ? "default" : "outline"
                        }
                        className="cursor-pointer py-2 px-3 text-sm"
                        onClick={() => setSortBy(option.value)}
                      >
                        {sortBy === option.value && (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        {option.label}
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
                        onClick={() =>
                          setMinDiscount(minDiscount === d ? null : d)
                        }
                      >
                        {minDiscount === d && (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        {d}%+ OFF
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t mt-2">
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
              <Badge variant="secondary" className="shrink-0 gap-1 pr-1">
                {category}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCategory(null);
                  }}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
                  aria-label="Remove category filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {minDiscount && (
              <Badge variant="secondary" className="shrink-0 gap-1 pr-1">
                {minDiscount}%+
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMinDiscount(null);
                  }}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
                  aria-label="Remove discount filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileFilters;
