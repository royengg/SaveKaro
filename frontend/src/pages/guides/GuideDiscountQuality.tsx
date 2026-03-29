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

export default function GuideDiscountQuality() {
  return (
    <ContentPageShell
      title="How to tell if a discount is actually good"
      summary="A big discount badge is not enough on its own. The useful question is whether the current price is genuinely strong compared with the product’s normal selling behavior."
      eyebrow="Guides"
      lastUpdated={LAST_UPDATED}
      quickLinks={QUICK_LINKS}
    >
      <GuideMotionSection guideId="discount-quality" />

      <section className="space-y-2">
        <SectionTitle>Look past the percentage first</SectionTitle>
        <p>
          A 70% off label can still be weak if the reference price was inflated
          or if the product almost never sells at that higher number. A smaller
          discount can be much better when the current price is close to the
          best price the product usually sees.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Check the actual payable price</SectionTitle>
        <p>
          The only number that matters in the end is the amount you will
          actually pay. Bank offers, coupons, and cashback can help, but they
          should not distract from the real final price on the merchant page.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Watch for old or misleading reference prices</SectionTitle>
        <p>
          Some listings show an MRP or launch price that is not a realistic
          everyday selling price. A deal becomes much more convincing when the
          current price is low compared with the product’s usual online selling
          range, not just a high sticker price.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Variant quality matters</SectionTitle>
        <p>
          A low price is only useful if it applies to the exact size, color,
          storage option, or model you actually want. Some deal posts highlight
          the best number while the most popular variant is priced much higher.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Use timing as context, not the only signal</SectionTitle>
        <p>
          Festive sales, clearance windows, and flash drops can produce genuine
          discounts, but urgency alone does not make a deal good. Strong deals
          usually combine good timing with a price that still holds up after you
          compare it properly.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Simple rule of thumb</SectionTitle>
        <p>
          If the final price looks good, the variant is the right one, the
          store is reliable, and you would still buy it without the oversized
          discount badge, the deal is probably worth serious consideration.
        </p>
      </section>
    </ContentPageShell>
  );
}
