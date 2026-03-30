import * as cheerio from "cheerio";
import { RedditPost, type RedditComment } from "./client";
import logger from "../../lib/logger";
import { preferModernImageUrl } from "../../lib/image";

// Store patterns for e-commerce sites (India + International)
const STORE_PATTERNS: Record<string, RegExp[]> = {
  // International stores
  Amazon: [
    /amazon\.in/i,
    /amazon\.com/i,
    /amazon\.co\.uk/i,
    /amazon\.de/i,
    /amazon\.ca/i,
    /amazon\.com\.au/i,
    /amzn\.(?:to|com|in|co\.uk|de|ca|com\.au)/i,
  ],
  Steam: [/store\.steampowered\.com/i, /steampowered\.com/i],
  "Epic Games": [/epicgames\.com/i, /store\.epicgames\.com/i],
  GOG: [/gog\.com/i],
  "Humble Bundle": [/humblebundle\.com/i],
  PlayStation: [/store\.playstation\.com/i, /playstation\.com/i],
  Xbox: [/xbox\.com/i, /microsoft\.com\/store/i],
  Nintendo: [/nintendo\.com/i],
  "Best Buy": [/bestbuy\.com/i, /bestbuy\.ca/i],
  Walmart: [/walmart\.com/i, /walmart\.ca/i],
  Target: [/target\.com/i],
  Newegg: [/newegg\.com/i],
  "B&H Photo": [/bhphotovideo\.com/i],
  eBay: [/ebay\.com/i, /ebay\.co\.uk/i],
  AliExpress: [/aliexpress\.com/i],
  // Indian stores
  Myntra: [/myntra\.com/i, /myntr\.in/i, /myntr\.it/i],
  Ajio: [/ajio\.com/i, /ajio\.co/i, /ajio\.me/i, /ajiio\.(in|co|me)/i],
  Nykaa: [/nykaa\.com/i],
  Croma: [/croma\.com/i],
  Reliance: [/reliancedigital\.in/i, /jiomart\.com/i],
  Tata: [/tatacliq\.com/i, /bigbasket\.com/i],
  Paytm: [/paytmmall\.com/i],
  Shopclues: [/shopclues\.com/i],
  Snapdeal: [/snapdeal\.com/i],
  Meesho: [/meesho\.com/i],
  Blinkit: [/blinkit\.com/i],
  Zepto: [/zepto\.co/i],
  Swiggy: [/swiggy\.com/i, /instamart/i],
};

// Category detection based on keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  electronics: [
    "laptop",
    "phone",
    "mobile",
    "tablet",
    "headphone",
    "earphone",
    "earbud",
    "speaker",
    "tv",
    "television",
    "monitor",
    "camera",
    "smartwatch",
    "watch",
    "charger",
    "powerbank",
    "ssd",
    "hdd",
    "ram",
    "processor",
    "gpu",
    "keyboard",
    "mouse",
    "router",
    "wifi",
    "bluetooth",
    "usb",
    "hdmi",
    "adapter",
  ],
  fashion: [
    "clothing",
    "apparel",
    "fashion",
    "shirt",
    "tshirt",
    "t-shirt",
    "jeans",
    "trouser",
    "trousers",
    "pant",
    "pants",
    "dress",
    "dresses",
    "kurta",
    "saree",
    "lehenga",
    "jacket",
    "hoodie",
    "sweater",
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
    "sandal",
    "slipper",
    "bag",
    "handbag",
    "wallet",
    "belt",
    "sunglass",
    "sunglasses",
    "women",
    "men",
    "kids",
    "flat off",
    "% off on",
  ],
  gaming: [
    "game",
    "gaming",
    "ps5",
    "playstation",
    "xbox",
    "nintendo",
    "switch",
    "controller",
    "joystick",
    "gaming mouse",
    "gaming keyboard",
    "gaming headset",
    "steam",
    "epic games",
    "gpu",
    "graphics card",
    "rtx",
    "gtx",
  ],
  "home-kitchen": [
    "kitchen",
    "cookware",
    "utensil",
    "mixer",
    "grinder",
    "blender",
    "microwave",
    "oven",
    "refrigerator",
    "fridge",
    "washing machine",
    "ac",
    "air conditioner",
    "fan",
    "cooler",
    "heater",
    "vacuum",
    "iron",
    "mattress",
    "pillow",
    "bedsheet",
    "curtain",
    "furniture",
    "sofa",
    "chair",
    "table",
    "lamp",
    "light",
  ],
  beauty: [
    "beauty",
    "skincare",
    "makeup",
    "cosmetic",
    "lipstick",
    "foundation",
    "mascara",
    "perfume",
    "fragrance",
    "shampoo",
    "conditioner",
    "hair",
    "moisturizer",
    "serum",
    "sunscreen",
    "face wash",
    "lotion",
    "cream",
  ],
  "food-groceries": [
    "food",
    "grocery",
    "snack",
    "chocolate",
    "biscuit",
    "chips",
    "drink",
    "beverage",
    "coffee",
    "tea",
    "rice",
    "dal",
    "oil",
    "masala",
    "spice",
    "fruit",
    "vegetable",
    "meat",
    "chicken",
    "fish",
    "dairy",
    "milk",
    "curd",
  ],
  "mobile-accessories": [
    "mobile cover",
    "phone case",
    "screen protector",
    "tempered glass",
    "mobile stand",
    "phone holder",
    "car mount",
    "wireless charger",
    "fast charger",
    "data cable",
    "usb cable",
    "type-c",
    "lightning",
    "airpods",
    "buds",
  ],
  "books-stationery": [
    "book",
    "novel",
    "textbook",
    "notebook",
    "diary",
    "pen",
    "pencil",
    "marker",
    "highlighter",
    "eraser",
    "sharpener",
    "ruler",
    "calculator",
    "backpack",
    "school bag",
    "stationery",
    "art supply",
  ],
  travel: [
    "flight",
    "hotel",
    "booking",
    "travel",
    "trip",
    "vacation",
    "holiday",
    "luggage",
    "suitcase",
    "trolley",
    "passport",
    "visa",
    "ticket",
    "train",
    "bus",
    "cab",
    "uber",
    "ola",
    "makemytrip",
    "goibibo",
    "cleartrip",
  ],
};

// Currency patterns for international price detection
const CURRENCY_PATTERNS: { currency: string; patterns: RegExp[] }[] = [
  { currency: "USD", patterns: [/\$\s*([\d,]+(?:\.\d{2})?)/] },
  { currency: "EUR", patterns: [/€\s*([\d,]+(?:\.\d{2})?)/] },
  { currency: "GBP", patterns: [/£\s*([\d,]+(?:\.\d{2})?)/] },
  {
    currency: "CAD",
    patterns: [/C\$\s*([\d,]+(?:\.\d{2})?)/i, /CAD\s*([\d,]+(?:\.\d{2})?)/i],
  },
  {
    currency: "AUD",
    patterns: [/A\$\s*([\d,]+(?:\.\d{2})?)/i, /AUD\s*([\d,]+(?:\.\d{2})?)/i],
  },
  {
    currency: "INR",
    patterns: [
      /₹\s*([\d,]+(?:\.\d{2})?)/,
      /Rs\.?\s*([\d,]+(?:\.\d{2})?)/i,
      /INR\s*([\d,]+(?:\.\d{2})?)/i,
    ],
  },
];

export interface ParsedDeal {
  title: string;
  description: string | null;
  originalPrice: number | null;
  dealPrice: number | null;
  discountPercent: number | null;
  currency: string;
  productUrl: string;
  imageUrl: string | null;
  store: string | null;
  categorySlug: string;
  redditPostId: string;
  redditScore: number;
}

type CommentInput = RedditComment | string;

interface ParsedCommentInput {
  body: string;
  author: string | null;
  isSubmitter: boolean;
  createdUtc: number | null;
}

type UrlCandidateSource =
  | "post_url"
  | "selftext_markdown"
  | "selftext_plain"
  | "title_url"
  | "comment_markdown"
  | "comment_plain";

interface UrlCandidate {
  rawUrl: string;
  source: UrlCandidateSource;
  commentIndex?: number;
  commentIsSubmitter?: boolean;
}

interface SelectedProductUrl {
  rawProductUrl: string;
  productUrl: string;
  store: string | null;
  source: "fallback_reddit_permalink" | UrlCandidateSource;
  hadExternalCandidate: boolean;
}

// Extract price and currency from text
function extractPriceWithCurrency(text: string): {
  price: number | null;
  currency: string;
} {
  for (const { currency, patterns } of CURRENCY_PATTERNS) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(price) && price > 0 && price < 10000000) {
          return { price, currency };
        }
      }
    }
  }
  return { price: null, currency: "USD" }; // Default to USD for WORLD
}

// Extract price from text (legacy, returns just price)
function extractPrice(text: string): number | null {
  return extractPriceWithCurrency(text).price;
}

// Extract deal price and original price with currency
function extractPrices(text: string): {
  dealPrice: number | null;
  originalPrice: number | null;
  currency: string;
} {
  // Look for patterns like "$99 (was $199)" or "€99 from €199"
  const dealPatterns = [
    {
      pattern: /\$\s*([\d,]+).*?(?:was|from|original|reg).*?\$\s*([\d,]+)/i,
      currency: "USD",
    },
    {
      pattern: /€\s*([\d,]+).*?(?:was|from|original|reg).*?€\s*([\d,]+)/i,
      currency: "EUR",
    },
    {
      pattern: /£\s*([\d,]+).*?(?:was|from|original|reg).*?£\s*([\d,]+)/i,
      currency: "GBP",
    },
    {
      pattern: /₹\s*([\d,]+).*?(?:mrp|was|from|original|reg).*?₹?\s*([\d,]+)/i,
      currency: "INR",
    },
    {
      pattern:
        /Rs\.?\s*([\d,]+).*?(?:mrp|was|from|original|reg).*?Rs\.?\s*([\d,]+)/i,
      currency: "INR",
    },
  ];

  for (const { pattern, currency } of dealPatterns) {
    const match = text.match(pattern);
    if (match) {
      const price1 = parseFloat(match[1].replace(/,/g, ""));
      const price2 = parseFloat(match[2].replace(/,/g, ""));

      if (!isNaN(price1) && !isNaN(price2)) {
        return {
          dealPrice: Math.min(price1, price2),
          originalPrice: Math.max(price1, price2),
          currency,
        };
      }
    }
  }

  // Just extract single price with currency
  const { price, currency } = extractPriceWithCurrency(text);
  return { dealPrice: price, originalPrice: null, currency };
}

// Extract discount percentage
function extractDiscount(
  text: string,
  dealPrice: number | null,
  originalPrice: number | null,
): number | null {
  // Try to find explicit discount percentage
  const discountMatch = text.match(/(\d{1,2})\s*%\s*(?:off|discount)/i);
  if (discountMatch) {
    const discount = parseInt(discountMatch[1]);
    if (discount > 0 && discount <= 100) {
      return discount;
    }
  }

  // Calculate from prices if available
  if (dealPrice && originalPrice && originalPrice > dealPrice) {
    const discount = Math.round(
      ((originalPrice - dealPrice) / originalPrice) * 100,
    );
    if (discount > 0 && discount <= 100) {
      return discount;
    }
  }

  return null;
}

// URLs to skip (Reddit media, images, etc.)
const SKIP_URL_PATTERNS = [
  /reddit\.com\/media/i,
  /i\.redd\.it/i,
  /preview\.redd\.it/i,
  /v\.redd\.it/i,
  /reddit\.com\/gallery/i,
  /imgur\.com/i,
  /\.jpg$/i,
  /\.jpeg$/i,
  /\.png$/i,
  /\.gif$/i,
  /\.webp$/i,
  // Block Flipkart URLs entirely
  /flipkart\.com/i,
  /fkrt\.it/i,
  /fkrt\.cc/i,
  /fkrt\.co/i,
  /fkrt\.to/i,
  /fktr\.in/i,
];

const KNOWN_STORE_DOMAINS = [
  "amazon.in",
  "amazon.com",
  "amazon.co.uk",
  "amazon.de",
  "amazon.ca",
  "amazon.com.au",
  "amzn.to",
  "amzn.com",
  "amzn.in",
  "amzn.co.uk",
  "amzn.de",
  "amzn.ca",
  "amzn.com.au",
  "steampowered.com",
  "epicgames.com",
  "gog.com",
  "humblebundle.com",
  "playstation.com",
  "xbox.com",
  "microsoft.com",
  "nintendo.com",
  "bestbuy.com",
  "bestbuy.ca",
  "walmart.com",
  "walmart.ca",
  "target.com",
  "newegg.com",
  "bhphotovideo.com",
  "ebay.com",
  "ebay.co.uk",
  "aliexpress.com",
  "myntra.com",
  "myntr.in",
  "myntr.it",
  "ajio.com",
  "ajio.co",
  "ajio.me",
  "nykaa.com",
  "croma.com",
  "reliancedigital.in",
  "jiomart.com",
  "tatacliq.com",
  "bigbasket.com",
  "paytmmall.com",
  "shopclues.com",
  "snapdeal.com",
  "meesho.com",
  "blinkit.com",
  "zepto.co",
  "swiggy.com",
] as const;

const URL_SOURCE_WEIGHTS: Record<UrlCandidateSource, number> = {
  post_url: 340,
  selftext_markdown: 280,
  selftext_plain: 250,
  title_url: 220,
  comment_markdown: 210,
  comment_plain: 190,
};

const NON_STORE_HOST_PATTERNS = [
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)t\.me$/i,
  /(^|\.)telegram\./i,
  /(^|\.)discord\.com$/i,
  /(^|\.)discord\.gg$/i,
  /(^|\.)whatsapp\.com$/i,
  /(^|\.)medium\.com$/i,
  /(^|\.)substack\.com$/i,
  /(^|\.)linktr\.ee$/i,
  /(^|\.)reddit\.com$/i,
  /(^|\.)redd\.it$/i,
] as const;

const DEAL_INTENT_PATTERNS = [
  /\bdeal(s)?\b/i,
  /\bdiscount\b/i,
  /\boffer(s)?\b/i,
  /\bcoupon(s)?\b/i,
  /\bpromo\b/i,
  /\bprice\s*drop\b/i,
  /\bcashback\b/i,
  /\bflat\b/i,
  /\bunder\s+\d+/i,
  /\bloot\b/i,
  /\bfreebie(s)?\b/i,
  /\b\d{1,2}\s*%\s*off\b/i,
] as const;

const STRONG_DEAL_INTENT_PATTERNS = [
  /\b\d{1,2}\s*%\s*off\b/i,
  /\bprice\s*drop\b/i,
  /\bmrp\b/i,
  /\bcoupon\s*code\b/i,
  /\bdeal\s*price\b/i,
] as const;

const NON_DEAL_INTENT_PATTERNS = [
  /\[(meta|question|questions|discussion)\]/i,
  /\blooking\s+for\b/i,
  /\bsuggest\s+me\b/i,
  /\bhelp\s+needed\b/i,
  /\bwhich\s+one\b/i,
  /\bvs\b/i,
  /\breview\b/i,
  /\bopinion\b/i,
  /\bcomparison\b/i,
  /\bworth\s+it\b/i,
  /\bis\s+something\s+wrong\b/i,
  /\bdoes\s+this\s+work\b/i,
  /\bwhy\s+is\b/i,
  /\bhow\s+do\s+i\b/i,
] as const;

const NON_DEAL_FLAIR_PATTERNS = [
  /\bdiscussion\b/i,
  /\bquestions?\b/i,
  /\bgeneral\s+questions?\b/i,
  /\bmeta\b/i,
  /\brequest\b/i,
  /\breview\b/i,
  /\bhelp\b/i,
  /\bsupport\b/i,
] as const;

const SUPPORT_INTENT_PATTERNS = [
  /\bis\s+something\s+wrong\b/i,
  /\bdoes\s+this\s+work\b/i,
  /\bnot\s+working\b/i,
  /\bsomething\s+went\s+wrong\b/i,
  /\bplease\s+help\b/i,
  /\bhelp\s+me\b/i,
  /\bissue\s+with\b/i,
  /\bproblem\s+with\b/i,
  /\berror\b/i,
  /\bunable\s+to\b/i,
  /\bcan't\b/i,
  /\bcannot\b/i,
  /\bnot\s+accepting\b/i,
  /\bis\s+there\s+some\s+other\s+way\b/i,
  /\bhow\s+do\s+i\b/i,
] as const;

const SUBREDDIT_MIN_SIGNAL_SCORE: Record<string, number> = {
  dealsforindia: 5,
  greatindiadeals: 5,
  stealdealsindia: 5,
  indiangenericdeals: 5,
  indiadeals: 5,
  laptopdealsindia: 5,
  indianbeautydeals: 5,
  dealsoffersfreebies: 7,
  deals: 5,
  buildapcsales: 4,
  gamedeals: 4,
  dealsreddit: 5,
  freegamefindings: 4,
  frugalmalefashion: 5,
};

const DEFAULT_MIN_SIGNAL_SCORE = 5;

function normalizeCandidateUrl(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/&amp;/g, "&")
    .replace(/^<|>$/g, "")
    .replace(/[)\],.!?;:]+$/g, "");
}

function normalizeHostname(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.replace(/^(www|m)\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function matchesHostPattern(hostname: string, pattern: RegExp): boolean {
  return pattern.test(hostname);
}

function isRedditUrl(url: string): boolean {
  const hostname = normalizeHostname(url);
  if (!hostname) return false;
  return (
    hostname === "redd.it" ||
    hostname === "reddit.com" ||
    hostname.endsWith(".reddit.com")
  );
}

function matchesKnownStoreDomain(url: string): boolean {
  const hostname = normalizeHostname(url);
  if (!hostname) return false;
  return KNOWN_STORE_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
  );
}

function looksLikeProductPath(url: string): boolean {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return (
      pathname.length > 1 &&
      /\/(dp\/|gp\/product|product|item|p\/|buy|deal|offer|offers)/i.test(
        pathname,
      )
    );
  } catch {
    return false;
  }
}

function isHomepageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.pathname === "/" || parsed.pathname === "") &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

// Check if URL is a store/product URL (not an image or Reddit link)
function isProductUrl(url: string): boolean {
  // Skip Reddit and image URLs
  if (SKIP_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    return false;
  }
  if (isRedditUrl(url)) {
    return false;
  }

  const hostname = normalizeHostname(url);
  if (!hostname) {
    return false;
  }

  if (
    NON_STORE_HOST_PATTERNS.some((pattern) =>
      matchesHostPattern(hostname, pattern),
    )
  ) {
    return false;
  }

  if (matchesKnownStoreDomain(url)) {
    return true;
  }

  if (looksLikeProductPath(url)) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const hasDealishQueryParam = Array.from(parsed.searchParams.keys()).some(
      (key) =>
        /(?:deal|offer|coupon|discount|product|item|pid|asin|sku|ref|aff)/i.test(
          key,
        ),
    );
    return !isHomepageUrl(url) && hasDealishQueryParam;
  } catch {
    return false;
  }
}

function extractMarkdownUrls(text: string): string[] {
  return Array.from(
    text.matchAll(/\[[^\]]*?\]\((https?:\/\/[^\s\)]+)\)/g),
    (match) => match[1],
  );
}

function extractPlainUrls(text: string): string[] {
  return text.match(/(?<!\()https?:\/\/[^\s\)\]<>]+/g) || [];
}

function containsAnyPattern(
  text: string,
  patterns: readonly RegExp[],
): boolean {
  if (!text) return false;
  return patterns.some((pattern) => pattern.test(text));
}

function extractSubredditFromPermalink(permalink: string): string | null {
  const match = permalink.match(/\/r\/([^/]+)\//i);
  return match?.[1]?.toLowerCase() ?? null;
}

function getMinSignalScoreForSubreddit(subreddit: string | null): number {
  if (!subreddit) return DEFAULT_MIN_SIGNAL_SCORE;
  return SUBREDDIT_MIN_SIGNAL_SCORE[subreddit] ?? DEFAULT_MIN_SIGNAL_SCORE;
}

interface DealSignalInputs {
  subreddit: string | null;
  flairText: string;
  combinedText: string;
  selectedUrl: SelectedProductUrl;
  productUrl: string;
  store: string | null;
  dealPrice: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
}

interface DealSignalResult {
  score: number;
  threshold: number;
  hasPriceSignal: boolean;
  hasStoreSignal: boolean;
  hasDealIntentSignal: boolean;
  hasStrongDealIntentSignal: boolean;
  hasNonDealIntentSignal: boolean;
  hasSupportIntentSignal: boolean;
}

function evaluateDealSignals(inputs: DealSignalInputs): DealSignalResult {
  const {
    subreddit,
    flairText,
    combinedText,
    selectedUrl,
    productUrl,
    store,
    dealPrice,
    originalPrice,
    discountPercent,
  } = inputs;

  const hasPriceSignal = Boolean(dealPrice || originalPrice || discountPercent);
  const hasStoreSignal = Boolean(store) || matchesKnownStoreDomain(productUrl);
  const hasDealIntentSignal =
    containsAnyPattern(combinedText, DEAL_INTENT_PATTERNS) ||
    containsAnyPattern(flairText, DEAL_INTENT_PATTERNS);
  const hasStrongDealIntentSignal =
    containsAnyPattern(combinedText, STRONG_DEAL_INTENT_PATTERNS) ||
    containsAnyPattern(flairText, STRONG_DEAL_INTENT_PATTERNS);
  const hasNonDealIntentSignal =
    containsAnyPattern(combinedText, NON_DEAL_INTENT_PATTERNS) ||
    containsAnyPattern(flairText, NON_DEAL_FLAIR_PATTERNS);
  const hasSupportIntentSignal =
    containsAnyPattern(combinedText, SUPPORT_INTENT_PATTERNS) ||
    containsAnyPattern(flairText, NON_DEAL_FLAIR_PATTERNS);

  let score = 0;

  if (hasStoreSignal) score += 4;
  if (selectedUrl.source === "post_url") score += 2;
  if (
    selectedUrl.source === "selftext_markdown" ||
    selectedUrl.source === "selftext_plain"
  ) {
    score += 2;
  }
  if (
    selectedUrl.source === "comment_markdown" ||
    selectedUrl.source === "comment_plain"
  ) {
    score += 1;
  }
  if (looksLikeProductPath(productUrl)) score += 1;
  if (isHomepageUrl(productUrl)) score -= 2;
  if (hasPriceSignal) score += 3;
  if (discountPercent) score += 2;
  if (dealPrice && originalPrice) score += 1;
  if (hasDealIntentSignal) score += 2;
  if (hasStrongDealIntentSignal) score += 1;
  if (selectedUrl.source === "fallback_reddit_permalink") score -= 1;
  if (hasNonDealIntentSignal) score -= 4;
  if (hasSupportIntentSignal) score -= 7;

  return {
    score,
    threshold: getMinSignalScoreForSubreddit(subreddit),
    hasPriceSignal,
    hasStoreSignal,
    hasDealIntentSignal,
    hasStrongDealIntentSignal,
    hasNonDealIntentSignal,
    hasSupportIntentSignal,
  };
}

function normalizeCommentInputs(
  comments: CommentInput[],
): ParsedCommentInput[] {
  return comments
    .map((comment) => {
      if (typeof comment === "string") {
        return {
          body: comment.trim(),
          author: null,
          isSubmitter: false,
          createdUtc: null,
        };
      }
      return {
        body: comment.body.trim(),
        author: comment.author ?? null,
        isSubmitter: Boolean(comment.isSubmitter),
        createdUtc:
          typeof comment.createdUtc === "number" ? comment.createdUtc : null,
      };
    })
    .filter((comment) => comment.body.length > 0);
}

function collectUrlCandidates(
  post: RedditPost,
  comments: ParsedCommentInput[],
): UrlCandidate[] {
  const candidates: UrlCandidate[] = [];
  const pushCandidate = (
    rawUrl: string,
    source: UrlCandidateSource,
    meta?: Pick<UrlCandidate, "commentIndex" | "commentIsSubmitter">,
  ) => {
    const normalized = normalizeCandidateUrl(rawUrl);
    if (!normalized) return;
    candidates.push({
      rawUrl: normalized,
      source,
      commentIndex: meta?.commentIndex,
      commentIsSubmitter: meta?.commentIsSubmitter,
    });
  };

  if (!post.is_self && post.url) {
    pushCandidate(post.url, "post_url");
  }

  for (const url of extractMarkdownUrls(post.selftext)) {
    pushCandidate(url, "selftext_markdown");
  }

  for (const url of extractPlainUrls(post.selftext)) {
    pushCandidate(url, "selftext_plain");
  }

  for (const url of extractPlainUrls(post.title)) {
    pushCandidate(url, "title_url");
  }

  comments.forEach((comment, index) => {
    for (const url of extractMarkdownUrls(comment.body)) {
      pushCandidate(url, "comment_markdown", {
        commentIndex: index,
        commentIsSubmitter: comment.isSubmitter,
      });
    }

    for (const url of extractPlainUrls(comment.body)) {
      pushCandidate(url, "comment_plain", {
        commentIndex: index,
        commentIsSubmitter: comment.isSubmitter,
      });
    }
  });

  return candidates;
}

function hasExternalLinkCandidate(candidates: UrlCandidate[]): boolean {
  return candidates.some((candidate) => {
    const normalized = normalizeCandidateUrl(candidate.rawUrl);
    if (!normalized) return false;
    if (SKIP_URL_PATTERNS.some((pattern) => pattern.test(normalized))) {
      return false;
    }
    return !isRedditUrl(normalized);
  });
}

function hasDirectProductCandidate(candidates: UrlCandidate[]): boolean {
  return candidates.some((candidate) => {
    const normalized = normalizeCandidateUrl(candidate.rawUrl);
    if (!normalized) return false;
    return isProductUrl(normalized);
  });
}

const COMMENT_LINK_HINT_PATTERN =
  /(link\s+in\s+comments?|check\s+comments?|buy\s+link\s+in\s+comments?|see\s+comments?|comment\s+for\s+link)/i;

function shouldFetchCommentsForPost(post: RedditPost): boolean {
  const directCandidates = collectUrlCandidates(post, []);
  if (hasDirectProductCandidate(directCandidates)) {
    return false;
  }

  const combinedText = `${post.title} ${post.selftext}`;
  if (COMMENT_LINK_HINT_PATTERN.test(combinedText)) {
    return true;
  }

  return (
    post.is_self ||
    Boolean(post.preview?.images?.length) ||
    /reddit(it|media)\.com|redd\.it/i.test(post.url) ||
    hasExternalLinkCandidate(directCandidates)
  );
}

function scoreUrlCandidate(
  selectedUrl: string,
  candidate: UrlCandidate,
  detectedStore: string | null,
): number {
  let score = URL_SOURCE_WEIGHTS[candidate.source];
  const hasStoreDomain = matchesKnownStoreDomain(selectedUrl);

  if (hasStoreDomain || detectedStore) {
    score += 420;
  }

  if (candidate.commentIsSubmitter) {
    score += 260;
  }

  if (typeof candidate.commentIndex === "number") {
    score += Math.max(0, 45 - candidate.commentIndex * 4);
  }

  if (looksLikeProductPath(selectedUrl)) {
    score += 35;
  }

  if (isHomepageUrl(selectedUrl)) {
    score -= 40;
  }

  return score;
}

async function selectBestProductUrl(
  post: RedditPost,
  comments: ParsedCommentInput[],
): Promise<SelectedProductUrl> {
  const candidates = collectUrlCandidates(post, comments);
  const hadExternalCandidate = hasExternalLinkCandidate(candidates);
  const expansionCache = new Map<string, string>();

  let bestCandidate:
    | (SelectedProductUrl & {
        score: number;
        hasKnownStoreDomain: boolean;
        commentIsSubmitter: boolean;
      })
    | null = null;

  for (const candidate of candidates) {
    const rawUrl = normalizeCandidateUrl(candidate.rawUrl);
    if (!rawUrl) continue;

    let expandedUrl = expansionCache.get(rawUrl);
    if (!expandedUrl) {
      expandedUrl = normalizeCandidateUrl(await expandUrl(rawUrl));
      expansionCache.set(rawUrl, expandedUrl);
    }

    const expandedIsProduct = isProductUrl(expandedUrl);
    const rawIsProduct = isProductUrl(rawUrl);
    if (!expandedIsProduct && !rawIsProduct) {
      continue;
    }

    const finalUrl = expandedIsProduct ? expandedUrl : rawUrl;
    const detectedStore = detectStore(finalUrl) ?? detectStore(rawUrl);
    const hasKnownStoreDomain =
      matchesKnownStoreDomain(finalUrl) || Boolean(detectedStore);
    const score = scoreUrlCandidate(finalUrl, candidate, detectedStore);

    const shouldReplace =
      !bestCandidate ||
      score > bestCandidate.score ||
      (score === bestCandidate.score &&
        hasKnownStoreDomain &&
        !bestCandidate.hasKnownStoreDomain) ||
      (score === bestCandidate.score &&
        Boolean(candidate.commentIsSubmitter) &&
        !bestCandidate.commentIsSubmitter);

    if (shouldReplace) {
      bestCandidate = {
        rawProductUrl: rawUrl,
        productUrl: finalUrl,
        store: detectedStore,
        source: candidate.source,
        hadExternalCandidate,
        score,
        hasKnownStoreDomain,
        commentIsSubmitter: Boolean(candidate.commentIsSubmitter),
      };
    }
  }

  if (bestCandidate) {
    return {
      rawProductUrl: bestCandidate.rawProductUrl,
      productUrl: bestCandidate.productUrl,
      store: bestCandidate.store,
      source: bestCandidate.source,
      hadExternalCandidate,
    };
  }

  const fallback = `https://reddit.com${post.permalink}`;
  return {
    rawProductUrl: fallback,
    productUrl: fallback,
    store: null,
    source: "fallback_reddit_permalink",
    hadExternalCandidate,
  };
}

// Detect store from URL
function detectStore(url: string): string | null {
  for (const [store, patterns] of Object.entries(STORE_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(url))) {
      return store;
    }
  }
  return null;
}

// Known URL shortener domains — we expand these at scrape time so the real
// store URL is stored in the DB (enabling affiliate tag injection).
const URL_SHORTENER_PATTERNS = [
  /^amzn\.(?:to|com|in|co\.uk|de|ca|com\.au)$/i,
  /^myntr\.(in|it)$/i,
  /^ajio\.(co|me)$/i,
  /^ajiio\.(in|co|me)$/i,
  /^bitli\.in$/i,
  /^bittli\.in$/i,
  /^bit\.ly$/i,
  /^tinyurl\.com$/i,
  /^rb\.gy$/i,
] as const;

// Follow redirects to get the real URL from a shortener.
// Skips non-shortener URLs immediately. Always returns a URL (original on failure).
async function expandUrl(rawUrl: string): Promise<string> {
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, "");
    const isShortener = URL_SHORTENER_PATTERNS.some((p) => p.test(hostname));
    if (!isShortener) return rawUrl;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(rawUrl, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
    });

    clearTimeout(timeoutId);

    const expanded = response.url;
    logger.debug({ rawUrl, expanded }, "Expanded short URL");
    return expanded || rawUrl;
  } catch {
    return rawUrl;
  }
}

// Detect category from title and description using keyword scoring
function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  const scores: Record<string, number> = {};

  // Count keyword matches per category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        // Longer keywords get more weight (more specific)
        scores[category] += keyword.length > 5 ? 2 : 1;
      }
    }
  }

  // Find category with highest score
  let bestCategory = "other";
  let bestScore = 0;
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 0 ? bestCategory : "other";
}

// Clean title (remove "link in comments", emojis, excessive whitespace)
function cleanTitle(title: string): string {
  let cleaned = title
    // Remove specific phrases
    .replace(
      /(link\s+in\s+comments|check\s+comments|see\s+below|read\s+caption)/gi,
      "",
    )
    // Remove "HUGE DEAL", "MEGA SALE" type text if at start
    .replace(
      /^(huge|mega|super|bumper)\s+(deal|sale|discount|offer)s?[\s:-]*/gi,
      "",
    )
    // Remove emojis (simple range check)
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]/gu, "")
    // Remove lightning bolts etc
    .replace(/[⚡🔥🚨⚠️✨🎉]/g, "")
    // Remove excessive symbols
    .replace(/^[!\s\-\|]+|[!\s\-\|]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // If result is empty (was just emojis/spam), fallback to original (but trimmed)
  if (cleaned.length < 5) {
    return title.trim();
  }

  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// Fetch Open Graph image from URL
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogImages = $('meta[property="og:image"]')
      .map((_, el) => $(el).attr("content"))
      .get()
      .filter(Boolean) as string[];
    const twitterImages = $('meta[name="twitter:image"]')
      .map((_, el) => $(el).attr("content"))
      .get()
      .filter(Boolean) as string[];

    const allCandidates = [...ogImages, ...twitterImages]
      .map((candidate) => preferModernImageUrl(candidate))
      .filter((candidate): candidate is string => Boolean(candidate));

    if (allCandidates.length === 0) {
      return null;
    }

    // Prefer modern formats when available from metadata.
    const modernCandidate = allCandidates.find((candidate) =>
      /\.(avif|webp)(\?|$)/i.test(candidate),
    );
    return modernCandidate || allCandidates[0];
  } catch (error) {
    // Ignore fetch errors (timeout, blocked, etc.)
    return null;
  }
}

// Extract best image URL from post
async function extractImageUrl(
  post: RedditPost,
  productUrl: string,
): Promise<string | null> {
  let imageUrl: string | null = null;

  // Try preview images first
  if (post.preview?.images?.[0]) {
    const image = post.preview.images[0];
    const resolution = image.resolutions.find(
      (r) => r.width >= 300 && r.width <= 800,
    );
    if (resolution) {
      imageUrl = resolution.url.replace(/&amp;/g, "&");
    } else {
      imageUrl = image.source.url.replace(/&amp;/g, "&");
    }
  }

  // Try thumbnail
  if (!imageUrl && post.thumbnail && post.thumbnail.startsWith("http")) {
    imageUrl = post.thumbnail;
  }

  // Check if image is generic or missing, and try to fetch from product URL
  // If no image found, OR if it's the generic reddit thumbnail (often "default" or "self" which are handled above, but sometimes a small url)
  // For now, if we have a valid productUrl (not reddit) and no good image, let's fetch
  if (
    (!imageUrl ||
      imageUrl.includes("external-preview") ||
      imageUrl.includes("redditmedia")) &&
    isProductUrl(productUrl)
  ) {
    // We can try to fetch the OG image from the store
    // Only do this if we really need to (to avoid rate limits/slowdown)
    const ogImage = await fetchOgImage(productUrl);
    if (ogImage) {
      imageUrl = ogImage;
    }
  }

  return preferModernImageUrl(imageUrl);
}

// Parse a Reddit post into a deal
export async function parseRedditPost(
  post: RedditPost,
  comments: Array<RedditComment | string> = [],
): Promise<ParsedDeal | null> {
  const parsedComments = normalizeCommentInputs(comments);
  const flairText = (post.link_flair_text || "").trim();
  const fullText = `${post.title} ${post.selftext}`;
  const fullTextWithFlair = `${post.title} ${post.selftext} ${flairText}`;
  const subreddit = extractSubredditFromPermalink(post.permalink);

  // Completely block anything related to Flipkart
  const isFlipkart =
    /flipkart|fkrt|fktr/i.test(fullTextWithFlair) ||
    parsedComments.some((comment) => /flipkart|fkrt|fktr/i.test(comment.body));

  if (isFlipkart) {
    logger.debug({ postId: post.id }, "Skipping Flipkart/fkrt post entirely");
    return null;
  }

  if (
    containsAnyPattern(post.title, NON_DEAL_INTENT_PATTERNS) ||
    containsAnyPattern(flairText, NON_DEAL_FLAIR_PATTERNS)
  ) {
    logger.debug(
      { postId: post.id, subreddit, flairText, title: post.title },
      "Skipping non-deal post by title/flair pattern",
    );
    return null;
  }

  const selectedUrl = await selectBestProductUrl(post, parsedComments);
  const { productUrl, store } = selectedUrl;
  const { dealPrice, originalPrice, currency } = extractPrices(fullText);
  const discountPercent = extractDiscount(fullText, dealPrice, originalPrice);
  const categorySlug = detectCategory(fullText);

  const signals = evaluateDealSignals({
    subreddit,
    flairText,
    combinedText: fullTextWithFlair,
    selectedUrl,
    productUrl,
    store,
    dealPrice,
    originalPrice,
    discountPercent,
  });

  // If we only have Reddit permalink fallback, require strong text/price evidence.
  if (
    selectedUrl.source === "fallback_reddit_permalink" &&
    selectedUrl.hadExternalCandidate
  ) {
    logger.debug(
      {
        postId: post.id,
        subreddit,
        title: post.title,
        selectedUrlSource: selectedUrl.source,
      },
      "Skipping permalink fallback because external URL candidates were present",
    );
    return null;
  }

  if (
    selectedUrl.source === "fallback_reddit_permalink" &&
    !signals.hasPriceSignal &&
    !signals.hasStrongDealIntentSignal
  ) {
    logger.debug(
      {
        postId: post.id,
        subreddit,
        title: post.title,
        selectedUrlSource: selectedUrl.source,
      },
      "Skipping low-signal fallback permalink post",
    );
    return null;
  }

  if (signals.hasSupportIntentSignal) {
    logger.debug(
      {
        postId: post.id,
        subreddit,
        title: post.title,
        selectedUrlSource: selectedUrl.source,
      },
      "Skipping support/problem post",
    );
    return null;
  }

  // Reject low-confidence posts (especially from noisier subreddits).
  if (signals.score < signals.threshold) {
    logger.debug(
      {
        postId: post.id,
        subreddit,
        title: post.title,
        score: signals.score,
        threshold: signals.threshold,
        hasPriceSignal: signals.hasPriceSignal,
        hasStoreSignal: signals.hasStoreSignal,
        hasDealIntentSignal: signals.hasDealIntentSignal,
        hasNonDealIntentSignal: signals.hasNonDealIntentSignal,
        hasSupportIntentSignal: signals.hasSupportIntentSignal,
        selectedUrlSource: selectedUrl.source,
      },
      "Skipping low-confidence non-deal post",
    );
    return null;
  }

  // Async image extraction
  const imageUrl = await extractImageUrl(post, productUrl);

  // Skip if no useful price or URL info
  if (
    !dealPrice &&
    !discountPercent &&
    selectedUrl.source === "fallback_reddit_permalink"
  ) {
    logger.debug(
      { postId: post.id, title: post.title, urlSource: selectedUrl.source },
      "Skipping post - no deal info",
    );
    return null;
  }

  return {
    title: cleanTitle(post.title),
    description: post.selftext ? post.selftext.slice(0, 2000) : null,
    originalPrice,
    dealPrice,
    discountPercent,
    currency,
    productUrl,
    imageUrl,
    store,
    categorySlug,
    redditPostId: post.id,
    redditScore: post.score,
  };
}

// Parse multiple posts
export async function parseRedditPosts(
  posts: RedditPost[],
  fetchComments?: (postId: string) => Promise<Array<RedditComment | string>>,
): Promise<ParsedDeal[]> {
  const deals: ParsedDeal[] = [];

  for (const post of posts) {
    try {
      const comments =
        fetchComments && shouldFetchCommentsForPost(post)
          ? await fetchComments(post.id)
          : [];
      const deal = await parseRedditPost(post, comments);
      if (deal) {
        deals.push(deal);
      }
    } catch (err) {
      logger.error({ error: err, postId: post.id }, "Failed to parse post");
    }
  }

  return deals;
}

export default {
  parseRedditPost,
  parseRedditPosts,
  extractPrice,
  extractPrices,
  detectStore,
  detectCategory,
};
