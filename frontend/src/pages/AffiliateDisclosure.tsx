import { Link } from "react-router-dom";
import LegalPageShell from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "March 9, 2026";

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

export default function AffiliateDisclosure() {
  return (
    <LegalPageShell
      title="Affiliate Disclosure & Disclaimer"
      summary="This page explains how affiliate links work on SaveKaro."
      lastUpdated={LAST_UPDATED}
      canonicalPath="/affiliate-disclosure"
    >
      <section className="space-y-2">
        <SectionTitle>1. Affiliate Link Notice</SectionTitle>
        <p>
          Some links on SaveKaro may be affiliate links. If you buy through an
          eligible affiliate link, SaveKaro may earn a commission from that
          retailer at no additional cost to you.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>2. Current Revenue Sources</SectionTitle>
        <p>
          As of March 9, 2026, SaveKaro currently earns affiliate revenue only
          from Amazon links. SaveKaro does not currently earn revenue from
          non-Amazon store links.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>3. Editorial Independence</SectionTitle>
        <p>
          Deals are selected based on relevance, pricing value, and community
          interest. Affiliate availability does not guarantee a deal is shown
          and does not imply endorsement of any merchant.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>4. Merchant Responsibility</SectionTitle>
        <p>
          Final product availability, shipping, returns, taxes, and pricing are
          controlled by the merchant website. Always verify offer details on
          the destination page before purchasing.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>5. Future Changes</SectionTitle>
        <p>
          If affiliate relationships change in the future, this page will be
          updated and dated accordingly.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>6. Contact</SectionTitle>
        <p>
          For affiliate-disclosure questions, email{" "}
          <a
            href="mailto:rudrakshroystudy@gmail.com"
            className="font-medium underline underline-offset-2"
          >
            rudrakshroystudy@gmail.com
          </a>{" "}
          or use the dedicated{" "}
          <Link
            to="/contact"
            className="font-medium underline underline-offset-2"
          >
            Contact
          </Link>{" "}
          page.
        </p>
      </section>
    </LegalPageShell>
  );
}
