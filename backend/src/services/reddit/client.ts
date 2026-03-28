import logger from "../../lib/logger";
import { REDDIT_THROTTLE } from "../../config/constants";

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || "";
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || "";
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || "SaveKaro/1.0";

interface RedditToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: RedditToken | null = null;
let tokenPromise: Promise<string> | null = null;
let redditRequestChain: Promise<void> = Promise.resolve();
let nextAllowedRequestAt = 0;
let redditCooldownUntil = 0;
let redditShutdownRequested = false;
const pendingSleepTimers = new Set<ReturnType<typeof setTimeout>>();

function sleep(ms: number): Promise<void> {
  if (ms <= 0 || redditShutdownRequested) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingSleepTimers.delete(timer);
      resolve();
    }, ms);

    pendingSleepTimers.add(timer);
  });
}

function ensureRedditClientAvailable() {
  if (redditShutdownRequested) {
    throw new Error("Reddit client shutting down");
  }
}

export function signalRedditShutdown() {
  if (redditShutdownRequested) {
    return;
  }

  redditShutdownRequested = true;
  redditCooldownUntil = 0;
  nextAllowedRequestAt = 0;

  for (const timer of pendingSleepTimers) {
    clearTimeout(timer);
  }
  pendingSleepTimers.clear();
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number.parseInt(value, 10);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryDate = Date.parse(value);
  if (!Number.isNaN(retryDate)) {
    return Math.max(0, retryDate - Date.now());
  }

  return null;
}

function noteRedditRateLimit(
  context: Record<string, unknown>,
  retryAfterHeader: string | null,
) {
  const retryAfterMs =
    parseRetryAfterMs(retryAfterHeader) ?? REDDIT_THROTTLE.COOLDOWN_MS;
  redditCooldownUntil = Math.max(redditCooldownUntil, Date.now() + retryAfterMs);
  nextAllowedRequestAt = Math.max(
    nextAllowedRequestAt,
    redditCooldownUntil + REDDIT_THROTTLE.REQUEST_GAP_MS,
  );

  logger.warn(
    {
      ...context,
      retryAfterMs,
      cooldownUntil: new Date(redditCooldownUntil).toISOString(),
    },
    "Reddit API rate limited; entering cooldown",
  );
}

async function withRedditRequestSlot<T>(
  context: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const run = redditRequestChain.catch(() => undefined).then(async () => {
    ensureRedditClientAvailable();

    const cooldownWaitMs = Math.max(0, redditCooldownUntil - Date.now());
    if (cooldownWaitMs > 0) {
      logger.warn(
        { ...context, cooldownWaitMs },
        "Waiting for Reddit cooldown before next request",
      );
      await sleep(cooldownWaitMs);
    }

    const gapWaitMs = Math.max(0, nextAllowedRequestAt - Date.now());
    if (gapWaitMs > 0) {
      await sleep(gapWaitMs);
    }

    ensureRedditClientAvailable();
    nextAllowedRequestAt = Date.now() + REDDIT_THROTTLE.REQUEST_GAP_MS;
    return fn();
  });

  redditRequestChain = run.then(
    () => undefined,
    () => undefined,
  );

  return run;
}

async function redditFetch(
  url: string,
  init: RequestInit,
  context: Record<string, unknown>,
): Promise<Response> {
  ensureRedditClientAvailable();
  return withRedditRequestSlot(context, async () => {
    const response = await fetch(url, init);
    if (response.status === 429) {
      noteRedditRateLimit(context, response.headers.get("retry-after"));
    }
    return response;
  });
}

// Get Reddit OAuth access token
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    const credentials = Buffer.from(
      `${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`,
    ).toString("base64");

    const response = await redditFetch(
      "https://www.reddit.com/api/v1/access_token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": REDDIT_USER_AGENT,
        },
        body: "grant_type=client_credentials",
      },
      { operation: "access_token" },
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error(
        { error, status: response.status },
        "Failed to get Reddit access token",
      );
      throw new Error("Failed to authenticate with Reddit");
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    logger.info("Reddit OAuth token refreshed");
    return cachedToken.accessToken;
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

export interface RedditPost {
  id: string;
  name: string; // Fullname (t3_id)
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  score: number;
  created_utc: number;
  thumbnail: string;
  preview?: {
    images: Array<{
      source: { url: string; width: number; height: number };
      resolutions: Array<{ url: string; width: number; height: number }>;
    }>;
  };
  link_flair_text?: string;
  is_self: boolean;
  domain: string;
}

export interface SubredditListing {
  kind: string;
  data: {
    children: Array<{
      kind: string;
      data: RedditPost;
    }>;
    after: string | null;
    before: string | null;
  };
}

export interface RedditComment {
  body: string;
  author: string | null;
  isSubmitter: boolean;
  createdUtc: number | null;
}

// Fetch posts from a subreddit
export async function fetchSubredditPosts(
  subreddit: string,
  options: {
    sort?: "hot" | "new" | "top" | "rising";
    limit?: number;
    after?: string;
    before?: string;
    time?: "hour" | "day" | "week" | "month" | "year" | "all";
  } = {},
): Promise<RedditPost[]> {
  const { sort = "new", limit = 50, after, before, time = "day" } = options;

  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    limit: limit.toString(),
    raw_json: "1",
  });

  if (after) params.append("after", after);
  if (before) params.append("before", before);
  if (sort === "top") params.append("t", time);

  const url = `https://oauth.reddit.com/r/${subreddit}/${sort}?${params}`;

  const response = await redditFetch(
    url,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": REDDIT_USER_AGENT,
      },
    },
    { operation: "fetch_subreddit_posts", subreddit, sort, limit },
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error(
      { error, status: response.status, subreddit },
      "Failed to fetch subreddit posts",
    );
    throw new Error(`Failed to fetch posts from r/${subreddit}`);
  }

  const listing = (await response.json()) as SubredditListing;

  return listing.data.children.map((child) => child.data);
}

// Search subreddit for specific terms
export async function searchSubreddit(
  subreddit: string,
  query: string,
  options: { limit?: number; sort?: "relevance" | "new" | "top" } = {},
): Promise<RedditPost[]> {
  const { limit = 25, sort = "new" } = options;

  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    q: query,
    restrict_sr: "true",
    limit: limit.toString(),
    sort,
    raw_json: "1",
  });

  const url = `https://oauth.reddit.com/r/${subreddit}/search?${params}`;

  const response = await redditFetch(
    url,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": REDDIT_USER_AGENT,
      },
    },
    { operation: "search_subreddit", subreddit, sort, limit },
  );

  if (!response.ok) {
    const error = await response.text();
    logger.error(
      { error, status: response.status },
      "Failed to search subreddit",
    );
    throw new Error(`Failed to search r/${subreddit}`);
  }

  const listing = (await response.json()) as SubredditListing;

  return listing.data.children.map((child) => child.data);
}

// Validate if a subreddit exists
export async function validateSubreddit(subreddit: string): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();

    const response = await redditFetch(
      `https://oauth.reddit.com/r/${subreddit}/about`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": REDDIT_USER_AGENT,
        },
      },
      { operation: "validate_subreddit", subreddit },
    );

    if (!response.ok) {
      logger.warn(
        { subreddit, status: response.status },
        "Subreddit validation failed",
      );
      return false;
    }

    const data = (await response.json()) as {
      kind: string;
      data?: { subreddit_type?: string; over18?: boolean };
    };

    // Check if it's a valid subreddit (kind t5 = subreddit)
    // Accept public and restricted subreddits (just not private or banned)
    if (data.kind === "t5") {
      const subType = data.data?.subreddit_type;
      if (subType === "private") {
        logger.warn({ subreddit }, "Subreddit is private, skipping");
        return false;
      }
      logger.info(
        { subreddit, type: subType },
        "Subreddit validated successfully",
      );
      return true;
    }

    logger.warn({ subreddit, kind: data.kind }, "Invalid subreddit response");
    return false;
  } catch (error) {
    logger.error({ error, subreddit }, "Failed to validate subreddit");
    return false;
  }
}

// Fetch comments for a post to extract URLs
export async function fetchPostComments(
  subreddit: string,
  postId: string,
  limit: number = 10,
): Promise<RedditComment[]> {
  try {
    const accessToken = await getAccessToken();

    const url = `https://oauth.reddit.com/r/${subreddit}/comments/${postId}?limit=${limit}&depth=1&sort=old&raw_json=1`;

    const response = await redditFetch(
      url,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": REDDIT_USER_AGENT,
        },
      },
      { operation: "fetch_post_comments", subreddit, postId, limit },
    );

    if (!response.ok) {
      logger.warn(
        { postId, status: response.status },
        "Failed to fetch comments",
      );
      return [];
    }

    // Reddit returns [post, comments] array
    const data = (await response.json()) as [
      unknown,
      {
        data: {
          children: Array<{
            kind: string;
            data: {
              body?: string;
              author?: string;
              is_submitter?: boolean;
              created_utc?: number;
            };
          }>;
        };
      },
    ];

    // Extract top-level comments (t1 only, skip "more" placeholders)
    const comments = data[1]?.data?.children || [];
    return comments
      .filter((entry) => entry.kind === "t1" && typeof entry.data.body === "string")
      .map((entry) => ({
        body: (entry.data.body || "").trim(),
        author: entry.data.author ?? null,
        isSubmitter: Boolean(entry.data.is_submitter),
        createdUtc:
          typeof entry.data.created_utc === "number"
            ? entry.data.created_utc
            : null,
      }))
      .filter((comment) => comment.body.length > 0);
  } catch (error) {
    logger.error({ error, postId }, "Error fetching post comments");
    return [];
  }
}

export default {
  fetchSubredditPosts,
  searchSubreddit,
  getAccessToken,
  validateSubreddit,
  fetchPostComments,
};
