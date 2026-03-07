import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Category } from "@/store/filterStore";

interface CategoryMoreMenuProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (slug: string | null) => void;
}

export function CategoryMoreMenu({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryMoreMenuProps) {
  const normalizeHexColor = (value: string | null | undefined): string => {
    if (!value) return "#64748b";
    const trimmed = value.trim();
    if (/^#([0-9a-f]{6})$/i.test(trimmed)) return trimmed;
    const shortMatch = trimmed.match(/^#([0-9a-f]{3})$/i);
    if (!shortMatch) return "#64748b";
    const [r, g, b] = shortMatch[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  };

  const toRgb = (hex: string): [number, number, number] => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];

  const getItemStyle = (category: Category, active: boolean): CSSProperties => {
    const [r, g, b] = toRgb(normalizeHexColor(category.color));
    return {
      backgroundColor: active ? `rgba(${r}, ${g}, ${b}, 0.14)` : undefined,
      borderColor: active ? `rgba(${r}, ${g}, ${b}, 0.24)` : undefined,
    };
  };

  const getIconStyle = (category: Category, active: boolean): CSSProperties => {
    const [r, g, b] = toRgb(normalizeHexColor(category.color));
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, ${active ? 0.26 : 0.14})`,
    };
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          return (
            <DropdownMenuItem
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className={`gap-2 rounded-lg border border-transparent ${
                isActive ? "text-foreground" : "text-muted-foreground"
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
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CategoryMoreMenu;
