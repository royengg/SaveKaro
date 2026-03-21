import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User as AuthUser } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface AuthUserMenuProps {
  user: AuthUser | null;
  onLogout: () => Promise<void>;
}

export function AuthUserMenu({ user, onLogout }: AuthUserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 220,
    maxHeight: 0,
    originY: "top" as "top" | "bottom",
  });
  const menuItemClass =
    "block rounded-[16px] px-2.5 py-2 text-[13px] font-medium text-foreground transition-[transform,background-color,color,box-shadow] duration-200 hover:-translate-y-[1px] hover:bg-white/42 hover:shadow-[0_16px_28px_-24px_rgba(15,23,42,0.26)] active:scale-[0.985] sm:rounded-[14px] sm:px-3 sm:py-2.5 sm:text-sm";

  const avatarInitial = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || "";
    return source ? source.charAt(0).toUpperCase() : null;
  }, [user?.email, user?.name]);

  const updatePosition = useCallback(() => {
    const anchorRect = containerRef.current?.getBoundingClientRect();
    if (!anchorRect) {
      return;
    }

    const visualViewport = window.visualViewport;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const sideMargin = 8;
    const verticalGap = 6;
    const width = Math.min(224, Math.max(176, viewportWidth - sideMargin * 2));
    const left = Math.min(
      Math.max(viewportLeft + sideMargin, anchorRect.right + viewportLeft - width),
      viewportLeft + viewportWidth - width - sideMargin,
    );

    const measuredHeight = menuRef.current?.offsetHeight ?? 320;
    const availableBelow =
      viewportTop + viewportHeight -
      (anchorRect.bottom + viewportTop + verticalGap) -
      sideMargin;
    const availableAbove =
      anchorRect.top + viewportTop - verticalGap - (viewportTop + sideMargin);
    const placeAbove =
      availableBelow < Math.min(measuredHeight, 260) &&
      availableAbove > availableBelow;

    const maxHeight = Math.max(160, placeAbove ? availableAbove : availableBelow);
    const top = placeAbove
      ? Math.max(
          viewportTop + sideMargin,
          anchorRect.top + viewportTop - Math.min(measuredHeight, maxHeight),
        )
      : anchorRect.bottom + viewportTop + verticalGap;

    setMenuPosition({
      top,
      left,
      width,
      maxHeight,
      originY: placeAbove ? "bottom" : "top",
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handleViewportChange = () => updatePosition();

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, [open, updatePosition]);

  useLayoutEffect(() => {
    if (!open) return;

    updatePosition();
    const rafId = window.requestAnimationFrame(() => {
      updatePosition();
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [open, updatePosition]);

  const closeMenu = () => setOpen(false);

  const handleLogout = async () => {
    closeMenu();
    await onLogout();
  };

  const handleToggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }

    updatePosition();
    setOpen(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        className={cn(
          "relative h-8 w-8 rounded-full p-0 transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-[1px] sm:h-10 sm:w-10",
          open
            ? "surface-liquid-chip bg-white/22 shadow-[0_16px_28px_-24px_rgba(15,23,42,0.26)]"
            : "hover:bg-white/18",
        )}
        title="Account menu"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleToggleMenu}
      >
        <span className="block h-8 w-8 overflow-hidden rounded-full sm:h-10 sm:w-10">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user?.name || "User"}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="inline-flex h-full w-full items-center justify-center bg-secondary text-sm font-semibold text-foreground">
              {avatarInitial ?? <User className="h-4 w-4" />}
            </span>
          )}
        </span>
      </Button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Account actions"
              className="surface-liquid-glass fixed z-[70] overflow-y-auto overscroll-contain rounded-[24px] p-1 sm:p-1.5"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuPosition.width,
                maxHeight: menuPosition.maxHeight,
                WebkitOverflowScrolling: "touch",
                paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom, 0px))",
                transformOrigin: `${menuPosition.originY} right`,
              }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_36%),radial-gradient(circle_at_top_left,rgba(244,114,182,0.14),transparent_42%)]" />

              <div className="relative z-10">
                <div className="border-b border-white/46 px-3 py-2.5 sm:px-3.5 sm:py-3">
                  {user?.name ? (
                    <p className="text-[15px] font-semibold leading-tight tracking-[-0.02em] sm:text-base">
                      {user.name}
                    </p>
                  ) : null}
                  {user?.email ? (
                    <p className="truncate pt-0.5 text-[12px] text-muted-foreground sm:text-sm">
                      {user.email}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1 px-1 py-1 sm:px-0 sm:py-1.5">
                  <Link to="/saved" className={menuItemClass} onClick={closeMenu}>
                    Saved Deals
                  </Link>
                  <Link to="/alerts" className={menuItemClass} onClick={closeMenu}>
                    Price Alerts
                  </Link>
                  <Link
                    to="/leaderboard"
                    className={menuItemClass}
                    onClick={closeMenu}
                  >
                    Leaderboard
                  </Link>
                  <Link
                    to="/settings"
                    className={menuItemClass}
                    onClick={closeMenu}
                  >
                    Settings
                  </Link>
                </div>

                <div className="border-t border-white/42 px-1 pt-1 sm:px-0 sm:pt-1.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-[16px] px-2.5 py-2 text-left text-[13px] font-medium text-destructive transition-[transform,background-color,color,box-shadow] duration-200 hover:-translate-y-[1px] hover:bg-rose-500/10 hover:shadow-[0_16px_28px_-24px_rgba(244,63,94,0.28)] active:scale-[0.985] sm:rounded-[14px] sm:px-3 sm:py-2.5 sm:text-sm"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default AuthUserMenu;
