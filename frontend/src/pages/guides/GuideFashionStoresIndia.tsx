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

      <GuideSections slug="best-fashion-deal-stores-in-india" />
    </ContentPageShell>
  );
}
