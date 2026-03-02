import { Link, useLocation } from "react-router-dom";
import { User, Menu, LogIn, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthStore } from "@/store/authStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const location = useLocation();

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo and Mobile Menu */}
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <nav className="flex flex-col gap-4 mt-8">
                <Link to="/" className="text-lg font-medium hover:text-primary">
                  Home
                </Link>
                <Link
                  to="/categories"
                  className="text-lg font-medium hover:text-primary"
                >
                  Categories
                </Link>
                <Link
                  to="/leaderboard"
                  className="text-lg font-medium hover:text-primary"
                >
                  Leaderboard
                </Link>
                {isAuthenticated && (
                  <>
                    <Link
                      to="/saved"
                      className="text-lg font-medium hover:text-primary"
                    >
                      Saved Deals
                    </Link>
                    <Link
                      to="/submit"
                      className="text-lg font-medium hover:text-primary"
                    >
                      Submit Deal
                    </Link>
                    <Link
                      to="/notifications"
                      className="text-lg font-medium hover:text-primary"
                    >
                      Notifications
                    </Link>
                    <Link
                      to="/settings"
                      className="text-lg font-medium hover:text-primary"
                    >
                      Settings
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo — consistent PiggyBank pig icon across site */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E60023] shadow-sm">
              <PiggyBank className="h-5 w-5 text-white stroke-[1.5]" />
            </div>
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
                    className="hidden sm:flex gap-2"
                  >
                    Submit Deal
                  </Button>
                </Link>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={user?.avatarUrl || undefined}
                        alt={user?.name || "User"}
                      />
                      <AvatarFallback>
                        {user?.name?.charAt(0).toUpperCase() || (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {user?.name && <p className="font-medium">{user.name}</p>}
                      {user?.email && (
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/saved">Saved Deals</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/notifications">Notifications</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/alerts">Price Alerts</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-destructive"
                  >
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
