import { cn } from "@/lib/utils";

export function SearchPromptOverlay({
  prompt,
  promptKey,
  className,
  textClassName,
}: {
  prompt: string;
  promptKey: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-1/2 -translate-y-1/2 overflow-hidden text-muted-foreground/88 transition-opacity duration-150 peer-focus:opacity-0",
        className,
      )}
    >
      <span
        key={promptKey}
        className={cn(
          "motion-search-prompt-rise block whitespace-nowrap",
          textClassName,
        )}
      >
        {prompt}
      </span>
    </span>
  );
}
