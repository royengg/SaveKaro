export function preferModernImageUrl(
  url: string | null | undefined,
): string | null {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    const modernPath = parsed.pathname.toLowerCase();
    if (modernPath.endsWith(".avif") || modernPath.endsWith(".webp")) {
      return parsed.toString();
    }

    // Reddit preview hosts support query-based format switching.
    const canSwitchByQuery =
      host === "preview.redd.it" ||
      host === "external-preview.redd.it" ||
      host.endsWith(".redditmedia.com");

    if (canSwitchByQuery && parsed.searchParams.has("format")) {
      const format = (parsed.searchParams.get("format") || "").toLowerCase();
      if (format !== "avif" && format !== "webp") {
        parsed.searchParams.set("format", "webp");
        return parsed.toString();
      }
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

export default {
  preferModernImageUrl,
};
