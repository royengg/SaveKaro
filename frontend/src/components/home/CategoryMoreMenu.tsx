import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import type { Category } from "@/store/filterStore";

interface CategoryMoreMenuProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
}

const MENU_WIDTH_PX = 224;
const MOBILE_MENU_WIDTH_PX = 188;
const TINY_MENU_WIDTH_PX = 176;
const MOBILE_BREAKPOINT_PX = 640;
const TINY_SCREEN_BREAKPOINT_PX = 400;
const MENU_OFFSET_PX = 8;
const VIEWPORT_MARGIN_PX = 8;
const MOBILE_MENU_MAX_HEIGHT_PX = 320;
const TINY_MENU_MAX_HEIGHT_PX = 272;
const DESKTOP_MENU_MAX_HEIGHT_PX = 520;
const DESKTOP_BOTTOM_CLEARANCE_PX = 32;
const MIN_MENU_HEIGHT_PX = 120;
const MENU_CLOSE_DURATION_MS = 150;

function getMenuWidth(viewportWidth: number) {
  const preferredWidth =
    viewportWidth < TINY_SCREEN_BREAKPOINT_PX
      ? TINY_MENU_WIDTH_PX
      : viewportWidth < MOBILE_BREAKPOINT_PX
        ? MOBILE_MENU_WIDTH_PX
        : MENU_WIDTH_PX;

  return Math.min(preferredWidth, viewportWidth - VIEWPORT_MARGIN_PX * 2);
}

function getMenuHeightLimit(viewportWidth: number) {
  if (viewportWidth < TINY_SCREEN_BREAKPOINT_PX) {
    return TINY_MENU_MAX_HEIGHT_PX;
  }

  if (viewportWidth < MOBILE_BREAKPOINT_PX) {
    return MOBILE_MENU_MAX_HEIGHT_PX;
  }

  return DESKTOP_MENU_MAX_HEIGHT_PX;
}

function getBottomClearance(viewportWidth: number, viewportHeight: number) {
  if (viewportWidth >= MOBILE_BREAKPOINT_PX) {
    return DESKTOP_BOTTOM_CLEARANCE_PX;
  }

  return Math.max(104, Math.round(viewportHeight * 0.16));
}

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
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: MENU_WIDTH_PX,
    maxHeight: DESKTOP_MENU_MAX_HEIGHT_PX,
    originY: "top" as "top" | "bottom",
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      setIsClosing(false);
      return;
    }

    if (!isRendered) {
      return;
    }

    setIsClosing(true);
    const timeoutId = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, MENU_CLOSE_DURATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isRendered, open]);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const menuWidth = getMenuWidth(viewportWidth);
      const availableRight = viewportWidth - VIEWPORT_MARGIN_PX;
      const desiredLeft = rect.left;
      const top = rect.bottom + MENU_OFFSET_PX;
      const bottomClearance = getBottomClearance(viewportWidth, viewportHeight);
      const availableHeightBelow = viewportHeight - top - bottomClearance;
      const availableHeightAbove = rect.top - MENU_OFFSET_PX - VIEWPORT_MARGIN_PX;
      const shouldPlaceAbove =
        availableHeightBelow < MIN_MENU_HEIGHT_PX &&
        availableHeightAbove > availableHeightBelow;
      const heightLimit = getMenuHeightLimit(viewportWidth);
      const maxHeight = Math.max(
        MIN_MENU_HEIGHT_PX,
        Math.min(
          heightLimit,
          Math.max(
            shouldPlaceAbove ? availableHeightAbove : availableHeightBelow,
            MIN_MENU_HEIGHT_PX,
          ),
        ),
      );
      const clampedLeft = Math.min(
        Math.max(desiredLeft, VIEWPORT_MARGIN_PX),
        Math.max(VIEWPORT_MARGIN_PX, availableRight - menuWidth),
      );
      const maxTopBelow = viewportHeight - bottomClearance - maxHeight;
      const resolvedTop = shouldPlaceAbove
        ? Math.max(VIEWPORT_MARGIN_PX, rect.top - MENU_OFFSET_PX - maxHeight)
        : Math.min(
            Math.max(VIEWPORT_MARGIN_PX, top),
            Math.max(VIEWPORT_MARGIN_PX, maxTopBelow),
          );

      setPosition({
        top: resolvedTop,
        left: clampedLeft,
        width: menuWidth,
        maxHeight,
        originY: shouldPlaceAbove ? "bottom" : "top",
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
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
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
        className={cn(
          "gap-1.5 transition-[transform,background-color] duration-200",
          open
            ? "scale-[0.97] bg-secondary/70"
            : "hover:bg-secondary/50 hover:scale-[1.02] active:scale-95",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More categories"
        title="More categories"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="hidden sm:inline">More</span>
        <svg
          className={cn(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-90",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </Button>

      {isRendered && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              aria-label="Category list"
              className={cn(
                "fixed z-[70] overflow-y-auto overscroll-contain rounded-[20px] border bg-background p-1 shadow-lg sm:rounded-xl",
                isClosing ? "motion-menu-exit" : "motion-menu-enter",
              )}
              style={{
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: position.maxHeight,
                WebkitOverflowScrolling: "touch",
                paddingBottom: "calc(0.25rem + env(safe-area-inset-bottom, 0px))",
                transformOrigin: `${position.originY} left`,
              }}
            >
              {categories.map((cat, index) => {
                const isActive = selectedCategory === cat.slug;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => handleSelect(cat.slug)}
                    className={cn(
                      "mb-0.5 flex w-full items-center gap-1.5 rounded-lg border border-transparent px-1.5 py-1.5 text-left text-[13px] transition-[transform,color,background-color,border-color] duration-200 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.99] sm:gap-2 sm:px-2.5 sm:py-2 sm:text-sm",
                      !isClosing && "motion-menu-item-enter",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    style={{
                      ...getItemStyle(cat, isActive),
                      animationDelay: !isClosing ? `${Math.min(index, 8) * 24}ms` : undefined,
                    }}
                  >
                    <span
                      className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] leading-none sm:h-5 sm:w-5 sm:text-[11px]"
                      style={getIconStyle(cat, isActive)}
                    >
                      {getCategoryIcon(cat)}
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
