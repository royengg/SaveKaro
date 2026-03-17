import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Bookmark,
  Settings,
  Plus,
  Search,
  Trophy,
} from "lucide-react";
import SaveKaroMark from "@/components/brand/SaveKaroMark";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Search, label: "Explore" },
  { path: "/leaderboard", icon: Trophy, label: "Leaderboard" },
];

const authNavItems: NavItem[] = [
  { path: "/saved", icon: Bookmark, label: "Saved", requiresAuth: true },
];

const bottomNavItems: NavItem[] = [
  { path: "/settings", icon: Settings, label: "Settings" },
];

export function IconRail() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const { resetFilters } = useFilterStore();

  const handleHomeClick = () => {
    resetFilters();
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <TooltipProvider key={item.path} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-xl transition-all",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-transparent hover:text-foreground",
              )}
            >
              <Link
                to={item.path}
                aria-label={`Open ${item.label} page`}
                title={item.label}
                onClick={item.path === "/" ? handleHomeClick : undefined}
              >
                <Icon
                  className={cn(
                    "h-[26px] w-[26px] transition-all",
                    isActive ? "stroke-[3]" : "stroke-[2.5]",
                  )}
                />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-24 flex-col items-center py-6 border-r bg-background z-50">
      {/* Logo */}
      <Link
        to="/"
        className="mb-8 mt-2"
        onClick={handleHomeClick}
        aria-label="Go to home page"
        title="Home"
      >
        <span className="flex h-10 w-10 items-center justify-center transition-transform hover:scale-105">
          <SaveKaroMark className="h-7 w-7 drop-shadow-sm" />
        </span>
      </Link>

      {/* Main Nav */}
      <nav className="flex flex-col items-center gap-2">
        {navItems.map(renderNavItem)}

        {isAuthenticated && authNavItems.map(renderNavItem)}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Create Button */}
      {isAuthenticated && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                size="icon"
                className="h-12 w-12 rounded-full mb-4 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              >
                <Link to="/submit" aria-label="Open submit deal page" title="Submit Deal">
                  <Plus className="h-6 w-6 stroke-[3]" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Submit Deal
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Bottom Nav */}
      <nav className="flex flex-col items-center gap-2">
        {bottomNavItems.map(renderNavItem)}
      </nav>
    </aside>
  );
}

export default IconRail;
