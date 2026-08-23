import { ArrowLeft } from "lucide-react";
import { Link, type To } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageBackButtonProps {
  to?: To;
  onClick?: () => void;
  className?: string;
}

const backButtonClassName =
  "surface-page-back inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-[transform,color,background-color,box-shadow] duration-200 hover:-translate-y-[1px] hover:bg-white hover:text-foreground hover:shadow-[0_10px_20px_-14px_rgba(15,23,42,0.4),0_1px_4px_rgba(15,23,42,0.08)] active:scale-[0.98]";

function BackButtonContent() {
  return (
    <>
      <ArrowLeft className="h-3.5 w-3.5" />
      Back
    </>
  );
}

export function PageBackButton({
  to,
  onClick,
  className,
}: PageBackButtonProps) {
  const combinedClassName = cn(backButtonClassName, className);

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={combinedClassName}>
        <BackButtonContent />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={combinedClassName}>
      <BackButtonContent />
    </button>
  );
}
