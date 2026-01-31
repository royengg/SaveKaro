import { Link, useLocation } from "react-router-dom";
import { Home, Grid3X3, Bookmark, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/categories", icon: Grid3X3, label: "Categories" },
  { path: "/submit", icon: Plus, label: "Submit", requiresAuth: true },
  { path: "/saved", icon: Bookmark, label: "Saved", requiresAuth: true },
  { path: "/profile", icon: User, label: "Profile", requiresAuth: true },
];

export function BottomNav() {
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  const visibleItems = navItems.filter(
    (item) => !item.requiresAuth || isAuthenticated
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                "active:bg-accent/50 touch-manipulation",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for notched phones */}
      <div className="h-safe-area-inset-bottom" />
    </nav>
  );
}

export default BottomNav;
