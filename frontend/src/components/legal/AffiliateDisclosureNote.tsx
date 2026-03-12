import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AffiliateDisclosureNoteProps {
  className?: string;
  tone?: "default" | "inverse";
  compact?: boolean;
}

const AFFILIATE_DISCLOSURE_TEXT =
  "Some links may be affiliate links (currently Amazon only); we may earn a commission at no extra cost to you.";

export function AffiliateDisclosureNote({
  className,
  tone = "default",
  compact = false,
}: AffiliateDisclosureNoteProps) {
  const isInverse = tone === "inverse";

  return (
    <p
      className={cn(
        "flex min-w-0 items-start gap-1.5 leading-relaxed [overflow-wrap:anywhere]",
        compact ? "text-[11px]" : "text-xs",
        isInverse ? "text-white/80" : "text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-[1px] h-3.5 w-3.5 shrink-0" />
      <span>
        {AFFILIATE_DISCLOSURE_TEXT}{" "}
        <Link
          to="/affiliate-disclosure"
          aria-label="Read full affiliate disclosure"
          title="Read full affiliate disclosure"
          onClick={(event) => {
            event.stopPropagation();
          }}
          onMouseDown={(event) => {
            event.stopPropagation();
          }}
          onTouchStart={(event) => {
            event.stopPropagation();
          }}
          className={cn(
            "font-medium underline underline-offset-2",
            isInverse ? "text-white" : "text-foreground",
          )}
        >
          Read full affiliate disclosure
        </Link>
        .
      </span>
    </p>
  );
}

export default AffiliateDisclosureNote;
