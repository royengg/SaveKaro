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
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

export default function About() {
  return (
    <ContentPageShell
      title="About SaveKaro"
      summary="SaveKaro is an independent deal discovery platform built to make deal hunting cleaner, faster, and easier to trust."
      eyebrow="SaveKaro"
      lastUpdated={LAST_UPDATED}
      quickLinks={QUICK_LINKS}
    >
      <section className="space-y-2">
        <SectionTitle>What SaveKaro is</SectionTitle>
        <p>
          SaveKaro helps people discover useful deals without having to dig
          through noisy threads, expired listings, or low-context posts. The
          goal is simple: surface strong deals, keep links cleaner, and make it
          easier to judge whether an offer is worth your time.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Who runs it</SectionTitle>
        <p>
          SaveKaro is built and operated by <strong>Rudraksh Roy</strong>, a
          solo developer. It is not run by a retailer, marketplace, or media
          company.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>How deals reach the site</SectionTitle>
        <p>
          Deals on SaveKaro can come from public community sources, merchant
          links shared in discussions, and direct community submissions. The
          platform then tries to clean titles, improve merchant links, group
          duplicate deals, and present the offer in a more readable way.
        </p>
        <p>
          If you want the exact breakdown, read{" "}
          <Link
            to="/how-savekaro-works"
            className="font-medium underline underline-offset-2"
          >
            How SaveKaro Works
          </Link>{" "}
          and{" "}
          <Link
            to="/how-savekaro-verifies-deals"
            className="font-medium underline underline-offset-2"
          >
            How SaveKaro Verifies Deals
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>What SaveKaro does not do</SectionTitle>
        <p>
          SaveKaro does not sell products, process payments, or control final
          merchant pricing. Inventory, size availability, coupon validity,
          shipping, and returns are handled by the retailer you visit after
          leaving SaveKaro.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>How money works</SectionTitle>
        <p>
          Some outbound links may be affiliate links. As of now, SaveKaro only
          earns affiliate revenue from certain Amazon links. Affiliate links do
          not increase the price you pay. More detail is available in the{" "}
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
        <SectionTitle>How to reach SaveKaro</SectionTitle>
        <p>
          For support, corrections, privacy questions, or partnership-related
          communication, use the contact page or email{" "}
          <a
            href="mailto:rudrakshroystudy@gmail.com"
            className="font-medium underline underline-offset-2"
          >
            rudrakshroystudy@gmail.com
          </a>
          .
        </p>
      </section>
    </ContentPageShell>
  );
}
