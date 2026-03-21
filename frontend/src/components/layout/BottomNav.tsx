import { Link, useLocation } from "react-router-dom";
import { Home, Bookmark, Plus, Settings, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { useUiStore } from "@/store/uiStore";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Search, label: "Explore" },
  { path: "/submit", icon: Plus, label: "Submit", requiresAuth: true },
  { path: "/saved", icon: Bookmark, label: "Saved", requiresAuth: true },
  { path: "/settings", icon: Settings, label: "Settings", requiresAuth: true },
];

export function BottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const { resetFilters } = useFilterStore();
  const { isHomeChromeScrolling } = useUiStore();
  const shouldDimOnHomeScroll =
    location.pathname === "/" && isHomeChromeScrolling;

  const visibleItems = navItems.filter(
    (item) => !item.requiresAuth || isAuthenticated,
  );
  const activeIndex = visibleItems.findIndex(
    (item) => location.pathname === item.path,
  );
  const hasActiveItem = activeIndex >= 0;
  const indicatorWidth = `${100 / visibleItems.length}%`;

  return (
    <nav
      className={cn(
        "motion-home-bottom-chrome fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden",
        shouldDimOnHomeScroll
          ? "translate-y-0 opacity-[0.68]"
          : "translate-y-0 opacity-100",
      )}
    >
      <div className="flex h-14 px-2">
        <div className="relative flex flex-1 items-stretch">
          <span
            aria-hidden="true"
            className={cn(
              "motion-nav-indicator absolute inset-y-1 left-0 rounded-[1.2rem] bg-primary/10 shadow-[0_16px_26px_-24px_rgba(15,23,42,0.45)]",
              hasActiveItem ? "opacity-100" : "opacity-0",
            )}
            style={{
              width: indicatorWidth,
              transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
            }}
          />
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={item.path === "/" ? resetFilters : undefined}
              className={cn(
                "group relative z-10 flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.2rem] transition-[color,transform] duration-300 touch-manipulation",
                "active:scale-[0.98]",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-transform duration-300",
                  isActive
                    ? "-translate-y-0.5 scale-[1.08]"
                    : "group-hover:-translate-y-[1px] group-active:scale-95",
                )}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 transition-transform duration-300",
                    isActive ? "scale-110 fill-current text-primary" : "",
                  )}
                />
              </span>
              <span
                className={cn(
                  "text-[9px] font-medium tracking-[-0.01em] transition-[opacity,transform,color] duration-300",
                  isActive
                    ? "translate-y-0 opacity-100 text-foreground"
                    : "translate-y-0.5 opacity-75 group-hover:translate-y-0 group-hover:opacity-100",
                )}
              >
                {item.label}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute bottom-1 h-1 w-1 rounded-full bg-primary transition-all duration-300",
                  isActive ? "scale-100 opacity-100" : "scale-0 opacity-0",
                )}
              />
            </Link>
          );
        })}
        </div>
      </div>
      {/* Safe area padding for notched phones */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}

export default BottomNav;
