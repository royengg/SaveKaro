import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User as AuthUser } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface AuthUserMenuItem {
  to: string;
  label: string;
}

interface AuthUserMenuProps {
  user: AuthUser | null;
  onLogout: () => Promise<void>;
  items?: AuthUserMenuItem[];
}

const defaultMenuItems: AuthUserMenuItem[] = [
  { to: "/alerts", label: "Price Alerts" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/settings", label: "Settings" },
];

export function AuthUserMenu({
  user,
  onLogout,
  items = defaultMenuItems,
}: AuthUserMenuProps) {
  const [open, setOpen] = useState(false);

  const avatarInitial = useMemo(() => {
    const source = user?.name?.trim() || user?.email?.trim() || "";
    return source ? source.charAt(0).toUpperCase() : null;
  }, [user?.email, user?.name]);

  const menuItemClass =
    "min-h-10 rounded-[16px] border border-transparent bg-white/0 px-3 py-0 text-[13px] font-medium leading-none tracking-[-0.01em] text-foreground outline-none will-change-transform transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out hover:-translate-y-[1px] hover:border-black/6 hover:bg-white/72 hover:shadow-[0_14px_24px_-22px_rgba(15,23,42,0.18)] data-[highlighted]:-translate-y-[1px] data-[highlighted]:border-black/6 data-[highlighted]:bg-white/72 data-[highlighted]:text-foreground data-[highlighted]:shadow-[0_14px_24px_-22px_rgba(15,23,42,0.18)] active:scale-[0.985] sm:min-h-10 sm:rounded-[14px] sm:px-3.5 sm:text-[13.5px]";

  const handleLogout = async () => {
    setOpen(false);
    await onLogout();
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={{ top: 12, right: 8, bottom: 12, left: 8 }}
        className="surface-liquid-glass z-[70] w-[calc(100vw-1rem)] max-w-[13.25rem] overflow-hidden rounded-[24px] border-white/60 p-1 shadow-[0_28px_64px_-34px_rgba(15,23,42,0.42)] sm:w-[13.75rem] sm:p-1.5"
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

          <div className="space-y-0.5 px-1 py-1 sm:px-0 sm:py-1">
            {items.map((item) => (
              <DropdownMenuItem asChild className={menuItemClass} key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </div>

          <DropdownMenuSeparator className="mx-1 bg-white/42 sm:mx-0" />

          <div className="px-1 pb-1 sm:px-0 sm:pb-0">
            <DropdownMenuItem
              onSelect={() => {
                void handleLogout();
              }}
              className="min-h-10 rounded-[16px] border border-transparent bg-white/0 px-3 py-0 text-[13px] font-medium leading-none tracking-[-0.01em] text-destructive outline-none will-change-transform transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out hover:-translate-y-[1px] hover:border-rose-200/85 hover:bg-rose-500/10 hover:shadow-[0_14px_24px_-22px_rgba(244,63,94,0.22)] data-[highlighted]:-translate-y-[1px] data-[highlighted]:border-rose-200/85 data-[highlighted]:bg-rose-500/10 data-[highlighted]:text-destructive data-[highlighted]:shadow-[0_14px_24px_-22px_rgba(244,63,94,0.22)] active:scale-[0.985] sm:min-h-10 sm:rounded-[14px] sm:px-3.5 sm:text-[13.5px]"
            >
              Log out
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default AuthUserMenu;
