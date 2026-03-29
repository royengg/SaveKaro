import { Link } from "react-router-dom";
import LegalPageShell from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "March 9, 2026";

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

export default function TermsAndConditions() {
  return (
    <LegalPageShell
      title="Terms & Conditions"
      summary="These terms govern your use of SaveKaro and apply to all visitors and users."
      lastUpdated={LAST_UPDATED}
    >
      <section className="space-y-2">
        <SectionTitle>1. Acceptance of Terms</SectionTitle>
        <p>
          By accessing or using SaveKaro, you agree to these Terms & Conditions
          and our{" "}
          <Link
            to="/privacy-policy"
            className="font-medium underline underline-offset-2"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>2. Platform Purpose</SectionTitle>
        <p>
          SaveKaro is a deal discovery and aggregation platform. Deal data can
          change quickly, and availability, pricing, and discounts are not
          guaranteed.
        </p>
        <p>
          Content on this website is for general informational purposes and is
          not legal, financial, tax, or professional advice.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>3. External Merchant Responsibility</SectionTitle>
        <p>
          Purchases happen on third-party merchant websites. SaveKaro does not
          process payments, ship products, or provide merchant warranties.
          Please verify details on the merchant page before purchase.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>4. Affiliate Relationships</SectionTitle>
        <p>
          Some outbound links may be affiliate links. Affiliate details are
          explained in the{" "}
          <Link
            to="/affiliate-disclosure"
            className="font-medium underline underline-offset-2"
          >
            Affiliate Disclosure
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>5. User Conduct</SectionTitle>
        <p>
          You agree not to misuse the platform, post misleading content, attempt
          unauthorized access, or interfere with service operations.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>6. User Submissions</SectionTitle>
        <p>
          By submitting deals or comments, you confirm you have rights to that
          content and grant SaveKaro a non-exclusive license to display and
          distribute it within the platform.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>7. Intellectual Property</SectionTitle>
        <p>
          SaveKaro branding and platform materials belong to SaveKaro or its
          licensors. Retailer names, logos, and marks belong to their
          respective owners.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>8. Limitation of Liability</SectionTitle>
        <p>
          To the maximum extent permitted by law, SaveKaro is provided on an
          "as is" basis and is not liable for indirect, incidental, or
          consequential damages arising from use of this service.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>9. Updates and Termination</SectionTitle>
        <p>
          We may update these terms, suspend abusive accounts, or modify
          features to keep the platform safe and reliable.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>10. Governing Law</SectionTitle>
        <p>
          These terms are governed by applicable laws in India, without
          prejudice to mandatory consumer protections that may apply in your
          jurisdiction.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>11. Contact</SectionTitle>
        <p>
          For questions about these terms, email{" "}
          <a
            href="mailto:rudrakshroystudy@gmail.com"
            className="font-medium underline underline-offset-2"
          >
            rudrakshroystudy@gmail.com
          </a>{" "}
          or use the{" "}
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
