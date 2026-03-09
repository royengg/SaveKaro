import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { useFilterStore } from "@/store/filterStore";

interface LegalPageShellProps {
  title: string;
  summary: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalPageShell({
  title,
  summary,
  lastUpdated,
  children,
}: LegalPageShellProps) {
  const { resetFilters } = useFilterStore();

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

        <section className="rounded-2xl border bg-card p-5 md:p-8">
          <header className="border-b pb-5">
            <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {summary}
            </p>
            <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </header>

          <div className="space-y-7 pt-6 text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}

export default LegalPageShell;
