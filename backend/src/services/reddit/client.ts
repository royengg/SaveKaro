import logger from "../../lib/logger";

const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID || "";
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET || "";
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || "DealHunt/1.0";

interface RedditToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: RedditToken | null = null;

// Get Reddit OAuth access token
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const credentials = Buffer.from(
    `${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`,
  ).toString("base64");

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": REDDIT_USER_AGENT,
    },
    body: "grant_type=client_credentials",
  });

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
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // Expire 60s early
  };

  logger.info("Reddit OAuth token refreshed");
  return cachedToken.accessToken;
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

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": REDDIT_USER_AGENT,
    },
  });

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

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": REDDIT_USER_AGENT,
    },
  });

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

    const response = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/about`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": REDDIT_USER_AGENT,
        },
      },
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

export default {
  fetchSubredditPosts,
  searchSubreddit,
  getAccessToken,
  validateSubreddit,
};
