import { expect, mock, test } from "bun:test";
import type { RedditPost } from "./client";

mock.module("../../lib/logger", () => ({
  default: { info() {}, debug() {}, warn() {}, error() {} },
}));
const { parseRedditPosts } = await import("./parser");
const post: RedditPost = {
  id: "post",
  name: "t3_post",
  title: "Laptop deal ₹999 - link in comments",
  selftext: "",
  url: "https://reddit.com/r/test/comments/post",
  permalink: "/r/test/comments/post",
  score: 1,
  created_utc: 1,
  thumbnail: "",
  is_self: true,
  domain: "reddit.com",
};

test("comment retrieval failures reject the batch rather than silently dropping the post", async () => {
  const failure = new Error("temporary comments failure");
  const comments = mock(async () => {
    throw failure;
  });
  await expect(parseRedditPosts([post], comments)).rejects.toBe(failure);
  expect(comments).toHaveBeenCalledTimes(1);
});

test("a later parse failure rejects an otherwise partially parsed batch", async () => {
  const first = {
    ...post,
    id: "first",
    name: "t3_first",
    title: "Laptop deal ₹999 50% off",
    url: "https://amazon.in/dp/B012345678",
    is_self: false,
    preview: {
      images: [
        {
          source: {
            url: "https://images.example.test/laptop.webp",
            width: 500,
            height: 500,
          },
          resolutions: [],
        },
      ],
    },
  };
  const failure = new Error("comments unavailable");
  await expect(
    parseRedditPosts([first, post], async () => {
      throw failure;
    }),
  ).rejects.toBe(failure);
});

test("intentional non-deal filtering still returns a successful empty batch", async () => {
  const comments = mock(async () => []);
  const filtered = { ...post, title: "Flipkart deal ₹999" };
  await expect(parseRedditPosts([filtered], comments)).resolves.toEqual([]);
});

test("a valid direct-product post remains parseable without comment requests", async () => {
  const comments = mock(async () => {
    throw new Error("must not fetch unnecessary comments");
  });
  const result = await parseRedditPosts(
    [
      {
        ...post,
        title: "Laptop deal ₹999 50% off",
        url: "https://amazon.in/dp/B012345678",
        is_self: false,
        preview: {
          images: [
            {
              source: {
                url: "https://images.example.test/laptop.webp",
                width: 500,
                height: 500,
              },
              resolutions: [],
            },
          ],
        },
      },
    ],
    comments,
  );
  expect(result).toHaveLength(1);
  expect(result[0]!.redditPostId).toBe("post");
  expect(comments).not.toHaveBeenCalled();
});
