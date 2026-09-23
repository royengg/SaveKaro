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

import { GuideSections } from "@/components/guides/GuideSections";

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

      <GuideSections slug="how-to-tell-if-a-discount-is-actually-good" />
    </ContentPageShell>
  );
}
