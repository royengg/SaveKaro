import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFilterStore } from "@/store/filterStore";

const STORES = ["Amazon", "Myntra", "Ajio", "Nykaa", "Croma"];

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Top-nav filter dialog — shows ONLY platform/store selection */
export function FilterDialog({ open, onOpenChange }: FilterDialogProps) {
  const { store, setStore } = useFilterStore();
  const chipClass = (active: boolean) =>
    [
      "motion-filter-chip inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:scale-[0.97]",
      active
        ? "motion-filter-chip-active border-primary/25 bg-primary text-primary-foreground shadow-[0_14px_24px_-18px_rgba(124,58,237,0.62)]"
        : "border-border bg-background text-foreground hover:-translate-y-[1px] hover:border-border/80 hover:bg-secondary/70",
    ].join(" ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden rounded-[24px] border-border/70 bg-background/98 p-0 shadow-[0_28px_64px_-28px_rgba(15,23,42,0.35)] backdrop-blur supports-[backdrop-filter]:bg-background/94">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Platform</DialogTitle>
            {store && (
              <Button
                variant="ghost"
                size="sm"
                className="transition-[transform,background-color] duration-200 hover:-translate-y-[1px] active:scale-[0.97]"
                onClick={() => setStore(null)}
              >
                Clear
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {STORES.map((s) => (
              <button
                type="button"
                key={s}
                className={chipClass(store === s)}
                onClick={() => {
                  setStore(store === s ? null : s);
                  onOpenChange(false);
                }}
              >
                {store === s && <Check className="h-3 w-3 mr-1.5" />}
                {s}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FilterDialog;
