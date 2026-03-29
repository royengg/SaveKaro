import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ContentPageShell from "@/components/content/ContentPageShell";

const LAST_UPDATED = "March 30, 2026";

const GUIDE_LINKS = [
  {
    to: "/guides/how-to-tell-if-a-discount-is-actually-good",
    title: "How to tell if a discount is actually good",
    summary:
      "A straightforward way to judge whether a discounted price is genuinely strong or just dressed up to look better than it is.",
  },
  {
    to: "/guides/how-to-compare-coupons-bank-offers-and-cashback",
    title: "How to compare coupons, bank offers, and cashback",
    summary:
      "A practical way to compare stacked checkout offers without losing sight of the real payable price.",
  },
  {
    to: "/guides/best-fashion-deal-stores-in-india",
    title: "Best fashion deal stores in India",
    summary:
      "A practical look at the stores that are usually worth checking for clothing, shoes, accessories, and sale-season fashion drops.",
  },
] as const;

export default function Guides() {
  return (
    <ContentPageShell
      title="SaveKaro Guides"
      summary="A small set of practical guides for people who want to judge deals better, compare stores more clearly, and avoid getting distracted by flashy discount labels."
      eyebrow="Guides"
      lastUpdated={LAST_UPDATED}
      quickLinks={[{ to: "/guides", label: "Guides" }]}
    >
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-foreground">
          Start here
        </h2>
        <p>
          These are not daily articles or filler posts. They are simple,
          permanent guides meant to answer the questions that come up again and
          again when you are trying to decide whether a deal is actually worth
          your money.
        </p>
      </section>

      <section className="grid gap-3">
        {GUIDE_LINKS.map((guide, index) => (
          <Link
            key={guide.to}
            to={guide.to}
            className="group rounded-[24px] border bg-card p-4 transition-all hover:border-border hover:bg-secondary/28"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-full border bg-secondary/48 text-base font-semibold text-foreground/78">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                  {guide.title}
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {guide.summary}
                </p>
              </div>

              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background text-foreground/72 transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </section>
    </ContentPageShell>
  );
}
