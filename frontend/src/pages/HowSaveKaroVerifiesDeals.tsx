import ContentPageShell from "@/components/content/ContentPageShell";

const LAST_UPDATED = "March 30, 2026";
const QUICK_LINKS = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/how-savekaro-works", label: "How It Works" },
  { to: "/how-savekaro-verifies-deals", label: "How Deals Are Verified" },
];

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

export default function HowSaveKaroVerifiesDeals() {
  return (
    <ContentPageShell
      title="How SaveKaro Verifies Deals"
      summary="SaveKaro does not promise that every deal is perfect, but it does try to reduce obvious bad links, duplicate posts, and low-value listings before they reach users."
      eyebrow="Verification"
      lastUpdated={LAST_UPDATED}
      quickLinks={QUICK_LINKS}
    >
      <section className="space-y-2">
        <SectionTitle>SaveKaro looks for real merchant links first</SectionTitle>
        <p>
          The first goal is to identify the actual store link behind a deal.
          If a merchant link is available in the post itself or in useful
          comments, SaveKaro tries to keep that link instead of sending users to
          a discussion page when it is not necessary.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Duplicate and low-value posts are filtered down</SectionTitle>
        <p>
          The platform checks for repeated deals and low-signal posts so the
          feed is not overwhelmed by the same listing in slightly different
          wording. This helps keep the feed cleaner, especially during heavy
          sale periods.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Basic pricing signals are extracted</SectionTitle>
        <p>
          SaveKaro tries to capture deal price, original price, and discount
          information when those values are available in the source material.
          That creates a clearer summary, but users should still confirm the
          final merchant page because prices can change quickly.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Question posts and weak posts can be rejected</SectionTitle>
        <p>
          Not every community post is actually a deal. Support posts, low-detail
          posts, or posts that do not have enough signal can be skipped so they
          do not clutter the public deal inventory.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Community signals still matter</SectionTitle>
        <p>
          Saves, votes, and comments help show whether a deal is getting useful
          attention. These signals help, but they do not replace final checking
          by the buyer.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>What SaveKaro cannot guarantee</SectionTitle>
        <p>
          SaveKaro cannot guarantee stock, size availability, exact merchant
          variant pages, bank-offer eligibility, shipping terms, or how long a
          coupon will remain valid. The platform improves discovery, but the
          merchant page is still the final source of truth.
        </p>
      </section>
    </ContentPageShell>
  );
}
