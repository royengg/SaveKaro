import {
  ExternalLink,
  Store,
  CheckCircle2,
  Users,
  LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealActionButtons } from "./DealActionButtons";
import AffiliateDisclosureNote from "@/components/legal/AffiliateDisclosureNote";
import { getCurrencySymbol } from "@/lib/currency";

interface DealDetailSidebarProps {
  dealPrice: number | null;
  originalPrice: number | null;
  currency: string;
  affiliateUrl: string | null | undefined;
  productUrl: string;
  upvoteCount: number;
  userUpvote: number | null | undefined;
  isSaved: boolean;
  isInCart: boolean;
  pricePoints: number[];
  latestTrackedPrice: number | null;
  lowestTrackedPrice: number | null;
  trackerDelta: number | null;
  priceHistoryCount: number;
  shouldLoadSecondaryContent: boolean;
  onVote: () => void;
  onSave: () => void;
  onCartToggle: () => void;
  onShare: () => void;
  onVisitStore: () => void;
}

export function DealDetailSidebar({
  dealPrice,
  originalPrice,
  currency,
  affiliateUrl,
  productUrl,
  upvoteCount,
  userUpvote,
  isSaved,
  isInCart,
  pricePoints,
  latestTrackedPrice,
  lowestTrackedPrice,
  trackerDelta,
  priceHistoryCount,
  shouldLoadSecondaryContent,
  onVote,
  onSave,
  onCartToggle,
  onShare,
  onVisitStore,
}: DealDetailSidebarProps) {
  const locale = currency === "INR" ? "en-IN" : "en-US";

  const formatMoney = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "N/A";
    return `${getCurrencySymbol(currency)}${value.toLocaleString(locale)}`;
  };

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 rounded-2xl border bg-card p-5 shadow-sm space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Best current price
          </p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">
            {dealPrice ? formatMoney(dealPrice) : "Check store price"}
          </p>
          {originalPrice && originalPrice > (dealPrice ?? 0) && (
            <p className="text-sm text-muted-foreground line-through mt-1">
              {formatMoney(originalPrice)}
            </p>
          )}
        </div>

        <a
          href={affiliateUrl ?? productUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onVisitStore}
          className="block"
        >
          <Button size="lg" className="w-full gap-2 text-base">
            Visit Store
            <ExternalLink className="h-4 w-4" />
          </Button>
        </a>
        <AffiliateDisclosureNote />

        <DealActionButtons
          upvoteCount={upvoteCount}
          userUpvote={userUpvote}
          isSaved={isSaved}
          isInCart={isInCart}
          onVote={onVote}
          onSave={onSave}
          onCartToggle={onCartToggle}
          onShare={onShare}
        />

        <div className="rounded-xl border bg-secondary/40 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Trust cues
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center gap-2 text-foreground/90">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Community-verified engagement signals.
            </div>
            <div className="flex items-center gap-2 text-foreground/90">
              <Store className="h-4 w-4 text-primary" />
              Direct redirect to official merchant listing.
            </div>
            <div className="flex items-center gap-2 text-foreground/90">
              <Users className="h-4 w-4 text-sky-600" />
              Submitted and tracked by SaveKaro users.
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-secondary/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
              <LineChart className="h-3.5 w-3.5" />
              Price summary
            </p>
            <span className="text-xs text-muted-foreground">
              {priceHistoryCount} pts
            </span>
          </div>

          {pricePoints.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg bg-background/80 p-2">
                <p className="text-[11px] text-muted-foreground">
                  Latest
                </p>
                <p className="font-semibold">
                  {formatMoney(latestTrackedPrice)}
                </p>
              </div>
              <div className="rounded-lg bg-background/80 p-2">
                <p className="text-[11px] text-muted-foreground">
                  Lowest
                </p>
                <p className="font-semibold">
                  {formatMoney(lowestTrackedPrice)}
                </p>
              </div>
              <div className="rounded-lg bg-background/80 p-2 col-span-2">
                <p className="text-[11px] text-muted-foreground">
                  Movement
                </p>
                <p className="font-semibold">
                  {trackerDelta !== null
                    ? `${trackerDelta > 0 ? "+" : ""}${formatMoney(trackerDelta).replace(getCurrencySymbol(currency), "")}`
                    : "N/A"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {shouldLoadSecondaryContent
                ? "No tracked history yet for this deal."
                : "Scroll to load full history and chart."}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
