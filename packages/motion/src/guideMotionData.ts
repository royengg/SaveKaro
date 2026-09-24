export type GuideMotionId =
  | "discount-quality"
  | "offers-and-cashback"
  | "sources-and-verifies"
  | "fashion-stores";

export type GuideMotionIconKey =
  | "spark"
  | "wallet"
  | "badge"
  | "layers"
  | "link"
  | "shield"
  | "scan"
  | "shirt"
  | "grid"
  | "tag"
  | "check";

export interface GuideMotionScene {
  step: string;
  overline: string;
  title: string;
  body: string;
  highlights: Array<{
    label: string;
    icon: GuideMotionIconKey;
  }>;
  stat: string;
}

export interface GuideMotionConfig {
  eyebrow: string;
  heading: string;
  subheading: string;
  palette: {
    background: string;
    card: string;
    accent: string;
    accentSoft: string;
    accentText: string;
  };
  scenes: GuideMotionScene[];
}

export const GUIDE_MOTION_CONFIG: Record<GuideMotionId, GuideMotionConfig> = {
  "discount-quality": {
    eyebrow: "Deal Quality",
    heading: "Discounts need context",
    subheading:
      "A short motion summary of how to judge a deal without trusting the biggest badge on the page.",
    palette: {
      background:
        "radial-gradient(circle at top left, rgba(254,240,138,0.72), transparent 34%), radial-gradient(circle at bottom right, rgba(251,191,36,0.16), transparent 28%), linear-gradient(135deg, #fffaf0 0%, #f7f0e4 100%)",
      card:
        "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,250,240,0.8))",
      accent: "#d97706",
      accentSoft: "rgba(245,158,11,0.14)",
      accentText: "#92400e",
    },
    scenes: [
      {
        step: "1",
        overline: "Ignore the loudest sticker",
        title: "Big percentages can lie",
        body: "A huge markdown is weak if the starting price was never the real everyday price.",
        highlights: [
          { label: "Look past % off", icon: "spark" },
          { label: "Check the payable price", icon: "wallet" },
          { label: "Compare normal selling range", icon: "badge" },
        ],
        stat: "Final price wins",
      },
      {
        step: "2",
        overline: "Check what you are actually buying",
        title: "Variant quality matters",
        body: "The cheap version is not helpful if the size, color, storage, or model you want costs much more.",
        highlights: [
          { label: "Right size and color", icon: "layers" },
          { label: "Popular variant price", icon: "tag" },
          { label: "Coupon still applies", icon: "check" },
        ],
        stat: "Match the exact variant",
      },
      {
        step: "3",
        overline: "Use urgency carefully",
        title: "Sale timing is only context",
        body: "Flash sales and festive drops help, but urgency alone does not turn an average price into a strong deal.",
        highlights: [
          { label: "Timing helps", icon: "spark" },
          { label: "Price still must hold", icon: "wallet" },
          { label: "Buy without badge bias", icon: "check" },
        ],
        stat: "Good price first",
      },
    ],
  },
  "offers-and-cashback": {
    eyebrow: "Offers and Cashback",
    heading: "Stack deals without fooling yourself",
    subheading:
      "A short motion summary of how to compare coupons, bank offers, and cashback without losing sight of the real final price.",
    palette: {
      background:
        "radial-gradient(circle at top left, rgba(220,252,231,0.72), transparent 34%), radial-gradient(circle at bottom right, rgba(134,239,172,0.2), transparent 28%), linear-gradient(135deg, #f5fff8 0%, #edf8f0 100%)",
      card:
        "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(244,255,248,0.82))",
      accent: "#059669",
      accentSoft: "rgba(16,185,129,0.14)",
      accentText: "#047857",
    },
    scenes: [
      {
        step: "1",
        overline: "Start with the live listed price",
        title: "Base price comes first",
        body: "Before thinking about rewards or coupons, check whether the listed price itself is already competitive.",
        highlights: [
          { label: "Check the listed price", icon: "wallet" },
          { label: "Compare with usual range", icon: "badge" },
          { label: "Do not start from promises", icon: "check" },
        ],
        stat: "Base price is the anchor",
      },
      {
        step: "2",
        overline: "Not all savings land the same way",
        title: "Instant discounts beat delayed rewards",
        body: "A bank discount you get immediately is usually stronger than cashback or points that arrive later with conditions attached.",
        highlights: [
          { label: "Instant discount", icon: "tag" },
          { label: "Delayed cashback", icon: "wallet" },
          { label: "Check offer conditions", icon: "scan" },
        ],
        stat: "Immediate savings matter more",
      },
      {
        step: "3",
        overline: "Do the real payable math",
        title: "Stack only what you can truly use",
        body: "The best offer stack is the one you can actually claim, on the right card, without forcing a weaker purchase decision.",
        highlights: [
          { label: "Use your real payment method", icon: "wallet" },
          { label: "Include coupons only if valid", icon: "check" },
          { label: "Ignore unusable rewards", icon: "shield" },
        ],
        stat: "Payable price stays final",
      },
    ],
  },
  "sources-and-verifies": {
    eyebrow: "Link Verification",
    heading: "Discovery first, merchant truth last",
    subheading:
      "A short visual walkthrough of how SaveKaro tries to move from messy public posts to cleaner merchant links.",
    palette: {
      background:
        "radial-gradient(circle at top right, rgba(191,219,254,0.76), transparent 34%), radial-gradient(circle at bottom left, rgba(224,231,255,0.62), transparent 28%), linear-gradient(135deg, #f7fbff 0%, #eef4ff 100%)",
      card:
        "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,248,255,0.82))",
      accent: "#2563eb",
      accentSoft: "rgba(59,130,246,0.14)",
      accentText: "#1d4ed8",
    },
    scenes: [
      {
        step: "1",
        overline: "Deals can begin as noisy posts",
        title: "Community posts are starting points",
        body: "Public deal threads are good for discovery, but they are often inconsistent, repetitive, or link-messy.",
        highlights: [
          { label: "Public discovery", icon: "scan" },
          { label: "Mixed link styles", icon: "layers" },
          { label: "Not the final truth", icon: "badge" },
        ],
        stat: "Discovery, not certainty",
      },
      {
        step: "2",
        overline: "Real merchant links should win",
        title: "Store pages beat discussion pages",
        body: "If a usable merchant link exists in the post or comments, SaveKaro should surface that instead of keeping a discussion permalink.",
        highlights: [
          { label: "Prefer merchant links", icon: "link" },
          { label: "Use comments when needed", icon: "scan" },
          { label: "Reduce Reddit detours", icon: "check" },
        ],
        stat: "Merchant links preferred",
      },
      {
        step: "3",
        overline: "The last check still belongs to the store",
        title: "The merchant page stays authoritative",
        body: "Inventory, sizes, coupons, shipping, and live price changes can still move after a deal is captured.",
        highlights: [
          { label: "Check live price", icon: "wallet" },
          { label: "Verify stock and sizes", icon: "shield" },
          { label: "Treat store as source of truth", icon: "check" },
        ],
        stat: "Store page is final",
      },
    ],
  },
  "fashion-stores": {
    eyebrow: "Fashion Stores",
    heading: "Use each store differently",
    subheading:
      "A short visual guide to the fashion stores that are usually worth watching and what each one tends to do best.",
    palette: {
      background:
        "radial-gradient(circle at top left, rgba(253,230,138,0.32), transparent 24%), radial-gradient(circle at bottom right, rgba(251,207,232,0.54), transparent 28%), linear-gradient(135deg, #fff8fb 0%, #f8f0f5 100%)",
      card:
        "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,245,249,0.82))",
      accent: "#db2777",
      accentSoft: "rgba(236,72,153,0.14)",
      accentText: "#be185d",
    },
    scenes: [
      {
        step: "1",
        overline: "Ajio tends to be a markdown hunter",
        title: "Ajio is strong for clearance-led drops",
        body: "It is worth watching when you care about heavier fashion markdowns, brand-led sale windows, and seasonal cleanouts.",
        highlights: [
          { label: "Clearance hunting", icon: "tag" },
          { label: "Brand-led drops", icon: "shirt" },
          { label: "Good for sharp cuts", icon: "spark" },
        ],
        stat: "Best for markdown depth",
      },
      {
        step: "2",
        overline: "Myntra tends to help comparison",
        title: "Myntra is strong for breadth",
        body: "It usually makes it easier to compare variants, brands, and categories quickly when you want the broader catalog view.",
        highlights: [
          { label: "Wide catalog coverage", icon: "grid" },
          { label: "Easy variant comparison", icon: "layers" },
          { label: "Frequent promo cycles", icon: "spark" },
        ],
        stat: "Best for comparison",
      },
      {
        step: "3",
        overline: "Do not expect one store to do everything",
        title: "Different stores solve different jobs",
        body: "Use one store for clearance, another for range, and another for stacked bank offers instead of checking only one place.",
        highlights: [
          { label: "Clearance store", icon: "tag" },
          { label: "Catalog store", icon: "grid" },
          { label: "Offer-stack store", icon: "wallet" },
        ],
        stat: "Use stores strategically",
      },
    ],
  },
};
