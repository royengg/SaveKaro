const STORE_KEY_ALIASES: Array<{ key: string; aliases: string[] }> = [
  { key: "amazon", aliases: ["amazon", "amzn"] },
  { key: "myntra", aliases: ["myntra", "myntr"] },
  { key: "ajio", aliases: ["ajio", "ajiio"] },
  { key: "nykaa", aliases: ["nykaa"] },
  { key: "croma", aliases: ["croma"] },
  { key: "tata", aliases: ["tata", "tatacliq", "tataneu"] },
  { key: "flipkart", aliases: ["flipkart"] },
  { key: "meesho", aliases: ["meesho"] },
  { key: "bestbuy", aliases: ["bestbuy"] },
  { key: "walmart", aliases: ["walmart"] },
  { key: "costco", aliases: ["costco"] },
  { key: "canadiantire", aliases: ["canadiantire"] },
  { key: "thesource", aliases: ["thesource"] },
  { key: "shoppersdrugmart", aliases: ["shoppersdrugmart"] },
  { key: "londondrugs", aliases: ["londondrugs"] },
];

const MULTI_PART_TLD_PREFIXES = new Set([
  "ac",
  "co",
  "com",
  "edu",
  "gov",
  "net",
  "org",
]);

function compactStoreToken(value: string | null | undefined): string | null {
  const normalized = (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  return normalized || null;
}

function resolveAliasStoreKey(token: string | null): string | null {
  if (!token) {
    return null;
  }

  const aliasMatch = STORE_KEY_ALIASES.find((entry) =>
    entry.aliases.some((alias) => token.includes(alias)),
  );

  return aliasMatch?.key ?? token;
}

function extractRegistrableDomainToken(hostname: string): string | null {
  const parts = hostname
    .replace(/^(www|m)\./i, "")
    .toLowerCase()
    .split(".")
    .filter(Boolean);

  if (parts.length === 0) {
    return null;
  }

  if (parts.length === 1) {
    return compactStoreToken(parts[0]);
  }

  const topLevel = parts[parts.length - 1];
  const secondLevel = parts[parts.length - 2];

  if (
    topLevel.length === 2 &&
    MULTI_PART_TLD_PREFIXES.has(secondLevel) &&
    parts.length >= 3
  ) {
    return compactStoreToken(parts[parts.length - 3]);
  }

  return compactStoreToken(secondLevel);
}

export function getStoreKeyFromFilter(
  store: string | null | undefined,
): string | null {
  return resolveAliasStoreKey(compactStoreToken(store));
}

export function getCanonicalStoreKey(params: {
  store?: string | null;
  productUrl?: string | null;
}): string | null {
  const fromStore = getStoreKeyFromFilter(params.store);
  if (fromStore) {
    return fromStore;
  }

  if (!params.productUrl) {
    return null;
  }

  try {
    const hostname = new URL(params.productUrl).hostname;
    const hostToken = extractRegistrableDomainToken(hostname);
    return resolveAliasStoreKey(hostToken);
  } catch {
    return null;
  }
}
