import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDealCartStore } from "@/store/dealCartStore";
import { useUiStore } from "@/store/uiStore";

export function FloatingCartButton() {
  const location = useLocation();
  const items = useDealCartStore((state) => state.items);
  const { isHomeChromeScrolling } = useUiStore();
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
  const [isCartRefreshing, setIsCartRefreshing] = useState(false);
  const hasMountedRef = useRef(false);
  const previousItemCountRef = useRef(itemCount);
  const previousLeadItemIdRef = useRef<string | null>(leadItem?.id ?? null);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousItemCountRef.current = itemCount;
      previousLeadItemIdRef.current = leadItem?.id ?? null;
      return;
    }

    if (itemCount === 0) {
      setIsCartRefreshing(false);
      previousItemCountRef.current = 0;
      previousLeadItemIdRef.current = null;
      return;
    }

    const hadItemsBefore = previousItemCountRef.current > 0;
    const didCartChange =
      previousItemCountRef.current !== itemCount ||
      previousLeadItemIdRef.current !== (leadItem?.id ?? null);

    previousItemCountRef.current = itemCount;
    previousLeadItemIdRef.current = leadItem?.id ?? null;

    if (!hadItemsBefore || !didCartChange) {
      setIsCartRefreshing(false);
      return;
    }

    setIsCartRefreshing(true);
    const timeoutId = window.setTimeout(() => {
      setIsCartRefreshing(false);
    }, 360);

    return () => window.clearTimeout(timeoutId);
  }, [itemCount, leadItem?.id]);

  if (hiddenPaths.has(location.pathname)) {
    return null;
  }

  const shouldDimOnHomeScroll =
    location.pathname === "/" && isHomeChromeScrolling;

  return (
    <div
      className={cn(
        "motion-home-bottom-chrome pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+12px)] z-50 flex justify-center px-4 md:inset-x-auto md:right-8 md:bottom-8 md:px-0",
        shouldDimOnHomeScroll
          ? "translate-y-0 opacity-[0.72] md:translate-y-0 md:opacity-100"
          : "translate-y-0 opacity-100",
      )}
    >
      {itemCount === 0 ? (
        <Link
          to="/cart"
          className="group/cart motion-cart-entry pointer-events-auto flex items-center gap-2 rounded-full border border-[#d10021] bg-[#E60023] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_14px_28px_-18px_rgba(230,0,35,0.6),0_8px_14px_-12px_rgba(15,23,42,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#d70021] hover:shadow-[0_16px_30px_-18px_rgba(230,0,35,0.64),0_10px_16px_-12px_rgba(15,23,42,0.26)] active:scale-[0.98]"
          aria-label="Open cart"
          title="Cart"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/12 transition-transform duration-300 group-hover/cart:scale-105">
            <ShoppingCart className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="transition-transform duration-300 group-hover/cart:translate-x-0.5">
            Cart
          </span>
        </Link>
      ) : (
        <Link
          to="/cart"
          className={cn(
            "group/cart motion-cart-entry pointer-events-auto flex min-h-[54px] w-[min(240px,calc(100vw-8rem))] items-center gap-2 rounded-full border border-[#E60023] bg-[#E60023] px-2 py-1.5 text-white shadow-[0_22px_48px_-24px_rgba(230,0,35,0.56)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#cf0020] active:scale-[0.985] md:w-[276px]",
            isCartRefreshing && "motion-cart-pulse",
          )}
          aria-label={`Open cart with ${itemCount} deal${itemCount === 1 ? "" : "s"}`}
          title="Cart"
        >
          <span
            key={leadItem?.id ?? "cart-thumb"}
            className={cn(
              "motion-cart-thumb-pop flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/85 bg-white shadow-sm transition-transform duration-300 group-hover/cart:scale-105",
            )}
          >
            {leadItem?.imageUrl ? (
              <img
                src={leadItem.imageUrl}
                alt={leadItem.cleanTitle || leadItem.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover/cart:scale-110"
                loading="lazy"
              />
            ) : (
              <ShoppingCart className="h-5 w-5 text-[#5b9637]" />
            )}
          </span>

          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[0.88rem] font-semibold tracking-[-0.01em] transition-transform duration-300 group-hover/cart:translate-x-0.5">
              View cart
            </span>
            <span
              key={`cart-count-${itemCount}`}
              className="motion-cart-count-pop text-[11px] text-white/90"
            >
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
          </span>

          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform duration-300 group-hover/cart:translate-x-0.5 group-hover/cart:scale-105">
            <ArrowRight className="h-4 w-4 stroke-[2.5]" />
          </span>
        </Link>
      )}
    </div>
  );
}

export default FloatingCartButton;
