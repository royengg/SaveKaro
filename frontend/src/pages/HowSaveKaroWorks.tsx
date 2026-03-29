import { Link } from "react-router-dom";
import ContentPageShell from "@/components/content/ContentPageShell";

const LAST_UPDATED = "March 30, 2026";
const QUICK_LINKS = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/how-savekaro-works", label: "How It Works" },
  { to: "/how-savekaro-verifies-deals", label: "How Deals Are Verified" },
];

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-base font-semibold text-foreground">{children}</h2>
  );
}

export default function HowSaveKaroWorks() {
  return (
    <ContentPageShell
      title="How SaveKaro Works"
      summary="SaveKaro is built to turn scattered deal posts into cleaner, easier-to-read deal pages with better links, clearer context, and community feedback."
      eyebrow="How It Works"
      lastUpdated={LAST_UPDATED}
      quickLinks={QUICK_LINKS}
    >
      <section className="space-y-2">
        <SectionTitle>
          1. Deals are discovered from public deal-sharing sources
        </SectionTitle>
        <p>
          SaveKaro can pick up deals from public community deal posts and from
          direct user submissions. The aim is to surface relevant deals quickly
          without forcing users to sift through multiple threads and comments on
          their own.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>
          2. Merchant links are cleaned up where possible
        </SectionTitle>
        <p>
          When a post contains a real merchant link, SaveKaro tries to use that
          instead of a discussion permalink. If the useful link is shared in the
          post body or comments, the system tries to pick that up so users can
          reach the actual store page more directly.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>3. Titles and prices are normalized</SectionTitle>
        <p>
          Community deal posts are often noisy, repetitive, or inconsistent.
          SaveKaro tries to clean titles, identify basic pricing information,
          and present the deal in a more readable format.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>4. Duplicate deals are reduced</SectionTitle>
        <p>
          The platform tries to avoid saving the same deal again and again in
          slightly different forms. When possible, overlapping posts are grouped
          or upgraded instead of creating unnecessary clutter.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>
          5. Community feedback helps surface better deals
        </SectionTitle>
        <p>
          Votes, saves, submissions, and comments help signal which deals are
          attracting real interest. These are useful signals, but they are not a
          guarantee that every variant, size, or coupon will still be available
          when you open the store page.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>
          6. Final verification still happens on the merchant site
        </SectionTitle>
        <p>
          SaveKaro helps with discovery and cleanup, but the final truth still
          lives on the retailer’s website. You should always confirm price,
          availability, shipping, returns, and coupon validity before buying.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Want the verification detail?</SectionTitle>
        <p>
          If you want the link-checking and deal-validation side explained more
          clearly, read{" "}
          <Link
            to="/how-savekaro-verifies-deals"
            className="font-medium underline underline-offset-2"
          >
            How SaveKaro Verifies Deals
          </Link>
          .
        </p>
      </section>
    </ContentPageShell>
  );
}
