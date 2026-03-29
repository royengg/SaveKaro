import { lazy, Suspense, useEffect, useState } from "react";
import { CirclePlay, Loader2 } from "lucide-react";
import {
  GUIDE_MOTION_CONFIG,
  type GuideMotionId,
} from "@/components/guides/guideMotionData";

const GuideMotionPlayer = lazy(
  () => import("@/components/guides/GuideMotionPlayer"),
);

export default function GuideMotionSection({
  guideId,
}: {
  guideId: GuideMotionId;
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const config = GUIDE_MOTION_CONFIG[guideId];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    syncPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncPreference);
      return () => mediaQuery.removeEventListener("change", syncPreference);
    }

    mediaQuery.addListener(syncPreference);
    return () => mediaQuery.removeListener(syncPreference);
  }, []);

  return (
    <section className="space-y-4 rounded-[28px] border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,242,0.96))] p-4 shadow-[0_24px_70px_-52px_rgba(15,23,42,0.34)] md:p-5">
      <div className="space-y-2">
        <div className="inline-flex h-9 items-center gap-2 rounded-full border bg-secondary/55 px-3 text-sm font-medium text-foreground/78">
          <CirclePlay className="h-4 w-4" />
          Motion summary
        </div>
        <h2 className="text-base font-semibold text-foreground md:text-lg">
          Watch the quick version
        </h2>
      </div>

      <Suspense
        fallback={
          <div className="grid aspect-video w-full place-items-center rounded-[28px] border border-white/75 bg-[linear-gradient(135deg,#f8f3ec_0%,#f3eee7_100%)] text-center shadow-[0_24px_70px_-50px_rgba(15,23,42,0.34)]">
            <div className="grid justify-items-center gap-3 text-foreground/68">
              <Loader2 className="h-7 w-7 animate-spin" />
              <span className="text-sm font-medium">
                Loading {config.eyebrow.toLowerCase()} summary
              </span>
            </div>
          </div>
        }
      >
        <GuideMotionPlayer
          guideId={guideId}
          autoPlay={!prefersReducedMotion}
          loop={!prefersReducedMotion}
        />
      </Suspense>
    </section>
  );
}
