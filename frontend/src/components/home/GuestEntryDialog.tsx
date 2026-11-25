import { useRef } from "react";
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
  const titleRef = useRef<HTMLHeadingElement>(null);

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          if (titleRef.current) {
            event.preventDefault();
            titleRef.current.focus({ preventScroll: true });
          }
        }}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-[28px] border-0 bg-card px-6 pt-7 pb-5 text-center shadow-[0_24px_60px_-16px_rgba(0,0,0,0.32),0_8px_20px_-12px_rgba(0,0,0,0.24)] motion-reduce:animate-none sm:max-w-[26rem] sm:px-8 sm:pt-8 sm:pb-6 [@media(max-height:400px)]:py-3"
      >
        <div className="mx-auto mb-[18px] grid size-14 place-items-center rounded-[18px] bg-rose-50 dark:bg-rose-400/12 [@media(max-height:400px)]:mb-2.5 [@media(max-height:400px)]:size-11">
          <SaveKaroMark className="size-10 [@media(max-height:400px)]:size-8" />
        </div>

        <DialogTitle
          ref={titleRef}
          tabIndex={-1}
          className="text-balance text-[1.5rem] leading-[1.12] font-semibold tracking-[-0.035em] text-card-foreground outline-none sm:text-[1.75rem]"
        >
          Welcome to SaveKaro
        </DialogTitle>

        <DialogDescription className="mx-auto mt-2 max-w-[18rem] text-pretty text-[15px] leading-[1.5] [@media(max-height:400px)]:mt-1">
          Sign in to save deals, get price alerts, and share your finds.
        </DialogDescription>

        <div className="mt-6 grid gap-1.5 [@media(max-height:400px)]:mt-3 [@media(max-height:400px)]:gap-1">
          <Button
            type="button"
            onClick={onLogin}
            className="h-12 rounded-2xl bg-foreground px-4 text-[15px] font-semibold text-background transition-[background-color,scale] duration-150 hover:bg-foreground/88 motion-safe:active:scale-[0.96]"
          >
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={onBrowseGuest}
            className="h-11 rounded-2xl px-4 text-[14px] text-muted-foreground transition-[color,background-color,scale] duration-150 hover:text-foreground motion-safe:active:scale-[0.96]"
          >
            Browse as guest
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default GuestEntryDialog;
