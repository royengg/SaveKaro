import { useEffect, useRef, useState } from "react";
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
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";

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
  const railRef = useRef<HTMLElement>(null);
  const [hovered, setHovered] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        railRef.current?.matches("[data-hovered], :has(:focus-visible)")
      ) {
        setDismissed(true);
      }
    };
    window.addEventListener("keydown", dismiss);
    return () => window.removeEventListener("keydown", dismiss);
  }, []);

  const renderNavItem = ({ path, label, icon: Icon }: NavItem) => {
    const isSection = path !== "/" && pathname.startsWith(`${path}/`);
    const current = pathname === path ? "page" : isSection ? "location" : undefined;

    return (
      <Link
        key={path}
        to={path}
        className="desktop-rail-row"
        aria-current={current}
        onClick={path === "/" ? resetFilters : undefined}
      >
        <span className="desktop-rail-icon" aria-hidden="true">
          <Icon size={19} />
        </span>
        <span className="desktop-rail-label">{label}</span>
      </Link>
    );
  };

  return (
    <aside
      ref={railRef}
      className="desktop-rail hidden md:flex"
      data-hovered={hovered || undefined}
      data-dismissed={dismissed || undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          setHovered(true);
          setDismissed(false);
        }
      }}
      onPointerLeave={() => setHovered(false)}
      onFocus={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setDismissed(false);
        }
      }}
    >
      <Link
        to="/"
        className="desktop-rail-row desktop-rail-brand"
        onClick={resetFilters}
        aria-label="SaveKaro home"
      >
        <span className="desktop-rail-icon" aria-hidden="true">
          <SaveKaroMark className="size-8" />
        </span>
        <span className="desktop-rail-label">SaveKaro</span>
      </Link>

      <nav className="desktop-rail-navigation" aria-label="Main navigation">
        {navItems.map(renderNavItem)}
        {isAuthenticated && renderNavItem(savedItem)}
        <div className="desktop-rail-secondary">
          {isAuthenticated && renderNavItem(submitItem)}
          <ThemeToggle className="desktop-rail-row" />
          {renderNavItem(settingsItem)}
        </div>
      </nav>
    </aside>
  );
}

export default IconRail;
