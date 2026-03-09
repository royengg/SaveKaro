import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="mt-12 border-t px-4 py-7 md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 md:gap-5">
        <nav className="flex w-full flex-col items-center justify-center gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
          <Link
            to="/privacy-policy"
            className="inline-flex h-9 items-center px-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-and-conditions"
            className="inline-flex h-9 items-center px-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms &amp; Conditions
          </Link>
          <Link
            to="/affiliate-disclosure"
            className="inline-flex h-9 items-center px-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            Affiliate Disclosure
          </Link>
        </nav>

        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
          SaveKaro is an independent deal aggregation platform. We are not
          affiliated with, endorsed by, or connected to any retailer listed on
          this site. All trademarks belong to their respective owners.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
