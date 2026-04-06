import type { Context } from "hono";

interface PublicCachePolicy {
  maxAge: number;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  sMaxAge?: number;
}

function clampDirective(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.floor(value));
}

export function setPublicCacheHeaders(
  c: Context,
  policy: PublicCachePolicy,
): void {
  const directives = [`public`, `max-age=${Math.max(0, Math.floor(policy.maxAge))}`];
  const sMaxAge = clampDirective(policy.sMaxAge);
  const staleWhileRevalidate = clampDirective(policy.staleWhileRevalidate);
  const staleIfError = clampDirective(policy.staleIfError);

  if (sMaxAge !== null) {
    directives.push(`s-maxage=${sMaxAge}`);
  }

  if (staleWhileRevalidate !== null) {
    directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
  }

  if (staleIfError !== null) {
    directives.push(`stale-if-error=${staleIfError}`);
  }

  c.header("Cache-Control", directives.join(", "));
}

export function setNoStoreHeaders(c: Context): void {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  c.header("Pragma", "no-cache");
}
