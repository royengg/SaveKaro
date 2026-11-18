import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/uiStore";
import "./theme-toggle.css";

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const isDarkMode = useUiStore((state) => state.isDarkMode);
  const toggleDarkMode = useUiStore((state) => state.toggleDarkMode);

  return (
    <button
      type="button"
      role="switch"
      aria-label="Dark mode"
      aria-checked={isDarkMode}
      title="Dark mode"
      className={cn("theme-toggle inline-flex shrink-0 items-center", className)}
      onClick={toggleDarkMode}
    >
      <span className="theme-toggle-slot" aria-hidden="true">
        <span className="theme-toggle-track">
          <span className="theme-toggle-thumb" />
        </span>
      </span>
      {showLabel && (
        <span className="desktop-rail-label ms-2" aria-hidden="true">Dark mode</span>
      )}
    </button>
  );
}
