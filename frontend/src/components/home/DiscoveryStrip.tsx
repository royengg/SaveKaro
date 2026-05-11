import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { PicksIcon, TrendIcon, DropsIcon } from "@/components/home/DiscoveryIcons";

export type DiscoveryPresetKey = "today" | "trending" | "drops" | "liked";

interface DiscoveryStripProps {
  isTodayPicks: boolean;
  isTrendingStores: boolean;
  isBigDrops: boolean;
  isBecauseYouLikedThis: boolean;
  hasLikedSignals: boolean;
  onPreset: (preset: DiscoveryPresetKey) => void;
}

export function DiscoveryStrip({
  isTodayPicks,
  isTrendingStores,
  isBigDrops,
  isBecauseYouLikedThis,
  hasLikedSignals,
  onPreset,
}: DiscoveryStripProps) {
  return (
    <div className="border-t border-border/60 bg-gradient-to-r from-amber-50/45 via-background to-rose-50/40 px-3 py-1.5 md:px-8 md:py-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <span
          className="motion-discover-label shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90 md:text-[11px]"
          style={{ animationDelay: "20ms" }}
        >
          Discover
        </span>

        <button
          onClick={() => onPreset("today")}
          className={cn(
            "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
            isTodayPicks
              ? "motion-pill-active bg-amber-200/30 border-amber-300/60 text-foreground shadow-[0_14px_22px_-20px_rgba(245,158,11,0.85)]"
              : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
          )}
          style={{ animationDelay: "70ms" }}
          aria-label="Show today's picks"
          title="Today's picks"
        >
          <PicksIcon className="h-3.5 w-3.5" />
          Today's picks
        </button>

        <button
          onClick={() => onPreset("trending")}
          className={cn(
            "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
            isTrendingStores
              ? "motion-pill-active bg-sky-200/30 border-sky-300/60 text-foreground shadow-[0_14px_22px_-20px_rgba(14,165,233,0.78)]"
              : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
          )}
          style={{ animationDelay: "120ms" }}
          aria-label="Show trending stores deals"
          title="Trending stores"
        >
          <TrendIcon className="h-3.5 w-3.5" />
          Trending stores
        </button>

        <button
          onClick={() => onPreset("drops")}
          className={cn(
            "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
            isBigDrops
              ? "motion-pill-active bg-emerald-200/35 border-emerald-300/60 text-foreground shadow-[0_14px_22px_-20px_rgba(16,185,129,0.8)]"
              : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
          )}
          style={{ animationDelay: "170ms" }}
          aria-label="Show big drops"
          title="Big drops"
        >
          <DropsIcon className="h-3.5 w-3.5" />
          Big drops
        </button>

        <button
          onClick={() => onPreset("liked")}
          disabled={!hasLikedSignals}
          className={cn(
            "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
            isBecauseYouLikedThis
              ? "motion-pill-active bg-rose-200/35 border-rose-300/70 text-foreground shadow-[0_14px_22px_-20px_rgba(244,114,182,0.82)]"
              : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
            !hasLikedSignals &&
              "cursor-not-allowed opacity-60 hover:text-muted-foreground",
          )}
          style={{ animationDelay: "220ms" }}
          aria-label="Show recommendations based on deals you liked"
          title={
            hasLikedSignals
              ? "Because you liked this"
              : "Save or upvote deals to unlock recommendations"
          }
        >
          <Heart className="h-3.5 w-3.5" />
          Because you liked this
        </button>
      </div>
    </div>
  );
}
