import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { useDealCartStore } from "@/store/dealCartStore";
import { useUiStore } from "@/store/uiStore";

export function FloatingCartButton() {
  const location = useLocation();
  const items = useDealCartStore((state) => state.items);
  const { isHomeUiCollapsed } = useUiStore();
  const itemCount = items.length;
  const leadItem = items[0] ?? null;
  const hiddenPaths = new Set([
    "/cart",
    "/submit",
    "/privacy-policy",
    "/terms-and-conditions",
    "/affiliate-disclosure",
    "/disclaimer",
  ]);

  if (hiddenPaths.has(location.pathname)) {
    return null;
  }

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+12px)] z-50 flex justify-center px-4 transition-transform transition-opacity duration-200 will-change-transform md:inset-x-auto md:right-8 md:bottom-8 md:px-0 ${
        isHomeUiCollapsed
          ? "translate-y-6 opacity-0 md:translate-y-0 md:opacity-100"
          : "translate-y-0 opacity-100"
      }`}
    >
      {itemCount === 0 ? (
        <Link
          to="/cart"
          className={`flex items-center gap-2 rounded-full border border-[#E60023] bg-[#E60023] px-3 py-2 text-[13px] font-semibold text-white shadow-[0_22px_48px_-24px_rgba(230,0,35,0.56)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#cf0020] ${
            isHomeUiCollapsed
              ? "pointer-events-none md:pointer-events-auto"
              : "pointer-events-auto"
          }`}
          aria-label="Open cart"
          title="Cart"
        >
          <ShoppingCart className="h-4 w-4 text-white" />
          Cart
        </Link>
      ) : (
        <Link
          to="/cart"
          className={`flex min-h-[54px] w-[min(240px,calc(100vw-8rem))] items-center gap-2 rounded-full border border-[#E60023] bg-[#E60023] px-2 py-1.5 text-white shadow-[0_22px_48px_-24px_rgba(230,0,35,0.56)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#cf0020] md:w-[276px] ${
            isHomeUiCollapsed
              ? "pointer-events-none md:pointer-events-auto"
              : "pointer-events-auto"
          }`}
          aria-label={`Open cart with ${itemCount} deal${itemCount === 1 ? "" : "s"}`}
          title="Cart"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/85 bg-white shadow-sm">
            {leadItem?.imageUrl ? (
              <img
                src={leadItem.imageUrl}
                alt={leadItem.cleanTitle || leadItem.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <ShoppingCart className="h-5 w-5 text-[#5b9637]" />
            )}
          </span>

          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[0.88rem] font-semibold tracking-[-0.01em]">
              View cart
            </span>
            <span className="text-[11px] text-white/90">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
          </span>

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </span>
        </Link>
      )}
    </div>
  );
}

export default FloatingCartButton;
