import { Link } from "react-router-dom";
import { PageBackButton } from "@/components/navigation/PageBackButton";
import {
  ArrowLeft,
  ExternalLink,
  ShoppingCart,
  Trash2,
  PackageSearch,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { useDealCartStore } from "@/store/dealCartStore";
import { useFilterStore } from "@/store/filterStore";
import { useTrackClick } from "@/hooks/useDeals";

import { getCurrencySymbol } from "@/lib/currency";
import { captureEvent, getDealEventProperties } from "@/lib/analytics/events";

export default function Cart() {
  const items = useDealCartStore((state) => state.items);
  const removeDeal = useDealCartStore((state) => state.removeDeal);
  const clearCart = useDealCartStore((state) => state.clearCart);
  const { resetFilters } = useFilterStore();
  const trackClick = useTrackClick();

  const handleClearCart = () => {
    if (!window.confirm(`Remove all ${items.length} deals from your cart? This cannot be undone.`)) return;
    const previousItemCount = items.length;
    clearCart();
    captureEvent("cart:clear", { previous_item_count: previousItemCount });
  };

  const handleRemoveDeal = (item: (typeof items)[number]) => {
    removeDeal(item.id);
    captureEvent("cart:item_change", {
      ...getDealEventProperties(
        { ...item, source: item.source ?? "unknown" },
        "cart",
      ),
      action: "remove",
      cart_item_count: useDealCartStore.getState().items.length,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-10">
        <PageBackButton to="/" onClick={resetFilters} className="mb-6" />

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">Your Cart</h1>
                <p className="text-sm text-muted-foreground md:text-base">
                  Keep deals you plan to buy and jump back to the merchant when
                  you are ready.
                </p>
              </div>
            </div>
          </div>

          {items.length > 0 ? (
            <Button variant="outline" onClick={handleClearCart} className="gap-2 self-start">
              <Trash2 className="h-4 w-4" />
              Clear cart
            </Button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border bg-card px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <PackageSearch className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold">Your cart is empty</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Open any deal detail page and use the cart button to keep products
              you want to revisit before buying.
            </p>
            <Link to="/" onClick={resetFilters} className="mt-6 inline-flex">
              <Button className="cta-dark-pill h-10 px-4 text-[15px] font-semibold">
                <span className="cta-dark-pill-icon">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
                Browse deals
              </Button>
            </Link>
          </div>
        ) : (
          <div>
            <section className="space-y-4">
              {items.map((item) => {
                const dealPrice = item.dealPrice ? Number.parseFloat(item.dealPrice) : null;
                const originalPrice = item.originalPrice
                  ? Number.parseFloat(item.originalPrice)
                  : null;

                return (
                  <article
                    key={item.id}
                    className="overflow-hidden rounded-3xl border bg-card shadow-sm"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
                      <Link
                        to={`/deal/${item.id}`}
                        className="block shrink-0 overflow-hidden rounded-2xl bg-secondary sm:w-36"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.cleanTitle || item.title}
                            className="h-44 w-full object-cover sm:h-36"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-44 items-center justify-center bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 sm:h-36">
                            <span className="text-5xl">{getCategoryIcon(item.category)}</span>
                          </div>
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">{item.category.name}</Badge>
                              {item.store ? (
                                <Badge variant="outline" className="gap-1">
                                  <Store className="h-3 w-3" />
                                  {item.store}
                                </Badge>
                              ) : null}
                              {item.discountPercent ? (
                                <Badge className="bg-emerald-500 hover:bg-emerald-600">
                                  {item.discountPercent}% OFF
                                </Badge>
                              ) : null}
                            </div>

                            <Link to={`/deal/${item.id}`}>
                              <h2 className="text-lg font-semibold leading-snug hover:text-primary">
                                {item.cleanTitle || item.title}
                              </h2>
                            </Link>

                            <div className="flex flex-wrap items-end gap-2">
                              {dealPrice !== null ? (
                                <span className="text-2xl font-bold text-emerald-600">
                                  {getCurrencySymbol(item.currency)}
                                  {dealPrice.toLocaleString(
                                    item.currency === "INR" ? "en-IN" : "en-US",
                                  )}
                                </span>
                              ) : (
                                <span className="font-medium">Check latest price</span>
                              )}

                              {originalPrice !== null &&
                              originalPrice > (dealPrice ?? 0) ? (
                                <span className="text-sm text-muted-foreground line-through">
                                  {getCurrencySymbol(item.currency)}
                                  {originalPrice.toLocaleString(
                                    item.currency === "INR" ? "en-IN" : "en-US",
                                  )}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => handleRemoveDeal(item)}
                            title="Remove from cart"
                            aria-label="Remove from cart"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link to={`/deal/${item.id}`}>
                            <Button variant="outline">View details</Button>
                          </Link>

                          <a
                            href={item.affiliateUrl ?? item.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              captureEvent("deal:merchant_click_intent", {
                                ...getDealEventProperties(
                                  {
                                    ...item,
                                    source: item.source ?? "unknown",
                                  },
                                  "cart",
                                ),
                              });
                              trackClick.mutate(item.id);
                            }}
                          >
                            <Button className="gap-2">
                              Visit Store
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

          </div>
        )}
      </main>
    </div>
  );
}
