import * as cheerio from "cheerio";
import { RedditPost } from "./client";
import logger from "../../lib/logger";

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
    /amzn\.to/i,
    /amzn\.com/i,
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
  Ajio: [/ajio\.com/i, /ajiio\.in/i],
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
];

// Check if URL is a store/product URL (not an image or Reddit link)
function isProductUrl(url: string): boolean {
  // Skip Reddit and image URLs
  if (SKIP_URL_PATTERNS.some((pattern) => pattern.test(url))) {
    return false;
  }
  if (url.includes("reddit.com")) {
    return false;
  }
  return true;
}

// Extract product URL from post and optionally from comments
function extractProductUrl(post: RedditPost, comments: string[] = []): string {
  // Collect all potential URLs from post content
  const allUrls: string[] = [];

  // 1. Extract markdown links [text](url) from selftext
  const markdownLinks =
    post.selftext.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/g) || [];
  for (const link of markdownLinks) {
    const urlMatch = link.match(/\((https?:\/\/[^\s\)]+)\)/);
    if (urlMatch) allUrls.push(urlMatch[1]);
  }

  // 2. Extract plain URLs from selftext
  const plainUrls =
    post.selftext.match(/(?<!\()https?:\/\/[^\s\)\]<>]+/g) || [];
  allUrls.push(...plainUrls);

  // 3. Add post URL if it's a link post
  if (!post.is_self && post.url) {
    allUrls.push(post.url);
  }

  // 4. Check title for URLs
  const titleUrls = post.title.match(/https?:\/\/[^\s\)\]]+/g) || [];
  allUrls.push(...titleUrls);

  // 5. Extract URLs from comments (often "link in comments")
  for (const comment of comments) {
    // Markdown links in comments
    const commentMdLinks =
      comment.match(/\[.*?\]\((https?:\/\/[^\s\)]+)\)/g) || [];
    for (const link of commentMdLinks) {
      const urlMatch = link.match(/\((https?:\/\/[^\s\)]+)\)/);
      if (urlMatch) allUrls.push(urlMatch[1]);
    }
    // Plain URLs in comments
    const commentUrls = comment.match(/(?<!\()https?:\/\/[^\s\)\]<>]+/g) || [];
    allUrls.push(...commentUrls);
  }

  // First pass: prioritize known store URLs
  for (const url of allUrls) {
    if (!isProductUrl(url)) continue;
    // Check if it matches any known store
    for (const patterns of Object.values(STORE_PATTERNS)) {
      if (patterns.some((pattern) => pattern.test(url))) {
        return url.replace(/[\)\]]+$/, ""); // Clean trailing brackets
      }
    }
  }

  // Second pass: any valid product URL
  for (const url of allUrls) {
    if (isProductUrl(url)) {
      return url.replace(/[\)\]]+$/, ""); // Clean trailing brackets
    }
  }

  // Fallback to Reddit permalink
  return `https://reddit.com${post.permalink}`;
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
  /^amzn\.to$/i,
  /^myntr\.(in|it)$/i,
  /^ajiio\.in$/i,
  /^bittli\.in$/i,
  /^bit\.ly$/i,
  /^tinyurl\.com$/i,
  /^rb\.gy$/i,
];

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

    // Try og:image
    let imageUrl = $('meta[property="og:image"]').attr("content");

    // Try twitter:image
    if (!imageUrl) {
      imageUrl = $('meta[name="twitter:image"]').attr("content");
    }

    return imageUrl || null;
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

  return imageUrl;
}

// Parse a Reddit post into a deal
export async function parseRedditPost(
  post: RedditPost,
  comments: string[] = [],
): Promise<ParsedDeal | null> {
  const fullText = `${post.title} ${post.selftext}`;

  // Completely block anything related to Flipkart
  const isFlipkart =
    /flipkart|fkrt/i.test(fullText) ||
    comments.some((c) => /flipkart|fkrt/i.test(c));

  if (isFlipkart) {
    logger.debug({ postId: post.id }, "Skipping Flipkart/fkrt post entirely");
    return null;
  }

  // Skip non-deal posts
  const skipPatterns = [
    /\[meta\]/i,
    /\[question\]/i,
    /\[discussion\]/i,
    /looking for/i,
    /suggest me/i,
    /help needed/i,
    /which one/i,
  ];

  if (skipPatterns.some((pattern) => pattern.test(post.title))) {
    return null;
  }

  const rawProductUrl = extractProductUrl(post, comments);
  // Expand short URLs (amzn.to, fkrt.cc, myntr.in etc.) so the real store
  // hostname is stored — this allows affiliate tag injection to work.
  const productUrl = await expandUrl(rawProductUrl);
  const { dealPrice, originalPrice, currency } = extractPrices(fullText);
  const discountPercent = extractDiscount(fullText, dealPrice, originalPrice);
  const store = detectStore(productUrl) ?? detectStore(rawProductUrl);
  const categorySlug = detectCategory(fullText);

  // Async image extraction
  const imageUrl = await extractImageUrl(post, productUrl);

  // Skip if no useful price or URL info
  if (!dealPrice && !discountPercent && productUrl.includes("reddit.com")) {
    logger.debug(
      { postId: post.id, title: post.title },
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
  fetchComments?: (postId: string) => Promise<string[]>,
): Promise<ParsedDeal[]> {
  const deals: ParsedDeal[] = [];

  // Parse with optional comment fetching for URL extraction
  const results = await Promise.all(
    posts.map(async (post) => {
      try {
        // Fetch comments if fetcher provided (for "link in comments" pattern)
        const comments = fetchComments ? await fetchComments(post.id) : [];
        return await parseRedditPost(post, comments);
      } catch (err) {
        logger.error({ error: err, postId: post.id }, "Failed to parse post");
        return null;
      }
    }),
  );

  for (const deal of results) {
    if (deal) {
      deals.push(deal);
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
