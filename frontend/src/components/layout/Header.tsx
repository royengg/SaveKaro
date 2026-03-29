import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  LogIn,
  Plus,
  Home,
  Trophy,
  Bookmark,
  Bell,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import SaveKaroMark from "@/components/brand/SaveKaroMark";
import AuthUserMenu from "@/components/home/AuthUserMenu";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { resetFilters } = useFilterStore();
  const setMobileNavMenuOpen = useUiStore((state) => state.setMobileNavMenuOpen);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  // Hide submit button on pages where it's not relevant
  const hideSubmitButton = [
    "/submit",
    "/notifications",
    "/settings",
    "/alerts",
    "/saved",
  ].includes(location.pathname);

  const mobileNavItems = [
    {
      to: "/",
      label: "Home",
      icon: Home,
      onClick: resetFilters,
    },
    {
      to: "/leaderboard",
      label: "Leaderboard",
      icon: Trophy,
    },
    ...(isAuthenticated
      ? [
          {
            to: "/saved",
            label: "Saved Deals",
            icon: Bookmark,
          },
          {
            to: "/submit",
            label: "Submit Deal",
            icon: Plus,
          },
          {
            to: "/notifications",
            label: "Notifications",
            icon: Bell,
          },
          {
            to: "/settings",
            label: "Settings",
            icon: Settings,
          },
        ]
      : []),
  ];

  useEffect(() => {
    setMobileNavMenuOpen(isMobileMenuOpen);
  }, [isMobileMenuOpen, setMobileNavMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(
    () => () => {
      setMobileNavMenuOpen(false);
    },
    [setMobileNavMenuOpen],
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo and Mobile Menu */}
        <div className="flex items-center gap-4">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                title="Open menu"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              showCloseButton={false}
              className="left-2 top-2 bottom-auto h-auto max-h-[calc(100dvh-1rem)] w-[min(15rem,calc(100vw-1rem))] gap-0 overflow-hidden rounded-[30px] border border-white/65 bg-white/70 px-3 py-3 shadow-[0_32px_72px_-36px_rgba(15,23,42,0.42)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/62"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.9),rgba(255,255,255,0.5)_42%,rgba(255,255,255,0.18)_100%)]" />
              <div className="relative">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <SheetClose asChild>
                    <Link
                      to="/"
                      onClick={resetFilters}
                      className="flex min-w-0 items-center gap-2 rounded-[22px] border border-white/55 bg-white/44 px-2.5 py-2 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.3)] backdrop-blur-md"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/72">
                        <SaveKaroMark className="h-6 w-6 drop-shadow-sm" />
                      </span>
                      <span className="truncate text-lg font-semibold tracking-[-0.02em] text-foreground">
                        SaveKaro
                      </span>
                    </Link>
                  </SheetClose>

                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-[18px] border border-white/60 bg-white/44 text-foreground/75 shadow-[0_12px_26px_-22px_rgba(15,23,42,0.35)] backdrop-blur-md transition-[transform,background-color,border-color,color] duration-200 hover:bg-white/62 hover:text-foreground active:scale-[0.98]"
                      aria-label="Close menu"
                    >
                      <X className="h-4.5 w-4.5" />
                    </Button>
                  </SheetClose>
                </div>

                <nav className="flex flex-col gap-1.5">
                  {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;

                    return (
                      <SheetClose asChild key={item.to}>
                        <Link
                          to={item.to}
                          onClick={item.onClick}
                          className={cn(
                            "group flex items-center gap-3 rounded-[22px] border px-2.5 py-2.5 text-[15px] font-medium text-foreground transition-[transform,background-color,border-color,box-shadow] duration-200 active:scale-[0.985]",
                            isActive
                              ? "border-white/70 bg-white/72 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.36)]"
                              : "border-transparent bg-white/18 hover:border-white/45 hover:bg-white/38",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border backdrop-blur-md transition-colors duration-200",
                              isActive
                                ? "border-white/70 bg-white/80 text-foreground"
                                : "border-white/40 bg-white/30 text-foreground/78 group-hover:bg-white/55 group-hover:text-foreground",
                            )}
                          >
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          <span className="truncate">{item.label}</span>
                        </Link>
                      </SheetClose>
                    );
                  })}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" onClick={resetFilters}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center">
              <SaveKaroMark className="h-7 w-7 drop-shadow-sm" />
            </span>
            <span className="hidden font-bold text-xl sm:inline-block">
              Save<span className="text-primary">Karo</span>
            </span>
          </Link>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Submit Deal — hidden on submit page */}
              {!hideSubmitButton && (
                <Link to="/submit">
                  <Button
                    variant="default"
                    size="sm"
                    className="cta-dark-pill hidden h-10 px-4 text-[15px] font-semibold sm:inline-flex"
                  >
                    <span className="cta-dark-pill-icon">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                    Submit Deal
                  </Button>
                </Link>
              )}

              {/* User Menu */}
              <AuthUserMenu
                user={user}
                onLogout={logout}
                items={[
                  { to: "/saved", label: "Saved Deals" },
                  { to: "/notifications", label: "Notifications" },
                  { to: "/alerts", label: "Price Alerts" },
                  { to: "/settings", label: "Settings" },
                ]}
              />
            </>
          ) : (
            <Button onClick={handleGoogleLogin} className="gap-2">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in with Google</span>
              <span className="sm:hidden">Sign in</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
