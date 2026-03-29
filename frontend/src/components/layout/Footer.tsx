import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-12 border-t px-4 py-7 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 md:gap-5">
        <nav className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 text-sm md:gap-x-3 md:gap-y-2.5">
          <Link
            to="/about"
            className="inline-flex min-h-9 items-center rounded-full border border-transparent bg-secondary/42 px-3.5 py-1.5 text-muted-foreground transition-all hover:border-border hover:bg-secondary/72 hover:text-foreground"
          >
            About
          </Link>
          <Link
            to="/contact"
            className="inline-flex min-h-9 items-center rounded-full border border-transparent bg-secondary/42 px-3.5 py-1.5 text-muted-foreground transition-all hover:border-border hover:bg-secondary/72 hover:text-foreground"
          >
            Contact
          </Link>
          <Link
            to="/guides"
            className="inline-flex min-h-9 items-center rounded-full border border-transparent bg-secondary/42 px-3.5 py-1.5 text-muted-foreground transition-all hover:border-border hover:bg-secondary/72 hover:text-foreground"
          >
            Guides
          </Link>
          <Link
            to="/how-savekaro-works"
            className="inline-flex min-h-9 items-center rounded-full border border-transparent bg-secondary/42 px-3.5 py-1.5 text-muted-foreground transition-all hover:border-border hover:bg-secondary/72 hover:text-foreground"
          >
            How SaveKaro Works
          </Link>
          <Link
            to="/how-savekaro-verifies-deals"
            className="inline-flex min-h-9 items-center rounded-full border border-transparent bg-secondary/42 px-3.5 py-1.5 text-muted-foreground transition-all hover:border-border hover:bg-secondary/72 hover:text-foreground"
          >
            How Deals Are Verified
          </Link>
          <Link
            to="/privacy-policy"
            className="inline-flex min-h-9 items-center rounded-full border border-transparent bg-secondary/42 px-3.5 py-1.5 text-muted-foreground transition-all hover:border-border hover:bg-secondary/72 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-and-conditions"
            className="inline-flex min-h-9 items-center rounded-full border border-transparent bg-secondary/42 px-3.5 py-1.5 text-muted-foreground transition-all hover:border-border hover:bg-secondary/72 hover:text-foreground"
          >
            Terms &amp; Conditions
          </Link>
          <Link
            to="/affiliate-disclosure"
            className="inline-flex min-h-9 items-center rounded-full border border-transparent bg-secondary/42 px-3.5 py-1.5 text-muted-foreground transition-all hover:border-border hover:bg-secondary/72 hover:text-foreground"
          >
            Affiliate Disclosure
          </Link>
        </nav>

        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          SaveKaro is an independent deal discovery platform built and operated
          by Rudraksh Roy. We are not affiliated with, endorsed by, or
          connected to any retailer listed on this site. All trademarks belong
          to their respective owners.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
