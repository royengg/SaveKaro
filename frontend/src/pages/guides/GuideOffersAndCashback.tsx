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

import { GuideSections } from "@/components/guides/GuideSections";

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

      <GuideSections slug="how-to-compare-coupons-bank-offers-and-cashback" />
    </ContentPageShell>
  );
}
