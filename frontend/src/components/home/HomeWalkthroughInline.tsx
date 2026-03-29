import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const HomeWalkthroughPlayer = lazy(
  () => import("@/components/home/HomeWalkthroughPlayer"),
);

export default function HomeWalkthroughInline({
  className,
  unbounded = false,
}: {
  className?: string;
  unbounded?: boolean;
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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
    <section
      className={cn(
        "mb-6",
        unbounded
          ? "w-full"
          : "mx-auto w-full max-w-[1120px] lg:max-w-[980px] xl:max-w-[920px]",
        className,
      )}
    >
      <Suspense
        fallback={
          <div className="grid aspect-[16/9] w-full place-items-center rounded-[30px] border border-white/80 bg-[linear-gradient(135deg,#f8f3ec_0%,#f3eee7_100%)] shadow-[0_28px_90px_-54px_rgba(15,23,42,0.35)]">
            <div className="grid justify-items-center gap-3 text-foreground/65">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          </div>
        }
      >
        <HomeWalkthroughPlayer
          autoPlay={!prefersReducedMotion}
          loop={!prefersReducedMotion}
        />
      </Suspense>
    </section>
  );
}
