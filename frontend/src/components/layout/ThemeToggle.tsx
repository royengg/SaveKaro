import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import "./theme-toggle.css";

export function ThemeToggle({ className }: { className?: string }) {
  const isDarkMode = useUiStore((state) => state.isDarkMode);
  const toggleDarkMode = useUiStore((state) => state.toggleDarkMode);

  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={isDarkMode}
      className={cn("theme-toggle inline-flex shrink-0 items-center", className)}
      onClick={toggleDarkMode}
    >
      <span className="theme-toggle-slot" aria-hidden="true">
        <span className="theme-toggle-track">
          <span className="theme-toggle-thumb">
            <Sun className="theme-toggle-sun" size={11} strokeWidth={2} />
            <Moon className="theme-toggle-moon" size={11} strokeWidth={2} />
          </span>
        </span>
      </span>
    </button>
  );
}
