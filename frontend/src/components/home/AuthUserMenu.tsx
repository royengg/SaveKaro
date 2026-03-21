import { useEffect, useMemo, useRef, useState } from "react";
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
  const menuItemClass =
    "block rounded-[16px] px-2.5 py-2 text-[13px] font-medium text-foreground transition-[transform,background-color,color,box-shadow] duration-200 hover:-translate-y-[1px] hover:bg-white/42 hover:shadow-[0_16px_28px_-24px_rgba(15,23,42,0.26)] active:scale-[0.985] sm:rounded-[14px] sm:px-3 sm:py-2.5 sm:text-sm";

  const avatarInitial = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || "";
    return source ? source.charAt(0).toUpperCase() : null;
  }, [user?.email, user?.name]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  const handleLogout = async () => {
    closeMenu();
    await onLogout();
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
        onClick={() => setOpen((current) => !current)}
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

      {open ? (
        <div
          role="menu"
          aria-label="Account actions"
          className="surface-liquid-glass absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(13.75rem,calc(100vw-1rem))] rounded-[24px] p-1 sm:top-[calc(100%+0.5rem)] sm:w-56 sm:rounded-[24px] sm:p-1.5"
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
            <Link
              to="/saved"
              className={menuItemClass}
              onClick={closeMenu}
            >
              Saved Deals
            </Link>
            <Link
              to="/alerts"
              className={menuItemClass}
              onClick={closeMenu}
            >
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
        </div>
      ) : null}
    </div>
  );
}

export default AuthUserMenu;
