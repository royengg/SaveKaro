import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useFilterStore } from "@/store/filterStore";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "popular", label: "Most Popular" },
  { value: "discount", label: "Highest Discount" },
] as const;

const DISCOUNTS = [30, 50, 70];
const DRAWER_CLOSE_DURATION_MS = 170;

interface MobileFiltersProps {
  compact?: boolean;
}

export function MobileFilters({ compact = false }: MobileFiltersProps) {
  const [open, setOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
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
  const activeSortLabel =
    sortBy === "newest"
      ? null
      : SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? sortBy;

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }

    if (!isRendered) {
      return;
    }

    setIsClosing(true);
    const timeoutId = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, DRAWER_CLOSE_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isRendered, open]);

  useEffect(() => {
    if (!isRendered) return;

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
  }, [isRendered]);

  const drawerChipClass = (active: boolean) =>
    cn(
      "motion-filter-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:scale-[0.97]",
      active
        ? "motion-filter-chip-active border-primary/30 bg-primary text-primary-foreground shadow-[0_14px_24px_-18px_rgba(124,58,237,0.65)]"
        : "border-border bg-background text-foreground hover:-translate-y-[1px] hover:border-border/80 hover:bg-secondary/70",
    );

  const drawer = isRendered && typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close filters"
            className={cn(
              "absolute inset-0 bg-black/35 backdrop-blur-[1.5px]",
              isClosing
                ? "motion-filter-drawer-overlay-exit"
                : "motion-filter-drawer-overlay-enter",
            )}
            onClick={() => setOpen(false)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className={cn(
              "absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto overscroll-contain rounded-t-[28px] border-t bg-background/98 px-4 pt-3 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/92",
              isClosing
                ? "motion-filter-drawer-exit"
                : "motion-filter-drawer-enter",
            )}
          >
            <div className="mb-3 flex justify-center">
              <span className="h-1.5 w-12 rounded-full bg-muted" />
            </div>

            <div className="pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Filters</h2>
                <div className="flex items-center gap-2">
                  {activeFiltersCount > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="transition-[transform,background-color] duration-200 hover:-translate-y-[1px] active:scale-[0.97]"
                      onClick={resetFilters}
                    >
                      Clear all
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="transition-[transform,background-color] duration-200 hover:-translate-y-[1px] active:scale-[0.97]"
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
                    <button
                      type="button"
                      key={option.value}
                      className={drawerChipClass(sortBy === option.value)}
                      onClick={() => setSortBy(option.value)}
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
                      onClick={() =>
                        setMinDiscount(minDiscount === discount ? null : discount)
                      }
                    >
                      {minDiscount === discount ? (
                        <Check className="mr-1 h-3 w-3" />
                      ) : null}
                      {discount}%+ OFF
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
              <Button
                className="w-full transition-[transform,box-shadow] duration-200 hover:-translate-y-[1px] active:scale-[0.98]"
                onClick={() => setOpen(false)}
              >
                Show Results
              </Button>
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  const compactTrigger = (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "relative h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out hover:-translate-y-[1px] hover:text-foreground active:translate-y-0 active:scale-[0.98]",
          open && "border-border/70 bg-secondary/60 text-foreground shadow-[0_10px_18px_-16px_rgba(15,23,42,0.4)]",
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
