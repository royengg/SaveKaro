import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface PageMetaOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  type?: "website" | "article";
}

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://savekaro.online").replace(/\/$/, "");

function ensureMeta(selector: string, create: () => HTMLMetaElement): HTMLMetaElement {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    return existing;
  }

  const element = create();
  document.head.appendChild(element);
  return element;
}

function ensureLink(selector: string, create: () => HTMLLinkElement): HTMLLinkElement {
  const existing = document.head.querySelector<HTMLLinkElement>(selector);
  if (existing) {
    return existing;
  }

  const element = create();
  document.head.appendChild(element);
  return element;
}

function buildAbsoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath}`;
}

export function usePageMeta({
  title,
  description,
  canonicalPath,
  type = "website",
}: PageMetaOptions) {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = title.includes("SaveKaro") ? title : `${title} | SaveKaro`;
    const url = buildAbsoluteUrl(canonicalPath ?? location.pathname);

    document.title = pageTitle;

    const descriptionMeta = ensureMeta('meta[name="description"]', () => {
      const meta = document.createElement("meta");
      meta.name = "description";
      return meta;
    });
    descriptionMeta.content = description;

    const canonicalLink = ensureLink('link[rel="canonical"]', () => {
      const link = document.createElement("link");
      link.rel = "canonical";
      return link;
    });
    canonicalLink.href = url;

    const ogTitle = ensureMeta('meta[property="og:title"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:title");
      return meta;
    });
    ogTitle.content = pageTitle;

    const ogDescription = ensureMeta('meta[property="og:description"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:description");
      return meta;
    });
    ogDescription.content = description;

    const ogUrl = ensureMeta('meta[property="og:url"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:url");
      return meta;
    });
    ogUrl.content = url;

    const ogType = ensureMeta('meta[property="og:type"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:type");
      return meta;
    });
    ogType.content = type;

    const twitterTitle = ensureMeta('meta[name="twitter:title"]', () => {
      const meta = document.createElement("meta");
      meta.name = "twitter:title";
      return meta;
    });
    twitterTitle.content = pageTitle;

    const twitterDescription = ensureMeta('meta[name="twitter:description"]', () => {
      const meta = document.createElement("meta");
      meta.name = "twitter:description";
      return meta;
    });
    twitterDescription.content = description;
  }, [canonicalPath, description, location.pathname, title, type]);
}

export default usePageMeta;
