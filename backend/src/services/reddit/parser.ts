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
    "laptop", "phone", "mobile", "tablet", "headphone", "earphone", "earbud",
    "speaker", "tv", "television", "monitor", "camera", "smartwatch", "watch",
    "charger", "powerbank", "ssd", "hdd", "ram", "processor", "gpu", "keyboard",
    "mouse", "router", "wifi", "bluetooth", "usb", "hdmi", "adapter",
  ],
  fashion: [
    "shirt", "tshirt", "t-shirt", "jeans", "trouser", "pant", "dress", "kurta",
    "saree", "lehenga", "jacket", "hoodie", "sweater", "shoe", "sneaker",
    "sandal", "slipper", "bag", "handbag", "wallet", "belt", "watch", "sunglass",
  ],
  gaming: [
    "game", "gaming", "ps5", "playstation", "xbox", "nintendo", "switch",
    "controller", "joystick", "gaming mouse", "gaming keyboard", "gaming headset",
    "steam", "epic games", "gpu", "graphics card", "rtx", "gtx",
  ],
  "home-kitchen": [
    "kitchen", "cookware", "utensil", "mixer", "grinder", "blender", "microwave",
    "oven", "refrigerator", "fridge", "washing machine", "ac", "air conditioner",
    "fan", "cooler", "heater", "vacuum", "iron", "mattress", "pillow", "bedsheet",
    "curtain", "furniture", "sofa", "chair", "table", "lamp", "light",
  ],
  beauty: [
    "beauty", "skincare", "makeup", "cosmetic", "lipstick", "foundation",
    "mascara", "perfume", "fragrance", "shampoo", "conditioner", "hair",
    "moisturizer", "serum", "sunscreen", "face wash", "lotion", "cream",
  ],
  "food-groceries": [
    "food", "grocery", "snack", "chocolate", "biscuit", "chips", "drink",
    "beverage", "coffee", "tea", "rice", "dal", "oil", "masala", "spice",
    "fruit", "vegetable", "meat", "chicken", "fish", "dairy", "milk", "curd",
  ],
  "mobile-accessories": [
    "mobile cover", "phone case", "screen protector", "tempered glass",
    "mobile stand", "phone holder", "car mount", "wireless charger", "fast charger",
    "data cable", "usb cable", "type-c", "lightning", "airpods", "buds",
  ],
  "books-stationery": [
    "book", "novel", "textbook", "notebook", "diary", "pen", "pencil",
    "marker", "highlighter", "eraser", "sharpener", "ruler", "calculator",
    "backpack", "school bag", "stationery", "art supply",
  ],
  travel: [
    "flight", "hotel", "booking", "travel", "trip", "vacation", "holiday",
    "luggage", "suitcase", "trolley", "passport", "visa", "ticket",
    "train", "bus", "cab", "uber", "ola", "makemytrip", "goibibo", "cleartrip",
  ],
};

export interface ParsedDeal {
  title: string;
  description: string | null;
  originalPrice: number | null;
  dealPrice: number | null;
  discountPercent: number | null;
  productUrl: string;
  imageUrl: string | null;
  store: string | null;
  categorySlug: string;
  redditPostId: string;
  redditScore: number;
}

// Extract price from text (handles ₹, Rs, INR formats)
function extractPrice(text: string): number | null {
  // Match patterns like ₹1,999, Rs. 1999, Rs 1,999.00, INR 1999
  const pricePatterns = [
    /₹\s*([\d,]+(?:\.\d{2})?)/,
    /Rs\.?\s*([\d,]+(?:\.\d{2})?)/i,
    /INR\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:price|cost|mrp|offer)[\s:]*₹?\s*([\d,]+(?:\.\d{2})?)/i,
  ];

  for (const pattern of pricePatterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(price) && price > 0 && price < 10000000) {
        return price;
      }
    }
  }

  return null;
}

// Extract deal price and original price
function extractPrices(text: string): { dealPrice: number | null; originalPrice: number | null } {
  // Look for patterns like "₹999 (MRP ₹1999)" or "Rs 999 from Rs 1999"
  const dealPatterns = [
    /₹\s*([\d,]+).*?(?:mrp|was|from|original|reg).*?₹?\s*([\d,]+)/i,
    /Rs\.?\s*([\d,]+).*?(?:mrp|was|from|original|reg).*?Rs\.?\s*([\d,]+)/i,
    /([\d,]+).*?(?:instead of|was|from).*?([\d,]+)/i,
  ];

  for (const pattern of dealPatterns) {
    const match = text.match(pattern);
    if (match) {
      const price1 = parseFloat(match[1].replace(/,/g, ""));
      const price2 = parseFloat(match[2].replace(/,/g, ""));
      
      if (!isNaN(price1) && !isNaN(price2)) {
        // Lower price is deal price, higher is original
        return {
          dealPrice: Math.min(price1, price2),
          originalPrice: Math.max(price1, price2),
        };
      }
    }
  }

  // Just extract single price
  const singlePrice = extractPrice(text);
  return { dealPrice: singlePrice, originalPrice: null };
}

// Extract discount percentage
function extractDiscount(text: string, dealPrice: number | null, originalPrice: number | null): number | null {
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
    const discount = Math.round(((originalPrice - dealPrice) / originalPrice) * 100);
    if (discount > 0 && discount <= 100) {
      return discount;
    }
  }

  return null;
}

// Extract product URL from post
function extractProductUrl(post: RedditPost): string {
  // If it's a link post, use the URL
  if (!post.is_self && post.url && !post.url.includes("reddit.com")) {
    return post.url;
  }

  // Try to find URL in selftext
  const urlMatch = post.selftext.match(/https?:\/\/[^\s\)]+/);
  if (urlMatch) {
    return urlMatch[0];
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

// Extract best image URL from post
function extractImageUrl(post: RedditPost): string | null {
  // Try preview images first
  if (post.preview?.images?.[0]) {
    const image = post.preview.images[0];
    // Get a reasonable resolution (not too large)
    const resolution = image.resolutions.find((r) => r.width >= 300 && r.width <= 800);
    if (resolution) {
      return resolution.url.replace(/&amp;/g, "&");
    }
    return image.source.url.replace(/&amp;/g, "&");
  }

  // Try thumbnail
  if (post.thumbnail && post.thumbnail.startsWith("http")) {
    return post.thumbnail;
  }

  return null;
}

// Parse a Reddit post into a deal
export function parseRedditPost(post: RedditPost): ParsedDeal | null {
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
  const { dealPrice, originalPrice } = extractPrices(fullText);
  const discountPercent = extractDiscount(fullText, dealPrice, originalPrice);
  const store = detectStore(productUrl);
  const categorySlug = detectCategory(fullText);
  const imageUrl = extractImageUrl(post);

  // Skip if no useful price or URL info
  if (!dealPrice && !discountPercent && productUrl.includes("reddit.com")) {
    logger.debug({ postId: post.id, title: post.title }, "Skipping post - no deal info");
    return null;
  }

  return {
    title: post.title.slice(0, 200),
    description: post.selftext ? post.selftext.slice(0, 2000) : null,
    originalPrice,
    dealPrice,
    discountPercent,
    productUrl,
    imageUrl,
    store,
    categorySlug,
    redditPostId: post.id,
    redditScore: post.score,
  };
}

// Parse multiple posts
export function parseRedditPosts(posts: RedditPost[]): ParsedDeal[] {
  const deals: ParsedDeal[] = [];

  for (const post of posts) {
    try {
      const deal = parseRedditPost(post);
      if (deal) {
        deals.push(deal);
      }
    } catch (error) {
      logger.error({ error, postId: post.id }, "Failed to parse post");
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
