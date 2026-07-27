import { useState } from "react";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useFilterStore, type DiscoveryPreset } from "@/store/filterStore";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "discount", label: "Highest Discount" },
] as const;

const DISCOUNTS = [30, 50, 70];

interface MobileFiltersProps {
  compact?: boolean;
}

export function MobileFilters({ compact = false }: MobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const {
    category,
    sortBy,
    minDiscount,
    setCategory,
    setSortBy,
    setMinDiscount,
    setDiscoveryPreset,
    resetFilters,
    discoveryPreset,
  } = useFilterStore();

  // Filters that each discovery preset "owns" — these shouldn't inflate the
  // badge count when set via the preset strip rather than manually.
  const PRESET_OWNED_KEYS: Record<
    NonNullable<DiscoveryPreset>,
    Set<"sortBy" | "minDiscount" | "category">
  > = {
    today: new Set(),                            // defaults → nothing extra
    trending: new Set(["sortBy"]),                // sets sortBy="popular"
    drops: new Set(["sortBy", "minDiscount"]),    // sets sortBy="discount", minDiscount=50
    liked: new Set(),                            // defaults → nothing extra
  };

  const presetOwned = discoveryPreset
    ? PRESET_OWNED_KEYS[discoveryPreset]
    : new Set<string>();

  const activeFiltersCount = [
    category,
    !presetOwned.has("minDiscount") ? minDiscount : null,
    !presetOwned.has("sortBy") && sortBy !== "newest" ? sortBy : null,
  ].filter(Boolean).length;
  const activeSortLabel =
    sortBy === "newest"
      ? null
      : (SORT_OPTIONS.find((option) => option.value === sortBy)?.label ??
        sortBy);

  const drawerChipClass = (active: boolean) =>
    cn(
      "motion-filter-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:scale-[0.97]",
      active
        ? "motion-filter-chip-active border-primary/30 bg-primary text-primary-foreground shadow-[0_14px_24px_-18px_rgba(124,58,237,0.65)]"
        : "border-border bg-background text-foreground hover:-translate-y-[1px] hover:border-border/80 hover:bg-secondary/70",
    );

  const drawer = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="motion-mobile-sheet fixed inset-x-0 bottom-0 left-0 top-auto z-[80] grid max-h-[min(82dvh,var(--mobile-visual-viewport-height,82dvh))] w-full max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto overscroll-contain rounded-b-none rounded-t-[28px] border-x-0 border-b-0 bg-background/98 p-0 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/92 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border"
      >
        <DialogHeader className="sticky top-0 z-10 gap-0 border-b bg-background/92 px-4 pb-2 pt-3 text-left backdrop-blur">
          <div className="mb-3 flex justify-center sm:hidden">
            <span className="h-1.5 w-12 rounded-full bg-muted" />
          </div>
          <DialogDescription className="sr-only">
            Sort deals and choose a minimum discount.
          </DialogDescription>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">Filters</DialogTitle>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="motion-touch-target transition-[transform,background-color] duration-200 hover:-translate-y-[1px] active:scale-[0.97]"
                  onClick={resetFilters}
                >
                  Clear all
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                className="motion-touch-target transition-[transform,background-color] duration-200 hover:-translate-y-[1px] active:scale-[0.97]"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-4 pb-4 pt-5">
          <div>
            <h4 className="mb-3 text-sm font-medium">Sort By</h4>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={drawerChipClass(sortBy === option.value)}
                  onClick={() => {
                    setSortBy(option.value);
                    setDiscoveryPreset(null);
                  }}
                >
                  {sortBy === option.value ? (
                    <Check className="mr-1 h-3 w-3" />
                  ) : null}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-medium">Minimum Discount</h4>
            <div className="flex flex-wrap gap-2">
              {DISCOUNTS.map((discount) => (
                <button
                  type="button"
                  key={discount}
                  className={drawerChipClass(minDiscount === discount)}
                  onClick={() => {
                    setMinDiscount(minDiscount === discount ? null : discount);
                    setDiscoveryPreset(null);
                  }}
                >
                  {minDiscount === discount ? (
                    <Check className="mr-1 h-3 w-3" />
                  ) : null}
                  {discount}% OFF
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t bg-background/94 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          <Button
            className="motion-touch-target w-full transition-[transform,box-shadow] duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
            onClick={() => setOpen(false)}
          >
            Show Results
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const compactTrigger = (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "relative h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out hover:-translate-y-[1px] hover:text-foreground active:translate-y-0 active:scale-[0.98]",
          open &&
            "border-border/70 bg-secondary/60 text-foreground shadow-[0_10px_18px_-16px_rgba(15,23,42,0.4)]",
        )}
        onClick={() => setOpen(true)}
        aria-label="Open filters"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {activeFiltersCount > 0 ? (
          <span className="pointer-events-none absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold leading-none text-background">
            {activeFiltersCount}
          </span>
        ) : null}
      </Button>
      {drawer}
    </>
  );

  if (compact) {
    return compactTrigger;
  }

  return (
    <div className="border-b border-border/60 bg-background px-3 py-1.5">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 transition-[transform,box-shadow,background-color,border-color] duration-200 active:scale-[0.97]",
            open
              ? "border-border/80 bg-secondary/70 shadow-[0_14px_24px_-22px_rgba(15,23,42,0.35)]"
              : "hover:-translate-y-[1px]",
          )}
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 ? (
            <Badge
              key={`filters-count-${activeFiltersCount}`}
              variant="secondary"
              className={cn(
                "flex h-5 w-5 items-center justify-center p-0 text-xs",
                activeFiltersCount > 0 && "motion-count-bump",
              )}
            >
              {activeFiltersCount}
            </Badge>
          ) : null}
        </Button>

        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-2 pb-1">
            {category ? (
              <Badge
                variant="secondary"
                className="motion-filter-chip motion-filter-chip-active shrink-0 gap-1 pr-1"
              >
                {category}
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setCategory(null);
                  }}
                  className="ml-0.5 rounded-full p-0.5 transition-[transform,background-color] duration-200 hover:rotate-90 hover:bg-muted-foreground/20"
                  aria-label="Remove category filter"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}

            {activeSortLabel ? (
              <Badge
                variant="secondary"
                className="motion-filter-chip motion-filter-chip-active shrink-0 gap-1 pr-1"
              >
                {activeSortLabel}
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSortBy("newest");
                  }}
                  className="ml-0.5 rounded-full p-0.5 transition-[transform,background-color] duration-200 hover:rotate-90 hover:bg-muted-foreground/20"
                  aria-label="Remove sort filter"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ) : null}

            {minDiscount ? (
              <Badge
                variant="secondary"
                className="motion-filter-chip motion-filter-chip-active shrink-0 gap-1 pr-1"
              >
                {minDiscount}%+
                <button
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setMinDiscount(null);
                  }}
                  className="ml-0.5 rounded-full p-0.5 transition-[transform,background-color] duration-200 hover:rotate-90 hover:bg-muted-foreground/20"
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
