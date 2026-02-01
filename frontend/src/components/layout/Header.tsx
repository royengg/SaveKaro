import { Link } from "react-router-dom";
import { Search, Bell, User, Menu, Plus, LogIn, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useFilterStore } from "@/store/filterStore";
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function Header() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { search, setSearch, region, toggleRegion } = useFilterStore();
  const [searchValue, setSearchValue] = useState(search);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchValue);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

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
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <span className="hidden font-bold text-xl sm:inline-block">
              Deal<span className="text-primary">Hunt</span>
            </span>
          </Link>
        </div>

        {/* Search Bar - Desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden md:flex flex-1 max-w-lg mx-8"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search deals..."
              className="pl-10 w-full"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </form>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Region Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleRegion}
            title={
              region === "INDIA"
                ? "Showing India deals. Click for World"
                : "Showing World deals. Click for India"
            }
            className="text-lg"
          >
            {region === "INDIA" ? "🇮🇳" : "🌍"}
          </Button>

          {/* Mobile Search */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {isAuthenticated ? (
            <>
              {/* Submit Deal */}
              <Link to="/submit">
                <Button
                  variant="default"
                  size="sm"
                  className="hidden sm:flex gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Submit Deal
                </Button>
              </Link>

              {/* Notifications */}
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>

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
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/saved">Saved Deals</Link>
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
