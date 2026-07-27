import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  LogIn,
  Store,
  Bell,
  BadgeInfo,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SaveKaroMark from "@/components/brand/SaveKaroMark";
import DemoVideoDialog from "@/components/demo/DemoVideoDialog";
import { CricketBallIcon, SearchWicketIcon } from "@/components/home/SearchCricketIcons";
import { SearchPromptOverlay } from "@/components/home/SearchPromptOverlay";
import { DiscoveryStrip, type DiscoveryPresetKey } from "@/components/home/DiscoveryStrip";
import { CategoryBar } from "@/components/home/CategoryBar";
import type { Category } from "@/store/filterStore";
import {
  useUiStore,
  type HomeMobileChromeMode,
} from "@/store/uiStore";

const AuthUserMenu = lazy(() => import("@/components/home/AuthUserMenu"));

interface RegionMeta {
  label: string;
  icon: string;
}

interface HomeTopBarProps {
  // Visibility
  mobileChromeMode: HomeMobileChromeMode;
  activeFilterCount: number;

  // Search
  searchValue: string;
  onSearchSubmit: (e: React.FormEvent) => void;
  onSearchInputChange: (value: string) => void;
  onClearSearch: () => void;
  activeSearchPrompt: string;
  searchPromptIndex: number;
  shouldShowSearchCricketPass: boolean;
  shouldShowSearchWicket: boolean;
  desktopSearchBallRef: RefObject<HTMLSpanElement | null>;
  desktopSearchWicketRef: RefObject<HTMLSpanElement | null>;
  mobileSearchBallRef: RefObject<HTMLSpanElement | null>;
  mobileSearchWicketRef: RefObject<HTMLSpanElement | null>;

  // User actions
  isAuthenticated: boolean;
  user: { id: string; name: string | null; avatarUrl: string | null; email: string } | null;
  unreadNotificationCount: number;
  onLogout: () => Promise<void>;
  onGoogleLogin: () => void;
  onFilterOpen: () => void;
  onResetToHomeDefault: () => void;

  // Region
  currentRegionMeta: RegionMeta;
  nextRegionMeta: RegionMeta;
  onToggleRegion: () => void;

  // Discovery
  isTodayPicks: boolean;
  isTrendingStores: boolean;
  isBigDrops: boolean;
  isBecauseYouLikedThis: boolean;
  hasLikedSignals: boolean;
  onDiscoveryPreset: (preset: DiscoveryPresetKey) => void;

  // Categories
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
  shouldLoadCategoryMoreMenu: boolean;
  onTriggerCategoryMoreMenuLoad: () => void;
  isMobileViewport: boolean;
  shouldLoadMobileFilters: boolean;
  onTriggerMobileFiltersLoad: () => void;
}

export function HomeTopBar({
  mobileChromeMode,
  activeFilterCount,
  searchValue,
  onSearchSubmit,
  onSearchInputChange,
  onClearSearch,
  activeSearchPrompt,
  searchPromptIndex,
  shouldShowSearchCricketPass,
  shouldShowSearchWicket,
  desktopSearchBallRef,
  desktopSearchWicketRef,
  mobileSearchBallRef,
  mobileSearchWicketRef,
  isAuthenticated,
  user,
  unreadNotificationCount,
  onLogout,
  onGoogleLogin,
  onFilterOpen,
  onResetToHomeDefault,
  currentRegionMeta,
  nextRegionMeta,
  onToggleRegion,
  isTodayPicks,
  isTrendingStores,
  isBigDrops,
  isBecauseYouLikedThis,
  hasLikedSignals,
  onDiscoveryPreset,
  categories,
  selectedCategory,
  onSelectCategory,
  shouldLoadCategoryMoreMenu,
  onTriggerCategoryMoreMenuLoad,
  isMobileViewport,
  shouldLoadMobileFilters,
  onTriggerMobileFiltersLoad,
}: HomeTopBarProps) {
  const setHomeSearchFocused = useUiStore((s) => s.setHomeSearchFocused);
  const setHomeSearchExpanded = useUiStore(
    (s) => s.setHomeSearchExpanded,
  );
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);
  const isMobileCompact = mobileChromeMode === "compact";
  const isMobileFull = mobileChromeMode === "full";
  const suggestedCategories = categories.slice(0, 4);

  const closeMobileSearch = useCallback(() => {
    setIsMobileSearchExpanded(false);
    setHomeSearchExpanded(false);
    setHomeSearchFocused(false);
    mobileSearchInputRef.current?.blur();
  }, [setHomeSearchExpanded, setHomeSearchFocused]);

  const openMobileSearch = () => {
    if (!isMobileViewport) {
      return;
    }

    setIsMobileSearchExpanded(true);
    setHomeSearchExpanded(true);
    setHomeSearchFocused(true);
  };

  useEffect(() => {
    if (!isMobileSearchExpanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeMobileSearch, isMobileSearchExpanded]);

  useEffect(
    () => () => {
      setHomeSearchExpanded(false);
      setHomeSearchFocused(false);
    },
    [setHomeSearchExpanded, setHomeSearchFocused],
  );

  const handleMobileSearchSubmit = (event: React.FormEvent) => {
    onSearchSubmit(event);
    closeMobileSearch();
  };

  const handleSuggestedSearch = (value: string) => {
    onSearchInputChange(value);
    window.requestAnimationFrame(() => {
      mobileSearchInputRef.current?.focus();
    });
  };

  const handleSearchPreset = (preset: DiscoveryPresetKey) => {
    onDiscoveryPreset(preset);
    closeMobileSearch();
  };

  return (
    <header
      data-mobile-chrome-mode={mobileChromeMode}
      className="pointer-events-none sticky top-0 z-40 md:pointer-events-auto md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/60"
    >
      {isMobileSearchExpanded ? (
        <button
          type="button"
          aria-label="Close expanded search"
          className="motion-mobile-search-backdrop pointer-events-auto fixed inset-0 z-[60] bg-black/28 backdrop-blur-[2px] md:hidden"
          onClick={closeMobileSearch}
        />
      ) : null}

      <div
        aria-hidden={
          (isMobileViewport &&
            (isMobileCompact || isMobileSearchExpanded)) ||
          undefined
        }
        inert={
          (isMobileViewport &&
            (isMobileCompact || isMobileSearchExpanded)) ||
          undefined
        }
        className={cn(
          "motion-home-primary-chrome pointer-events-auto flex h-[3.25rem] items-center justify-between bg-background/95 px-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/82 sm:px-3 md:h-20 md:translate-y-0 md:bg-transparent md:px-8 md:opacity-100 md:backdrop-blur-none",
          isMobileCompact
            ? "pointer-events-none -translate-y-[calc(100%+0.5rem)] opacity-0"
            : "translate-y-0 opacity-100",
        )}
      >
        {/* Mobile Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 md:hidden"
          onClick={onResetToHomeDefault}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center">
            <SaveKaroMark className="h-6 w-6 drop-shadow-sm" />
          </span>
          <span className="text-[14px] font-bold tracking-[-0.02em] max-[350px]:hidden sm:text-[15px]">
            SaveKaro
          </span>
        </Link>

        {/* Desktop Search Bar */}
        <form
          onSubmit={onSearchSubmit}
          className="hidden md:flex flex-1 max-w-3xl mx-auto"
        >
          <div className="relative w-full">
            {shouldShowSearchCricketPass ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-[2] block h-0 overflow-visible [contain:layout_style]"
              >
                <span
                  ref={desktopSearchBallRef}
                  className="absolute left-0 top-0 block opacity-0 will-change-[transform,opacity]"
                >
                  <CricketBallIcon className="h-[0.95rem] w-[0.95rem] drop-shadow-[0_10px_18px_rgba(181,32,29,0.26)]" />
                </span>
              </span>
            ) : null}
            <Input
              type="search"
              placeholder="Search deals..."
              aria-label="Search deals"
              className="peer h-14 rounded-full border-0 bg-secondary pl-14 pr-14 text-lg placeholder:text-transparent focus-visible:ring-2"
              value={searchValue}
              onChange={(e) => onSearchInputChange(e.target.value)}
            />
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            {!searchValue.trim() ? (
              <SearchPromptOverlay
                prompt={activeSearchPrompt}
                promptKey={searchPromptIndex}
                className="left-14 right-14"
                textClassName="text-[1.02rem]"
              />
            ) : null}
            {shouldShowSearchWicket ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-5 top-1/2 z-[1] flex h-9 w-[1.35rem] -translate-y-1/2 items-end justify-center overflow-visible"
              >
                <span
                  ref={desktopSearchWicketRef}
                  className="flex h-full w-full items-center justify-center will-change-transform"
                >
                  <SearchWicketIcon className="h-[1.28rem] w-[1.28rem]" />
                </span>
              </span>
            ) : null}
            {searchValue ? (
              <button
                type="button"
                onClick={onClearSearch}
                title="Clear search"
                aria-label="Clear search"
                className="absolute right-4 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,transform] duration-200 hover:bg-background hover:text-foreground active:scale-95"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            ) : null}
          </div>
        </form>

        {/* User Actions */}
        <div className="flex shrink-0 items-center gap-px sm:gap-1.5">
          <DemoVideoDialog className="h-10 gap-1 px-2 text-xs sm:gap-1.5 sm:px-3 sm:text-sm" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onFilterOpen}
            title="Platform"
            aria-label="Platform"
            className="h-10 w-10 p-0"
          >
            <span className="flex h-full w-full items-center justify-center">
              <Store className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
            </span>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden h-10 w-10 p-0 md:inline-flex"
          >
            <Link
              to="/affiliate-disclosure"
              title="Affiliate Disclosure"
              aria-label="Open affiliate disclosure page"
            >
              <span className="flex h-full w-full items-center justify-center">
                <BadgeInfo className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
              </span>
            </Link>
          </Button>

          {/* Notifications */}
          {isAuthenticated && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="group/bell relative h-10 w-10 p-0"
            >
              <Link
                to="/notifications"
                title="Notifications"
                aria-label={
                  unreadNotificationCount > 0
                    ? `Open notifications page. ${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? "" : "s"}`
                    : "Open notifications page"
                }
              >
                <span className="flex h-full w-full items-center justify-center">
                  <Bell className="motion-bell-jingle h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                </span>
                {unreadNotificationCount > 0 ? (
                  <span className="pointer-events-none absolute -right-1 -top-1 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full border border-white/90 bg-[linear-gradient(180deg,#ff5f6d,#ef4444)] px-1 text-[10px] font-semibold leading-none text-white shadow-[0_14px_24px_-16px_rgba(239,68,68,0.95)] sm:min-h-[1.25rem] sm:min-w-[1.25rem] sm:text-[11px]">
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                ) : null}
              </Link>
            </Button>
          )}

          {/* Region Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleRegion}
            title={`Showing ${currentRegionMeta.label} deals. Click for ${nextRegionMeta.label}`}
            aria-label={`Switch to ${nextRegionMeta.label} deals`}
            className="h-10 w-10 p-0"
          >
            <span className="flex h-full w-full items-center justify-center">
              <span className="flex h-5 w-5 items-center justify-center rounded-full text-[16px] leading-none sm:h-6 sm:w-6 sm:text-[18px]">
                {currentRegionMeta.icon}
              </span>
            </span>
          </Button>
          {isAuthenticated ? (
            <Suspense
              fallback={
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full p-0"
                >
                  <div className="h-10 w-10 rounded-full bg-secondary" />
                </Button>
              }
            >
              <AuthUserMenu user={user} onLogout={onLogout} />
            </Suspense>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={onGoogleLogin}
              title="Sign in with Google"
              aria-label="Sign in with Google"
              className="h-10 w-10 p-0"
            >
              <span className="flex h-full w-full items-center justify-center">
                <LogIn className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile search keeps the same DOM node while moving into compact chrome. */}
      <div
        className={cn(
          "h-12 md:hidden",
          isMobileSearchExpanded && "relative z-[70]",
        )}
      >
        <div
          onFocusCapture={() => setHomeSearchFocused(true)}
          onBlurCapture={(event) => {
            if (
              !event.currentTarget.contains(
                event.relatedTarget as Node | null,
              )
            ) {
              if (isMobileSearchExpanded) {
                closeMobileSearch();
              } else {
                setHomeSearchFocused(false);
              }
            }
          }}
          className={cn(
            "motion-home-search-shell pointer-events-auto",
            isMobileSearchExpanded
              ? "fixed inset-x-0 top-0 z-[70] max-h-[calc(var(--mobile-visual-viewport-height,100dvh)-0.25rem)] overflow-y-auto overscroll-contain rounded-b-[30px] border-b border-white/80 bg-background/94 px-3 pb-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] shadow-[0_28px_60px_-24px_rgba(15,23,42,0.42)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/86"
              : isMobileCompact
              ? "fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.5rem)] z-50"
              : "relative bg-background/95 px-3 pb-1 backdrop-blur supports-[backdrop-filter]:bg-background/82",
            mobileChromeMode === "primary" &&
              !isMobileSearchExpanded &&
              "border-b border-border/45 shadow-[0_18px_32px_-30px_rgba(15,23,42,0.34)]",
          )}
        >
          <form
            onSubmit={handleMobileSearchSubmit}
            className="relative overflow-visible"
          >
            {shouldShowSearchCricketPass &&
            !isMobileCompact &&
            !isMobileSearchExpanded ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-[2] block h-0 overflow-visible [contain:layout_style]"
              >
                <span
                  ref={mobileSearchBallRef}
                  className="absolute left-0 top-0 block opacity-0 will-change-[transform,opacity]"
                >
                  <CricketBallIcon className="h-[1rem] w-[1rem]" />
                </span>
              </span>
            ) : null}
            <Input
              ref={mobileSearchInputRef}
              type="search"
              placeholder="Search deals and stores"
              aria-label="Search deals and stores"
              aria-expanded={isMobileSearchExpanded}
              aria-controls={
                isMobileSearchExpanded
                  ? "mobile-search-suggestions"
                  : undefined
              }
              className={cn(
                "peer h-11 w-full rounded-full border-0 bg-secondary pl-10 pr-10 text-[0.98rem] placeholder:text-transparent",
                (isMobileCompact || isMobileSearchExpanded) &&
                  "h-12 border border-white/85 bg-background/94 pl-11 pr-[6.25rem] shadow-[0_18px_36px_-16px_rgba(15,23,42,0.34),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/88",
              )}
              value={searchValue}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onFocus={openMobileSearch}
            />
            {shouldShowSearchWicket &&
            !isMobileCompact &&
            !isMobileSearchExpanded ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-[0.65rem] top-1/2 z-[1] flex h-8 w-[1.35rem] -translate-y-1/2 items-end justify-center overflow-visible"
              >
                <span
                  ref={mobileSearchWicketRef}
                  className="flex h-full w-full items-center justify-center will-change-transform"
                >
                  <SearchWicketIcon className="h-[1.24rem] w-[1.24rem]" />
                </span>
              </span>
            ) : null}
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted-foreground",
                isMobileCompact || isMobileSearchExpanded
                  ? "left-4 h-4 w-4"
                  : "left-3.5 h-3.5 w-3.5",
              )}
            />
            {!searchValue.trim() ? (
              <SearchPromptOverlay
                prompt={activeSearchPrompt}
                promptKey={searchPromptIndex}
                className={
                  isMobileCompact || isMobileSearchExpanded
                    ? "left-11 right-14"
                    : "left-10 right-10"
                }
                textClassName="text-[0.95rem]"
              />
            ) : null}
            {searchValue ? (
              <button
                type="button"
                onClick={onClearSearch}
                title="Clear search"
                aria-label="Clear search"
                className={cn(
                  "absolute top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,transform] duration-200 hover:bg-background hover:text-foreground active:scale-95",
                  isMobileSearchExpanded
                    ? "right-11 h-9 w-9"
                    : isMobileCompact
                    ? "right-12 h-9 w-9"
                    : "right-1 h-9 w-9",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            {isMobileCompact && !isMobileSearchExpanded ? (
              <button
                type="button"
                onClick={onFilterOpen}
                title="Filter deals"
                aria-label={
                  activeFilterCount > 0
                    ? `Filter deals. ${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}`
                    : "Filter deals"
                }
                className="absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/75 bg-background/90 text-foreground shadow-[0_10px_20px_-18px_rgba(15,23,42,0.45)] transition-[transform,background-color] duration-200 active:scale-95"
              >
                <SlidersHorizontal className="h-[1.05rem] w-[1.05rem]" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-background">
                    {Math.min(activeFilterCount, 9)}
                  </span>
                ) : null}
              </button>
            ) : null}

            {isMobileSearchExpanded ? (
              <button
                type="button"
                onClick={closeMobileSearch}
                title="Close search"
                aria-label="Close search"
                className="motion-touch-target absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-background shadow-[0_12px_22px_-16px_rgba(15,23,42,0.52)]"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </form>

          {isMobileSearchExpanded ? (
            <div
              id="mobile-search-suggestions"
              className="motion-mobile-search-panel pb-[env(safe-area-inset-bottom)] pt-4"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold tracking-[-0.01em]">
                    Search faster
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Start with a category or browse a curated feed.
                  </p>
                </div>
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                    {activeFilterCount} active
                  </span>
                ) : null}
              </div>

              {suggestedCategories.length > 0 ? (
                <div className="mt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Popular categories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedCategories.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion.id}
                        className="motion-touch-target rounded-full border border-border/75 bg-background/84 px-3 py-2 text-xs font-medium shadow-[0_10px_22px_-20px_rgba(15,23,42,0.4)]"
                        onClick={() =>
                          handleSuggestedSearch(suggestion.name)
                        }
                      >
                        {suggestion.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="motion-touch-target rounded-2xl border border-amber-200/70 bg-amber-50/70 px-2.5 py-3 text-left"
                  onClick={() => handleSearchPreset("today")}
                >
                  <span className="block text-xs font-semibold">Today</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    Fresh deals
                  </span>
                </button>
                <button
                  type="button"
                  className="motion-touch-target rounded-2xl border border-sky-200/70 bg-sky-50/70 px-2.5 py-3 text-left"
                  onClick={() => handleSearchPreset("trending")}
                >
                  <span className="block text-xs font-semibold">Trending</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    Most popular
                  </span>
                </button>
                <button
                  type="button"
                  className="motion-touch-target rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-2.5 py-3 text-left"
                  onClick={() => handleSearchPreset("drops")}
                >
                  <span className="block text-xs font-semibold">Big drops</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    50% or more
                  </span>
                </button>
              </div>

              <button
                type="button"
                className="motion-touch-target mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border/75 bg-secondary/55 text-sm font-medium"
                onClick={() => {
                  closeMobileSearch();
                  window.requestAnimationFrame(onFilterOpen);
                }}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Refine stores and filters
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        aria-hidden={
          (isMobileViewport &&
            (!isMobileFull || isMobileSearchExpanded)) ||
          undefined
        }
        inert={
          (isMobileViewport &&
            (!isMobileFull || isMobileSearchExpanded)) ||
          undefined
        }
        className={cn(
          "motion-home-secondary-chrome md:pointer-events-auto md:translate-y-0 md:opacity-100",
          isMobileFull
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-4 opacity-0",
        )}
      >
        {/* Discovery Strip */}
        <DiscoveryStrip
          isTodayPicks={isTodayPicks}
          isTrendingStores={isTrendingStores}
          isBigDrops={isBigDrops}
          isBecauseYouLikedThis={isBecauseYouLikedThis}
          hasLikedSignals={hasLikedSignals}
          onPreset={onDiscoveryPreset}
        />

        {/* Category Navigation Bar */}
        <CategoryBar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={onSelectCategory}
          shouldLoadCategoryMoreMenu={shouldLoadCategoryMoreMenu}
          onTriggerCategoryMoreMenuLoad={onTriggerCategoryMoreMenuLoad}
          isMobileViewport={isMobileViewport}
          shouldLoadMobileFilters={shouldLoadMobileFilters}
          onTriggerMobileFiltersLoad={onTriggerMobileFiltersLoad}
        />
      </div>
    </header>
  );
}
