import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const drawer = open && typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/35"
            onClick={() => setOpen(false)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t bg-background px-4 pt-4 shadow-2xl"
          >
            <div className="pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Filters</h2>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 ? (
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      Clear all
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setOpen(false)}
                    aria-label="Close filters"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-5 pb-4">
              <div>
                <h4 className="mb-3 text-sm font-medium">Sort By</h4>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((option) => (
                    <Badge
                      key={option.value}
                      variant={sortBy === option.value ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3 text-sm"
                      onClick={() => setSortBy(option.value)}
                    >
                      {sortBy === option.value ? (
                        <Check className="mr-1 h-3 w-3" />
                      ) : null}
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="mb-3 text-sm font-medium">Minimum Discount</h4>
                <div className="flex flex-wrap gap-2">
                  {DISCOUNTS.map((discount) => (
                    <Badge
                      key={discount}
                      variant={minDiscount === discount ? "default" : "outline"}
                      className="cursor-pointer py-2 px-3 text-sm"
                      onClick={() =>
                        setMinDiscount(minDiscount === discount ? null : discount)
                      }
                    >
                      {minDiscount === discount ? (
                        <Check className="mr-1 h-3 w-3" />
                      ) : null}
                      {discount}%+ OFF
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              <Button className="w-full" onClick={() => setOpen(false)}>
                Show Results
              </Button>
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="bg-background px-3 py-1.5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 ? (
            <Badge
              variant="secondary"
              className="flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {activeFiltersCount}
            </Badge>
          ) : null}
        </Button>

        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-2 pb-1">
            {category ? (
              <Badge variant="secondary" className="shrink-0 gap-1 pr-1">
                {category}
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setCategory(null);
                  }}
                  className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
                  aria-label="Remove category filter"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}

            {minDiscount ? (
              <Badge variant="secondary" className="shrink-0 gap-1 pr-1">
                {minDiscount}%+
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMinDiscount(null);
                  }}
                  className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-muted-foreground/20"
                  aria-label="Remove discount filter"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {drawer}
    </div>
  );
}

export default MobileFilters;
