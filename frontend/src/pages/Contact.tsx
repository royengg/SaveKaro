import ContentPageShell from "@/components/content/ContentPageShell";

const LAST_UPDATED = "March 30, 2026";
const CONTACT_EMAIL = "rudrakshroystudy@gmail.com";
const QUICK_LINKS = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/how-savekaro-works", label: "How It Works" },
  { to: "/how-savekaro-verifies-deals", label: "How Deals Are Verified" },
];

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

function ContactCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border bg-secondary/35 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

export default function Contact() {
  return (
    <ContentPageShell
      title="Contact SaveKaro"
      summary="If you need to report a bad link, ask a privacy question, request a correction, or get in touch about the platform, use the contact details below."
      eyebrow="Support"
      lastUpdated={LAST_UPDATED}
      quickLinks={QUICK_LINKS}
    >
      <section className="space-y-3">
        <SectionTitle>Primary email</SectionTitle>
        <div className="rounded-[24px] border bg-card p-4 md:p-5">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-lg font-semibold tracking-[-0.02em] text-foreground underline decoration-black/12 underline-offset-4 hover:decoration-black/35"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            This inbox is handled directly by Rudraksh Roy, the solo developer
            behind SaveKaro.
          </p>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <ContactCard
          title="General support"
          body="Use this for broken merchant links, incorrect deal pages, site bugs, account help, or anything that looks wrong on SaveKaro."
        />
        <ContactCard
          title="Privacy or legal requests"
          body="Use this for privacy questions, data-related requests, policy clarifications, or issues connected to the legal pages."
        />
        <ContactCard
          title="Affiliate or disclosure questions"
          body="Use this if you need clarification about how affiliate links work on SaveKaro or want to report a disclosure issue."
        />
        <ContactCard
          title="Corrections and submissions"
          body="If a deal page needs correction or if you want to point out missing merchant information, send the deal title and the correct link."
        />
      </section>

      <section className="space-y-2">
        <SectionTitle>What helps in your message</SectionTitle>
        <p>
          To make support faster, include the deal title, the page URL, and a
          short explanation of what is wrong. If a merchant link is broken,
          include the correct working link if you have it.
        </p>
      </section>

      <section className="space-y-2">
        <SectionTitle>Response expectations</SectionTitle>
        <p>
          SaveKaro is operated by one person, so replies may not be instant.
          The goal is still to review issues as quickly as possible, especially
          for broken links, privacy concerns, or incorrect public information.
        </p>
      </section>
    </ContentPageShell>
  );
}
