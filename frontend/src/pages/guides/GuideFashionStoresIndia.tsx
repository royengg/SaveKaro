import ContentPageShell from "@/components/content/ContentPageShell";
import GuideMotionSection from "@/components/guides/GuideMotionSection";

const LAST_UPDATED = "March 30, 2026";
const QUICK_LINKS = [
  { to: "/guides", label: "Guides" },
  { to: "/guides/how-to-tell-if-a-discount-is-actually-good", label: "Discount Quality" },
  {
    to: "/guides/how-to-compare-coupons-bank-offers-and-cashback",
    label: "Offers and Cashback",
  },
  { to: "/guides/best-fashion-deal-stores-in-india", label: "Fashion Stores" },
];

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

export default function GuideFashionStoresIndia() {
  return (
    <ContentPageShell
      title="Best fashion deal stores in India"
      summary="The best fashion deal store depends on what you are buying. Some stores are better for mainstream brands, some for fast seasonal drops, and some for clearance-led value."
      eyebrow="Guides"
      lastUpdated={LAST_UPDATED}
      quickLinks={QUICK_LINKS}
    >
      <GuideMotionSection guideId="fashion-stores" />

      <section className="space-y-2">
        <SectionTitle>Ajio</SectionTitle>
        <p>
          Ajio is often strong for brand-led fashion drops, end-of-season
          clearance, and sharp price cuts on clothing and shoes. It is worth
          watching when the goal is heavy markdowns rather than constant
          day-to-day pricing.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Myntra</SectionTitle>
        <p>
          Myntra is useful when you want wide brand coverage, strong filters,
          and frequent promotions across apparel, footwear, beauty, and
          accessories. It is often one of the easiest places to compare variants
          quickly.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Tata CLiQ and similar marketplaces</SectionTitle>
        <p>
          Multi-brand fashion marketplaces can be worth monitoring during sale
          windows, especially when brand-specific offers or bank promotions are
          stacked on top of listed markdowns.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>What makes a fashion store worth watching</SectionTitle>
        <p>
          The useful signals are not just headline discounts. Good return
          clarity, reliable sizing information, real stock depth, and honest
          final pricing matter just as much as the sale percentage.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Best way to use stores like these</SectionTitle>
        <p>
          Treat them differently. Use one store for clearance hunting, another
          for broader catalog comparison, and another when you care about a
          specific brand or bank-offer combination. That usually produces better
          results than checking only one store for everything.
        </p>
      </section>
    </ContentPageShell>
  );
}
