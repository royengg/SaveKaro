import { Link, useLocation } from "react-router-dom";
import {
  Bookmark,
  BookOpen,
  Home,
  Plus,
  Search,
  Settings,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import SaveKaroMark from "@/components/brand/SaveKaroMark";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Search, label: "Explore" },
  { path: "/guides", icon: BookOpen, label: "Guides" },
  { path: "/leaderboard", icon: Trophy, label: "Leaderboard" },
];

const savedItem: NavItem = { path: "/saved", icon: Bookmark, label: "Saved" };
const submitItem: NavItem = { path: "/submit", icon: Plus, label: "Submit deal" };
const settingsItem: NavItem = { path: "/settings", icon: Settings, label: "Settings" };

export function IconRail() {
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const resetFilters = useFilterStore((state) => state.resetFilters);

  const renderNavItem = ({ path, label, icon: Icon }: NavItem) => {
    const isSection = path !== "/" && pathname.startsWith(`${path}/`);
    const current = pathname === path ? "page" : isSection ? "location" : undefined;

    return (
      <Tooltip key={path}>
        <TooltipTrigger asChild>
          <Link
            to={path}
            className="desktop-rail-row"
            aria-label={label}
            aria-current={current}
            onClick={path === "/" ? resetFilters : undefined}
          >
            <Icon size={19} aria-hidden="true" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={16} className="motion-reduce:animate-none">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <aside className="desktop-rail hidden md:flex">
      <Link
        to="/"
        className="desktop-rail-row desktop-rail-brand"
        onClick={resetFilters}
        aria-label="SaveKaro home"
      >
        <SaveKaroMark className="size-8" />
      </Link>

      <nav className="desktop-rail-navigation" aria-label="Main navigation">
        {navItems.map(renderNavItem)}
        {isAuthenticated && renderNavItem(savedItem)}
        <div className="desktop-rail-secondary">
          {isAuthenticated && renderNavItem(submitItem)}
          {renderNavItem(settingsItem)}
        </div>
      </nav>
    </aside>
  );
}

export default IconRail;
