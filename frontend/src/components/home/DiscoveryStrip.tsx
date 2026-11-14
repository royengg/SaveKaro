import { Heart } from "lucide-react";
import { PicksIcon, TrendIcon, DropsIcon } from "@/components/home/DiscoveryIcons";
import "./discovery-strip.css";

export type DiscoveryPresetKey = "today" | "trending" | "drops" | "liked";

interface DiscoveryStripProps {
  isTodayPicks: boolean;
  isTrendingStores: boolean;
  isBigDrops: boolean;
  isBecauseYouLikedThis: boolean;
  hasLikedSignals: boolean;
  onPreset: (preset: DiscoveryPresetKey) => void;
}

const presets = [
  { key: "today", label: "Today's picks", ariaLabel: "Show today's picks", Icon: PicksIcon },
  { key: "trending", label: "Trending stores", ariaLabel: "Show trending stores deals", Icon: TrendIcon },
  { key: "drops", label: "Big drops", ariaLabel: "Show big drops", Icon: DropsIcon },
  { key: "liked", label: "Because you liked this", ariaLabel: "Show recommendations based on deals you liked", Icon: Heart },
] as const;

export function DiscoveryStrip({
  isTodayPicks,
  isTrendingStores,
  isBigDrops,
  isBecauseYouLikedThis,
  hasLikedSignals,
  onPreset,
}: DiscoveryStripProps) {
  const selected: Record<DiscoveryPresetKey, boolean> = {
    today: isTodayPicks,
    trending: isTrendingStores,
    drops: isBigDrops,
    liked: isBecauseYouLikedThis,
  };

  return (
    <div className="px-3 py-1.5 md:px-8 md:py-2">
      <div className="-mx-1 -my-2 flex snap-x snap-proximity scroll-px-3 items-center gap-2 overflow-x-auto overscroll-x-contain px-1 py-2 scrollbar-hide">
        {presets.map(({ key, label, ariaLabel, Icon }) => {
          const disabled = key === "liked" && !hasLikedSignals;
          return (
            <button
              key={key}
              type="button"
              className="deal-action discovery-pill"
              data-preset={key}
              aria-pressed={selected[key]}
              aria-label={ariaLabel}
              disabled={disabled}
              title={disabled ? "Save or upvote deals to unlock recommendations" : label}
              onClick={() => onPreset(key)}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
