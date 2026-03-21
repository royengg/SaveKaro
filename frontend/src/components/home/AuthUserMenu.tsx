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
          "relative h-8 w-8 rounded-full p-0 sm:h-10 sm:w-10",
          open ? "bg-secondary" : undefined,
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
          className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(13.75rem,calc(100vw-1rem))] rounded-[22px] border bg-background/98 p-0.5 shadow-[0_22px_44px_-28px_rgba(15,23,42,0.3)] backdrop-blur supports-[backdrop-filter]:bg-background/92 sm:top-[calc(100%+0.5rem)] sm:w-56 sm:rounded-xl sm:p-1 sm:shadow-lg"
        >
          <div className="border-b px-2.5 py-2 sm:px-3 sm:py-2">
            {user?.name ? (
              <p className="text-[15px] font-semibold leading-tight sm:text-base">
                {user.name}
              </p>
            ) : null}
            {user?.email ? (
              <p className="truncate pt-0.5 text-[12px] text-muted-foreground sm:text-sm">
                {user.email}
              </p>
            ) : null}
          </div>

          <div className="py-0.5 sm:py-1">
            <Link
              to="/saved"
              className="block rounded-[14px] px-2.5 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary sm:rounded-md sm:px-3 sm:py-2 sm:text-sm"
              onClick={closeMenu}
            >
              Saved Deals
            </Link>
            <Link
              to="/alerts"
              className="block rounded-[14px] px-2.5 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary sm:rounded-md sm:px-3 sm:py-2 sm:text-sm"
              onClick={closeMenu}
            >
              Price Alerts
            </Link>
            <Link
              to="/leaderboard"
              className="block rounded-[14px] px-2.5 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary sm:rounded-md sm:px-3 sm:py-2 sm:text-sm"
              onClick={closeMenu}
            >
              Leaderboard
            </Link>
            <Link
              to="/settings"
              className="block rounded-[14px] px-2.5 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary sm:rounded-md sm:px-3 sm:py-2 sm:text-sm"
              onClick={closeMenu}
            >
              Settings
            </Link>
          </div>

          <div className="border-t pt-0.5 sm:pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full rounded-[14px] px-2.5 py-1.5 text-left text-[13px] font-medium text-destructive hover:bg-secondary sm:rounded-md sm:px-3 sm:py-2 sm:text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AuthUserMenu;
