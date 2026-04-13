import { BellRing, BookmarkCheck, LogIn, Trophy } from "lucide-react";
import SaveKaroMark from "@/components/brand/SaveKaroMark";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface GuestEntryDialogProps {
  open: boolean;
  onBrowseGuest: () => void;
  onLogin: () => void;
}

export function GuestEntryDialog({
  open,
  onBrowseGuest,
  onLogin,
}: GuestEntryDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] border-none bg-transparent p-0 shadow-none sm:max-w-[32rem]"
      >
        <div className="surface-liquid-glass relative max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[30px] border-white/70 bg-white/78 p-0 shadow-[0_36px_80px_-34px_rgba(15,23,42,0.42)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/68">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.98),rgba(255,255,255,0.38)_38%,transparent_70%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_34%)]" />

          <div className="relative p-4 sm:p-6">
            <div className="mb-4 flex items-start gap-3 sm:mb-5">
              <div className="surface-liquid-chip flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] sm:h-14 sm:w-14 sm:rounded-[20px]">
                <SaveKaroMark className="h-8 w-8 drop-shadow-sm sm:h-9 sm:w-9" />
              </div>
              <div className="min-w-0 pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">
                  Welcome To SaveKaro
                </p>
                <DialogTitle className="mt-1 text-[1.55rem] font-semibold leading-[1.02] tracking-[-0.035em] text-foreground sm:text-[1.95rem]">
                  Browse now or sign in for the full experience.
                </DialogTitle>
              </div>
            </div>

            <DialogDescription className="max-w-[30rem] text-[14px] leading-6 text-foreground/72 sm:text-[15px]">
              We recommend you to sign in so that you can save deals, get price
              alerts, notifications and submit deals to climb the leaderboard.
            </DialogDescription>

            <div className="mt-3 flex flex-nowrap gap-1.5 sm:mt-5 sm:gap-2">
              <span className="surface-liquid-chip inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-foreground/80 sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[12px]">
                <BookmarkCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Save deals
              </span>
              <span className="surface-liquid-chip inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-foreground/80 sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[12px]">
                <BellRing className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Price alerts
              </span>
              <span className="surface-liquid-chip inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium text-foreground/80 sm:h-9 sm:gap-1.5 sm:px-3 sm:text-[12px]">
                <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Leaderboard
              </span>
            </div>

            <div className="mt-5 grid gap-2.5 sm:mt-6 sm:grid-cols-2">
              <Button
                type="button"
                onClick={onLogin}
                className="h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background shadow-[0_24px_34px_-26px_rgba(15,23,42,0.45)] transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-[1px] hover:bg-foreground/92 active:scale-[0.985] sm:h-12 sm:text-[15px]"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={onBrowseGuest}
                className="surface-liquid-chip h-11 rounded-full px-5 text-sm font-semibold text-foreground/82 transition-[transform,color,background-color,box-shadow] duration-200 hover:-translate-y-[1px] hover:text-foreground active:scale-[0.985] sm:h-12 sm:text-[15px]"
              >
                Browse as guest
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GuestEntryDialog;
