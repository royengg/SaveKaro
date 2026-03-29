import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { useFilterStore } from "@/store/filterStore";
import { cn } from "@/lib/utils";
import { usePageMeta } from "@/hooks/usePageMeta";

interface ContentQuickLink {
  to: string;
  label: string;
}

interface ContentPageShellProps {
  title: string;
  summary: string;
  eyebrow?: string;
  lastUpdated?: string;
  canonicalPath?: string;
  quickLinks?: ContentQuickLink[];
  children: ReactNode;
}

export function ContentPageShell({
  title,
  summary,
  eyebrow,
  lastUpdated,
  canonicalPath,
  quickLinks = [],
  children,
}: ContentPageShellProps) {
  const { resetFilters } = useFilterStore();
  usePageMeta({ title, description: summary, canonicalPath });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-24 md:pb-10">
        <Link
          to="/"
          onClick={resetFilters}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Deals
        </Link>

        <section className="rounded-[28px] border bg-card p-5 md:p-8">
          {quickLinks.length > 0 ? (
            <nav className="mb-5 flex flex-wrap gap-2 border-b pb-5">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-full border bg-secondary/55 px-3.5 text-sm font-medium text-foreground/78 transition-all hover:border-border hover:bg-secondary/80 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : null}

          <header className="border-b pb-5">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="mt-2 text-2xl font-bold tracking-[-0.03em] md:text-3xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
              {summary}
            </p>
            {lastUpdated ? (
              <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            ) : null}
          </header>

          <div className="space-y-7 pt-6 text-sm leading-relaxed text-foreground/90 md:text-[15px] [overflow-wrap:anywhere]">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}

export default ContentPageShell;
