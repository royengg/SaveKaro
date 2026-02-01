import * as cheerio from "cheerio";
import { RedditPost } from "./client";
import logger from "../../lib/logger";

// Store patterns for common Indian e-commerce sites
const STORE_PATTERNS: Record<string, RegExp[]> = {
  Amazon: [/amazon\.in/i, /amzn\.to/i, /amazon\.com/i],
  Flipkart: [/flipkart\.com/i, /fkrt\.it/i],
  Myntra: [/myntra\.com/i],
  Ajio: [/ajio\.com/i],
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
    "shirt",
    "tshirt",
    "t-shirt",
    "jeans",
    "trouser",
    "pant",
    "dress",
    "kurta",
    "saree",
    "lehenga",
    "jacket",
    "hoodie",
    "sweater",
    "shoe",
    "sneaker",
    "sandal",
    "slipper",
    "bag",
    "handbag",
    "wallet",
    "belt",
    "watch",
    "sunglass",
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

// Extract product URL from post
function extractProductUrl(post: RedditPost): string {
  // First, try to find a store URL in the selftext (most reliable)
  const urlMatches = post.selftext.match(/https?:\/\/[^\s\)\]]+/g) || [];
  for (const url of urlMatches) {
    if (isProductUrl(url)) {
      return url;
    }
  }

  // If it's a link post and URL is not a Reddit/image URL, use it
  if (!post.is_self && post.url && isProductUrl(post.url)) {
    return post.url;
  }

  // Also check the title for URLs (some posts have URLs in title)
  const titleUrls = post.title.match(/https?:\/\/[^\s\)\]]+/g) || [];
  for (const url of titleUrls) {
    if (isProductUrl(url)) {
      return url;
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

// Detect category from title and description
function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return "other";
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
): Promise<ParsedDeal | null> {
  const fullText = `${post.title} ${post.selftext}`;

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

  const productUrl = extractProductUrl(post);
  const { dealPrice, originalPrice, currency } = extractPrices(fullText);
  const discountPercent = extractDiscount(fullText, dealPrice, originalPrice);
  const store = detectStore(productUrl);
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
): Promise<ParsedDeal[]> {
  const deals: ParsedDeal[] = [];

  // Parse in parallel but with some concurrency limit if needed (for now Promise.all is fine for 50 posts)
  // Since we might be fetching images, let's do batches or just all

  const results = await Promise.all(
    posts.map((post) =>
      parseRedditPost(post).catch((err) => {
        logger.error({ error: err, postId: post.id }, "Failed to parse post");
        return null;
      }),
    ),
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
