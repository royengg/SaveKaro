import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { BookOpen, SlidersHorizontal } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Button } from "@/components/ui/button";
import type { Category } from "@/store/filterStore";
import { getCategoryPillStyle, getCategoryIconStyle } from "@/lib/homeUtils";

const CategoryMoreMenu = lazy(
  () => import("@/components/home/CategoryMoreMenu"),
);
const MobileFilters = lazy(() => import("@/components/filters/MobileFilters"));

interface CategoryBarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
  shouldLoadCategoryMoreMenu: boolean;
  onTriggerCategoryMoreMenuLoad: () => void;
  isMobileViewport: boolean;
  shouldLoadMobileFilters: boolean;
  onTriggerMobileFiltersLoad: () => void;
}

export function CategoryBar({
  categories,
  selectedCategory,
  onSelectCategory,
  shouldLoadCategoryMoreMenu,
  onTriggerCategoryMoreMenuLoad,
  isMobileViewport,
  shouldLoadMobileFilters,
  onTriggerMobileFiltersLoad,
}: CategoryBarProps) {
  return (
    <div className="border-b border-border/60 bg-gradient-to-r from-background via-secondary/35 to-background px-3 py-1 md:px-8 md:py-3">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onSelectCategory(null)}
          className={`shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ease-out md:min-h-9 md:px-3.5 md:py-1.5 md:text-sm ${
            selectedCategory === null
              ? "text-foreground border-slate-400/40 bg-slate-400/15"
              : "text-muted-foreground border-slate-300/40 bg-slate-300/10 hover:text-foreground"
          }`}
        >
          All
        </button>
        {categories?.slice(0, 6).map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.slug)}
            className={`hidden md:inline-flex shrink-0 min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors duration-200 ease-out ${
              selectedCategory === cat.slug
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={getCategoryPillStyle(cat.color, selectedCategory === cat.slug)}
          >
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] leading-none"
              style={getCategoryIconStyle(
                cat.color,
                selectedCategory === cat.slug,
              )}
            >
              {getCategoryIcon(cat)}
            </span>
            {cat.name}
          </button>
        ))}

        {/* More Categories Menu */}
        {shouldLoadCategoryMoreMenu ? (
          <Suspense
            fallback={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-full px-3 text-[13px] md:h-9 md:text-sm"
              >
                <span className="hidden sm:inline">More</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </Button>
            }
          >
            <CategoryMoreMenu
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={onSelectCategory}
            />
          </Suspense>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-3 text-[13px] md:h-9 md:text-sm"
            onClick={onTriggerCategoryMoreMenuLoad}
            onMouseEnter={onTriggerCategoryMoreMenuLoad}
            onFocus={onTriggerCategoryMoreMenuLoad}
            onTouchStart={onTriggerCategoryMoreMenuLoad}
            aria-label="Load more categories"
            title="More categories"
          >
            <span className="hidden sm:inline">More</span>
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </Button>
        )}

        {isMobileViewport ? (
          <>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground"
            >
              <Link to="/guides" aria-label="Open guides" title="Guides">
                <BookOpen className="h-4 w-4" />
                <span className="sr-only">Guides</span>
              </Link>
            </Button>

            {shouldLoadMobileFilters ? (
              <Suspense
                fallback={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground"
                    aria-label="Load filters"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="sr-only">Filters</span>
                  </Button>
                }
              >
                <MobileFilters compact />
              </Suspense>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground"
                onClick={onTriggerMobileFiltersLoad}
                onMouseEnter={onTriggerMobileFiltersLoad}
                onFocus={onTriggerMobileFiltersLoad}
                onTouchStart={onTriggerMobileFiltersLoad}
                aria-label="Load filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="sr-only">Filters</span>
              </Button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
