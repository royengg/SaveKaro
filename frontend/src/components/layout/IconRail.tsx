import { Link, useLocation } from "react-router-dom";
import { Home, Grid3X3, Bookmark, Bell, Settings, Plus, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  requiresAuth?: boolean;
}

const navItems: NavItem[] = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Search, label: "Explore" },
  { path: "/categories", icon: Grid3X3, label: "Categories" },
];

const authNavItems: NavItem[] = [
  { path: "/saved", icon: Bookmark, label: "Saved", requiresAuth: true },
  { path: "/notifications", icon: Bell, label: "Notifications", requiresAuth: true },
];

const bottomNavItems: NavItem[] = [
  { path: "/settings", icon: Settings, label: "Settings" },
];

interface IconRailProps {
  onFilterClick: () => void;
}

export function IconRail({ onFilterClick }: IconRailProps) {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;

    return (
      <TooltipProvider key={item.path} delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to={item.path}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-lg transition-all",
                  isActive
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-muted-foreground hover:bg-transparent hover:text-black dark:hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-[26px] w-[26px] transition-all",
                    isActive ? "stroke-[3]" : "stroke-[2.5]"
                  )}
                />
              </Button>
            </Link>
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
      <Link to="/" className="mb-8 mt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E60023]">
          <span className="text-xl font-bold text-white leading-none pb-0.5">D</span>
        </div>
      </Link>

      {/* Main Nav */}
      <nav className="flex flex-col items-center gap-2">
        {navItems.map(renderNavItem)}
        
        {/* Filter Button */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-lg text-muted-foreground hover:text-black dark:hover:text-white hover:bg-transparent"
                onClick={onFilterClick}
              >
                <SlidersHorizontal className="h-[26px] w-[26px] stroke-[2.5]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Filters
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isAuthenticated && authNavItems.map(renderNavItem)}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Create Button */}
      {isAuthenticated && (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to="/submit">
                <Button
                  size="icon"
                  className="h-12 w-12 rounded-full mb-4 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  <Plus className="h-6 w-6 stroke-[3]" />
                </Button>
              </Link>
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
