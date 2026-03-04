import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFilterStore } from "@/store/filterStore";

const STORES = [
  "Amazon",
  "Flipkart",
  "Myntra",
  "Ajio",
  "Nykaa",
  "Croma",
  "Tata",
];

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Top-nav filter dialog — shows ONLY platform/store selection */
export function FilterDialog({ open, onOpenChange }: FilterDialogProps) {
  const { store, setStore } = useFilterStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Platform</DialogTitle>
            {store && (
              <Button variant="ghost" size="sm" onClick={() => setStore(null)}>
                Clear
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {STORES.map((s) => (
              <Badge
                key={s}
                variant={store === s ? "default" : "outline"}
                className="cursor-pointer py-2 px-4 text-sm rounded-full"
                onClick={() => {
                  setStore(store === s ? null : s);
                  onOpenChange(false);
                }}
              >
                {store === s && <Check className="h-3 w-3 mr-1.5" />}
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FilterDialog;
