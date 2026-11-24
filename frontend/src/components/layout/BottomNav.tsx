import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bookmark, ChevronUp, Home, Plus, Search, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AUTH_URL } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import "./mobile-dock.css";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/explore", icon: Search, label: "Explore" },
  { path: "/submit", icon: Plus, label: "Submit", requiresAuth: true },
  { path: "/saved", icon: Bookmark, label: "Saved", requiresAuth: true },
  { path: "/settings", icon: Settings, label: "Settings", requiresAuth: true },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const resetFilters = useFilterStore((state) => state.resetFilters);
  const [expanded, setExpanded] = useState(false);
  const [previousPath, setPreviousPath] = useState(pathname);
  const dockRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  if (pathname !== previousPath) {
    setPreviousPath(pathname);
    setExpanded(false);
  }

  useEffect(() => {
    if (!expanded) return;

    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !dockRef.current?.contains(event.target)) {
        setExpanded(false);
      }
    };
    const dismissWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setExpanded(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("keydown", dismissWithEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("keydown", dismissWithEscape);
    };
  }, [expanded]);

  const renderItems = () => navItems.map(({ path, icon: Icon, label, requiresAuth }) => {
    const active = pathname === path;
    const content = (
      <>
        <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
        <span className="mobile-dock-label">{label}</span>
      </>
    );
    if (requiresAuth && !isAuthenticated) {
      return (
        <button
          key={path}
          type="button"
          className="mobile-dock-item"
          aria-label={`Sign in with Google to open ${label}`}
          onClick={() => window.location.assign(`${AUTH_URL}/api/auth/google`)}
        >
          {content}
        </button>
      );
    }
    return (
      <Link
        key={path}
        to={path}
        className="mobile-dock-item"
        aria-current={active ? "page" : undefined}
        aria-label={label}
        onClick={() => {
          setExpanded(false);
          if (path === "/") resetFilters();
        }}
      >
        {content}
      </Link>
    );
  });

  return (
    <div
      ref={dockRef}
      className="mobile-dock md:hidden"
      data-expanded={expanded}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          setExpanded(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="mobile-dock-trigger"
        aria-label={expanded ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
      >
        <ChevronUp size={19} aria-hidden="true" />
      </button>

      <nav
        className="mobile-dock-shortcuts"
        aria-label="Mobile navigation"
        aria-hidden={expanded}
        inert={expanded}
      >
        {renderItems()}
      </nav>

      <div
        id={panelId}
        className="mobile-dock-panel"
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div className="mobile-dock-panel-header">
          <ThemeToggle />
        </div>
        <nav className="mobile-dock-destinations" aria-label="Mobile navigation menu">
          {renderItems()}
        </nav>
      </div>
    </div>
  );
}

export default BottomNav;
