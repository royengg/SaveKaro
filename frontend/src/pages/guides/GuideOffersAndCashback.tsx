import ContentPageShell from "@/components/content/ContentPageShell";
import GuideMotionSection from "@/components/guides/GuideMotionSection";

const LAST_UPDATED = "March 30, 2026";
const QUICK_LINKS = [
  { to: "/guides", label: "Guides" },
  {
    to: "/guides/how-to-tell-if-a-discount-is-actually-good",
    label: "Discount Quality",
  },
  {
    to: "/guides/how-to-compare-coupons-bank-offers-and-cashback",
    label: "Offers and Cashback",
  },
  {
    to: "/guides/best-fashion-deal-stores-in-india",
    label: "Fashion Stores",
  },
];

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

export default function GuideOffersAndCashback() {
  return (
    <ContentPageShell
      title="How to compare coupons, bank offers, and cashback"
      summary="Most checkout savings are not equal. The useful question is not how many offer labels are shown, but what you will actually pay and what value really reaches you."
      eyebrow="Guides"
      lastUpdated={LAST_UPDATED}
      quickLinks={QUICK_LINKS}
    >
      <GuideMotionSection guideId="offers-and-cashback" />

      <section className="space-y-2">
        <SectionTitle>Start with the product price itself</SectionTitle>
        <p>
          Before looking at coupons, card offers, or reward programs, check
          whether the listed price is already good. A weak base price does not
          become a strong deal just because the checkout shows several savings
          banners.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Instant savings usually matter more</SectionTitle>
        <p>
          A direct bank discount at checkout is usually easier to value than
          cashback, points, or future credits. Delayed rewards can still be
          useful, but they often come with expiry dates, redemption limits, or
          category restrictions.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Only count offers you can actually use</SectionTitle>
        <p>
          If a coupon needs a new-user account, a bank card you do not have, or
          a wallet you would not normally use, treat it carefully. The relevant
          number is not the best possible stack in theory, but the stack that
          fits your real checkout.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Watch the conditions around cashback</SectionTitle>
        <p>
          Cashback can be attractive, but it is often the easiest offer type to
          overvalue. Check when it arrives, where it is credited, whether there
          is a minimum spend requirement, and whether it is reusable like cash
          or trapped inside a limited reward system.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Do one final payable-price check</SectionTitle>
        <p>
          After all adjustments, the important number is still the real amount
          that leaves your account today. If the final payable price is not
          strong enough on its own, the deal probably does not improve just
          because the savings were split into three different offer labels.
        </p>
      </section>
    </ContentPageShell>
  );
}
