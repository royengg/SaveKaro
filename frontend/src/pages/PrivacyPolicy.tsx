import { Link } from "react-router-dom";
import LegalPageShell from "@/components/legal/LegalPageShell";

const LAST_UPDATED = "August 15, 2026";

import { SectionTitle } from "@/components/content/SectionTitle";

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
          With your permission, we also collect product usage data such as page
          visits, navigation paths, deal impressions, searches, filters, votes,
          saves, merchant clicks, and basic browser or device metadata. We do
          not intentionally include search text, comments, authentication
          codes, alert keywords, or form contents in analytics events.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>2. How We Use Information</SectionTitle>
        <p>
          We use data to operate the platform, show relevant deals, prevent
          abuse, improve product performance, and maintain account/session
          security. Consent-based analytics help us understand discovery
          journeys, improve navigation, diagnose errors, and make product
          decisions using aggregated trends.
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
          strictly to run the service, or when required by law. Our product
          analytics providers currently include PostHog and, during a limited
          migration period, Umami.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>5. Cookies and Local Storage</SectionTitle>
        <p>
          We use cookies and local storage for authentication, preferences,
          consent choices, and basic product functionality. Analytics storage
          and capture remain disabled until you allow analytics. You can change
          that choice at any time using “Privacy choices” in the site footer.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>6. Session Replay</SectionTitle>
        <p>
          When separately enabled, PostHog session replay may record a
          privacy-masked representation of interactions on public product
          pages. Inputs are masked, network bodies and console logs are not
          recorded, URL query strings are removed, and account,
          authentication, alert, notification, saved-deal, settings, and deal
          submission pages are excluded. Replay is used to diagnose usability
          problems rather than to inspect personal content.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>7. Your Analytics Choices</SectionTitle>
        <p>
          You may allow or decline analytics without affecting core website
          functionality. If you withdraw consent, future PostHog and Umami
          analytics collection on that browser is disabled. Browser “Do Not
          Track” preferences are also respected.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>8. Data Retention</SectionTitle>
        <p>
          We retain data only for as long as needed for product operation,
          analytics, legal obligations, and security. Retention windows may
          differ by data type and are limited through provider settings.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>9. Third-Party Sites</SectionTitle>
        <p>
          External merchant websites have their own privacy policies and terms.
          SaveKaro is not responsible for third-party content, tracking, or
          data practices after you leave this website.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>10. Security</SectionTitle>
        <p>
          We implement reasonable technical and operational safeguards, but no
          internet service can guarantee absolute security.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>11. Policy Updates</SectionTitle>
        <p>
          We may update this policy from time to time. The latest version and
          date are always shown on this page.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>12. Contact</SectionTitle>
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
