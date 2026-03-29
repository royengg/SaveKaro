import { Link } from "react-router-dom";
import LegalPageShell from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "March 9, 2026";

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

export default function PrivacyPolicy() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      summary="This policy explains what data SaveKaro collects, how it is used, and your choices."
      lastUpdated={LAST_UPDATED}
    >
      <section className="space-y-2">
        <SectionTitle>1. Information We Collect</SectionTitle>
        <p>
          We collect information you provide directly, such as account details
          from sign-in providers, profile details, and deal submissions.
          We also collect service usage data, including votes, saves, clicks,
          and basic technical metadata needed for security and performance.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>2. How We Use Information</SectionTitle>
        <p>
          We use data to operate the platform, show relevant deals, prevent
          abuse, improve product performance, and maintain account/session
          security. We may use aggregated analytics for product decisions.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>3. Affiliate and External Links</SectionTitle>
        <p>
          Deal buttons can redirect you to external merchant websites.
          Some links may be affiliate links. Affiliate terms are described in our{" "}
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
        <SectionTitle>4. Sharing of Information</SectionTitle>
        <p>
          We do not sell personal data. We may share limited data with trusted
          infrastructure providers (hosting, analytics, authentication, email)
          strictly to run the service, or when required by law.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>5. Cookies and Local Storage</SectionTitle>
        <p>
          We use cookies and local storage for authentication, preferences, and
          basic product functionality. Disabling these may affect parts of the
          platform.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>6. Data Retention</SectionTitle>
        <p>
          We retain data only for as long as needed for product operation,
          legal obligations, and security. Retention windows may differ by data
          type.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>7. Third-Party Sites</SectionTitle>
        <p>
          External merchant websites have their own privacy policies and terms.
          SaveKaro is not responsible for third-party content, tracking, or
          data practices after you leave this website.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>8. Security</SectionTitle>
        <p>
          We implement reasonable technical and operational safeguards, but no
          internet service can guarantee absolute security.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>9. Policy Updates</SectionTitle>
        <p>
          We may update this policy from time to time. The latest version and
          date are always shown on this page.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>10. Contact</SectionTitle>
        <p>
          For privacy-related questions or requests, email{" "}
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
