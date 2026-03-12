import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { Category } from "@/store/filterStore";

interface CategoryMoreMenuProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
}

const MENU_WIDTH_PX = 224;
const MENU_OFFSET_PX = 8;

function normalizeHexColor(value: string | null | undefined): string {
  if (!value) return "#64748b";
  const trimmed = value.trim();
  if (/^#([0-9a-f]{6})$/i.test(trimmed)) return trimmed;
  const shortMatch = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (!shortMatch) return "#64748b";
  const [r, g, b] = shortMatch[1].split("");
  return `#${r}${r}${g}${g}${b}${b}`;
}

function toRgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function getItemStyle(category: Category, active: boolean): CSSProperties {
  const [r, g, b] = toRgb(normalizeHexColor(category.color));
  return {
    backgroundColor: active ? `rgba(${r}, ${g}, ${b}, 0.14)` : undefined,
    borderColor: active ? `rgba(${r}, ${g}, ${b}, 0.24)` : undefined,
  };
}

function getIconStyle(category: Category, active: boolean): CSSProperties {
  const [r, g, b] = toRgb(normalizeHexColor(category.color));
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${active ? 0.26 : 0.14})`,
  };
}

export function CategoryMoreMenu({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryMoreMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: MENU_WIDTH_PX });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const availableRight = window.innerWidth - MENU_OFFSET_PX;
      const desiredLeft = rect.left;
      const clampedLeft = Math.min(
        Math.max(desiredLeft, MENU_OFFSET_PX),
        Math.max(MENU_OFFSET_PX, availableRight - MENU_WIDTH_PX),
      );

      setPosition({
        top: rect.bottom + MENU_OFFSET_PX,
        left: clampedLeft,
        width: MENU_WIDTH_PX,
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (slug: string) => {
    onSelectCategory(slug);
    setOpen(false);
  };

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        className="gap-1.5"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More categories"
        title="More categories"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="hidden sm:inline">More</span>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </Button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              aria-label="Category list"
              className="fixed z-[70] max-h-[60vh] overflow-y-auto rounded-xl border bg-background p-1 shadow-lg"
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
              }}
            >
              {categories.map((cat) => {
                const isActive = selectedCategory === cat.slug;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => handleSelect(cat.slug)}
                    className={`mb-0.5 flex w-full items-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-left text-sm ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={getItemStyle(cat, isActive)}
                  >
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] leading-none"
                      style={getIconStyle(cat, isActive)}
                    >
                      {cat.icon || "🏷️"}
                    </span>
                    {cat.name}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default CategoryMoreMenu;
