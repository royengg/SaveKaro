import { Hono } from "hono";
import prisma from "../lib/prisma";
import { preferModernImageUrl } from "../lib/image";
import { stripHtml } from "../lib/sanitize";

const dealPreview = new Hono();

const FRONTEND_URL = (
  process.env.FRONTEND_URL || "https://savekaro.online"
).replace(/\/$/, "");

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function formatMoney(value: string | null, currency = "INR"): string | null {
  if (!value) {
    return null;
  }

  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) {
    return null;
  }

  const locale = currency === "INR" ? "en-IN" : "en-US";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function buildDescription(deal: {
  description: string | null;
  store: string | null;
  discountPercent: number | null;
  dealPrice: string | null;
  currency: string;
}): string {
  const cleanedDescription = deal.description ? stripHtml(deal.description) : "";
  if (cleanedDescription) {
    return truncateText(cleanedDescription, 180);
  }

  const fallbackParts = [
    deal.store ? `Store: ${deal.store}` : null,
    typeof deal.discountPercent === "number"
      ? `${deal.discountPercent}% off`
      : null,
    formatMoney(deal.dealPrice, deal.currency)
      ? `Price: ${formatMoney(deal.dealPrice, deal.currency)}`
      : null,
    "Open this deal on SaveKaro.",
  ].filter(Boolean);

  return fallbackParts.join(". ");
}

function buildImageUrl(imageUrl: string | null): string {
  const preferredImageUrl = preferModernImageUrl(imageUrl);
  if (!preferredImageUrl) {
    return `${FRONTEND_URL}/og-image.png`;
  }

  try {
    return new URL(preferredImageUrl).toString();
  } catch {
    return `${FRONTEND_URL}/${preferredImageUrl.replace(/^\/+/, "")}`;
  }
}

function renderPreviewHtml(params: {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
}) {
  const title = escapeHtml(params.title);
  const description = escapeHtml(params.description);
  const canonicalUrl = escapeHtml(params.canonicalUrl);
  const imageUrl = escapeHtml(params.imageUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="SaveKaro" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:alt" content="${title}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <style>
      body {
        margin: 0;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f7f7f8;
        color: #111111;
      }

      .wrap {
        display: grid;
        min-height: 100vh;
        place-items: center;
        padding: 24px;
      }

      .card {
        width: min(560px, 100%);
        overflow: hidden;
        border: 1px solid rgba(17, 17, 17, 0.08);
        border-radius: 24px;
        background: #ffffff;
        box-shadow: 0 24px 80px -40px rgba(15, 23, 42, 0.28);
      }

      .media {
        aspect-ratio: 1.91 / 1;
        background: linear-gradient(180deg, #fff6f8 0%, #ffffff 100%);
      }

      .media img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .content {
        padding: 20px 20px 22px;
      }

      .eyebrow {
        margin: 0 0 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: rgba(17, 17, 17, 0.56);
      }

      h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.08;
        letter-spacing: -0.03em;
      }

      p {
        margin: 12px 0 0;
        font-size: 15px;
        line-height: 1.55;
        color: rgba(17, 17, 17, 0.72);
      }

      a {
        display: inline-flex;
        margin-top: 16px;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0 18px;
        border-radius: 999px;
        background: #e60023;
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main class="wrap">
      <article class="card">
        <div class="media">
          <img src="${imageUrl}" alt="${title}" />
        </div>
        <div class="content">
          <p class="eyebrow">SaveKaro Deal</p>
          <h1>${title}</h1>
          <p>${description}</p>
          <a href="${canonicalUrl}">Open on SaveKaro</a>
        </div>
      </article>
    </main>
  </body>
</html>`;
}

dealPreview.get("/deal/:id", async (c) => {
  const id = c.req.param("id");
  const deal = await prisma.deal.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      cleanTitle: true,
      description: true,
      store: true,
      discountPercent: true,
      dealPrice: true,
      currency: true,
      imageUrl: true,
    },
  });

  if (!deal) {
    const canonicalUrl = `${FRONTEND_URL}/deal/${encodeURIComponent(id)}`;
    return c.html(
      renderPreviewHtml({
        title: "SaveKaro deal not found",
        description:
          "This deal may have expired, been removed, or the link may be incorrect.",
        canonicalUrl,
        imageUrl: `${FRONTEND_URL}/og-image.png`,
      }),
      404,
    );
  }

  const canonicalUrl = `${FRONTEND_URL}/deal/${encodeURIComponent(deal.id)}`;
  const title = stripHtml(deal.cleanTitle || deal.title || "SaveKaro deal");
  const description = buildDescription(deal);
  const imageUrl = buildImageUrl(deal.imageUrl);

  c.header(
    "Cache-Control",
    "public, max-age=300, s-maxage=300, stale-while-revalidate=300, stale-if-error=1800",
  );

  return c.html(
    renderPreviewHtml({
      title,
      description,
      canonicalUrl,
      imageUrl,
    }),
  );
});

export default dealPreview;
