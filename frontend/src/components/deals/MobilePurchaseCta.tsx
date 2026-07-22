import { createPortal } from "react-dom";
import { ExternalLink } from "lucide-react";

interface MobilePurchaseCtaProps {
  href: string;
  onClick: () => void;
  hidden: boolean;
}

export function MobilePurchaseCta({
  href,
  onClick,
  hidden,
}: MobilePurchaseCtaProps) {
  if (hidden || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom)+14px)] z-[70] flex justify-center px-4 lg:hidden">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="group pointer-events-auto inline-flex min-h-12 w-[min(282px,calc(100vw-3.25rem))] items-center justify-center gap-2 rounded-full border border-[#c7001f] bg-[#e60023] px-5 text-[15px] font-semibold tracking-[-0.01em] text-white shadow-[0_10px_24px_-22px_rgba(230,0,35,0.24)] transition-[background-color,box-shadow,opacity] duration-200 hover:bg-[#d10020] hover:shadow-[0_12px_26px_-22px_rgba(230,0,35,0.28)] active:opacity-95"
      >
        <span>Visit Store</span>
        <ExternalLink className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
      </a>
    </div>,
    document.body,
  );
}
