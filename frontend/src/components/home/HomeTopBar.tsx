import { lazy, Suspense, type RefObject } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  X,
  LogIn,
  Store,
  Bell,
  BadgeInfo,
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

const AuthUserMenu = lazy(() => import("@/components/home/AuthUserMenu"));

interface RegionMeta {
  label: string;
  icon: string;
}

interface HomeTopBarProps {
  // Visibility
  isHomeTopBarHidden: boolean;

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
  isHomeTopBarHidden,
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
  return (
    <header
      className={cn(
        "motion-home-topbar sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:translate-y-0 md:opacity-100 md:pointer-events-auto md:transition-none",
        isHomeTopBarHidden
          ? "pointer-events-none -translate-y-[calc(100%+0.5rem)] opacity-0 shadow-none"
          : "translate-y-0 opacity-100 shadow-none",
      )}
    >
      <div className="flex h-[3.2rem] items-center justify-between px-2.5 sm:px-3 md:h-20 md:px-8">
        {/* Mobile Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 md:hidden"
          onClick={onResetToHomeDefault}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center">
            <SaveKaroMark className="h-[1.375rem] w-[1.375rem] drop-shadow-sm" />
          </span>
          <span className="text-[14px] font-bold tracking-[-0.02em] sm:text-[15px]">
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
          <DemoVideoDialog className="h-8 gap-1 px-2 text-xs sm:h-10 sm:gap-1.5 sm:px-3 sm:text-sm" />

          <Button
            variant="ghost"
            size="icon"
            onClick={onFilterOpen}
            title="Platform"
            aria-label="Platform"
            className="h-8 w-8 p-0 sm:h-10 sm:w-10"
          >
            <span className="flex h-full w-full items-center justify-center">
              <Store className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
            </span>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="inline-flex h-8 w-8 p-0 md:h-10 md:w-10"
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
              className="group/bell relative h-8 w-8 p-0 sm:h-10 sm:w-10"
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
            className="h-8 w-8 p-0 sm:h-10 sm:w-10"
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
                  className="relative h-8 w-8 rounded-full p-0 sm:h-10 sm:w-10"
                >
                  <div className="h-8 w-8 rounded-full bg-secondary sm:h-10 sm:w-10" />
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
              className="h-8 w-8 p-0 sm:h-10 sm:w-10"
            >
              <span className="flex h-full w-full items-center justify-center">
                <LogIn className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="px-3 pb-1.5 md:hidden">
        <form onSubmit={onSearchSubmit} className="relative overflow-visible">
          {shouldShowSearchCricketPass ? (
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
            type="search"
            placeholder="Search deals..."
            aria-label="Search deals"
            className="peer h-[2.15rem] w-full rounded-full border-0 bg-secondary pl-8 pr-10 text-base placeholder:text-transparent"
            value={searchValue}
            onChange={(e) => onSearchInputChange(e.target.value)}
          />
          {shouldShowSearchWicket ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-[0.5rem] top-1/2 z-[1] flex h-8 w-[1.35rem] -translate-y-1/2 items-end justify-center overflow-visible"
            >
              <span
                ref={mobileSearchWicketRef}
                className="flex h-full w-full items-center justify-center will-change-transform"
              >
                <SearchWicketIcon className="h-[1.24rem] w-[1.24rem]" />
              </span>
            </span>
          ) : null}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          {!searchValue.trim() ? (
            <SearchPromptOverlay
              prompt={activeSearchPrompt}
              promptKey={searchPromptIndex}
              className="left-8 right-10"
              textClassName="text-[0.95rem]"
            />
          ) : null}
          {searchValue ? (
            <button
              type="button"
              onClick={onClearSearch}
              title="Clear search"
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,transform] duration-200 hover:bg-background hover:text-foreground active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </form>
      </div>

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
    </header>
  );
}
