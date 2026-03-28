import { lazy, Suspense, useEffect, useState } from "react";
import { CirclePlay, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const SaveKaroDemoPlayer = lazy(
  () => import("@/components/demo/SaveKaroDemoPlayer"),
);

export function DemoVideoDialog({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    syncPreference();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncPreference);
      return () => mediaQuery.removeEventListener("change", syncPreference);
    }

    mediaQuery.addListener(syncPreference);
    return () => mediaQuery.removeListener(syncPreference);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Watch demo"
          aria-label="Watch demo"
          className={cn(
            "h-10 rounded-full px-3 text-sm font-medium text-foreground/78 transition-colors duration-200 hover:text-foreground",
            className,
          )}
        >
          <span className="flex items-center justify-center">
            <CirclePlay className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
          </span>
          <span className="text-[13px] font-medium tracking-[-0.01em] sm:text-sm">
            Demo
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-[min(960px,calc(100vw-1rem))] gap-0 overflow-hidden rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,242,0.96))] p-0 shadow-[0_40px_100px_-48px_rgba(15,23,42,0.52)] supports-[backdrop-filter]:bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(250,247,242,0.9))]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(254,226,226,0.92),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(219,234,254,0.78),transparent_32%)]" />

        <div className="relative">
          <DialogHeader className="border-b border-black/6 px-5 py-4 text-left md:px-6 md:py-5">
            <DialogTitle className="text-lg font-semibold tracking-[-0.03em] text-foreground md:text-xl">
              How SaveKaro works
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4 pt-4 md:px-6 md:pb-6">
            <Suspense
              fallback={
                <div className="grid aspect-[16/9] w-full place-items-center rounded-[28px] border border-white/70 bg-[linear-gradient(135deg,#f8f3ec_0%,#f3eee7_100%)] text-center shadow-[0_24px_70px_-44px_rgba(15,23,42,0.45)]">
                  <div className="grid justify-items-center gap-3 text-foreground/68">
                    <Loader2 className="h-7 w-7 animate-spin" />
                    <span className="text-sm font-medium">Loading demo</span>
                  </div>
                </div>
              }
            >
              {open ? (
                <SaveKaroDemoPlayer
                  autoPlay={!prefersReducedMotion}
                  loop={!prefersReducedMotion}
                />
              ) : null}
            </Suspense>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DemoVideoDialog;
