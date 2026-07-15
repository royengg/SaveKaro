/**
 * Extracts and normalizes the hostname from a URL.
 * Strips `www.` and `m.` prefixes and lowercases the result.
 */
export function normalizeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^(www|m)\./i, "").toLowerCase();
  } catch {
    return null;
  }
}
