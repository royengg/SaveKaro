import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AffiliateDisclosureNoteProps {
  className?: string;
  tone?: "default" | "inverse";
  compact?: boolean;
  variant?: "full" | "pill";
}

const AFFILIATE_DISCLOSURE_TEXT =
  "Some links may be affiliate links (currently Amazon only); we may earn a commission at no extra cost to you.";

export function AffiliateDisclosureNote({
  className,
  tone = "default",
  compact = false,
  variant = "full",
}: AffiliateDisclosureNoteProps) {
  const isInverse = tone === "inverse";
  const disclosureLinkClassName = cn(
    "font-medium underline underline-offset-2",
    isInverse ? "text-white" : "text-foreground",
  );

  if (variant === "pill") {
    return (
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
          "inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium transition-[transform,background-color,color] duration-200 hover:-translate-y-[1px]",
          isInverse
            ? "bg-black/45 text-white/88 hover:bg-black/55"
            : "bg-black/[0.04] text-muted-foreground hover:bg-black/[0.06] hover:text-foreground",
          className,
        )}
      >
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Affiliate disclosure</span>
      </Link>
    );
  }

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
          className={disclosureLinkClassName}
        >
          Read full affiliate disclosure
        </Link>
        .
      </span>
    </p>
  );
}

export default AffiliateDisclosureNote;
