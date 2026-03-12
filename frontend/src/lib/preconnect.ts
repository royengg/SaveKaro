const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const PRECONNECT_ATTR = "data-savekaro-preconnect";

function getOrigin(url: string): string | null {
  try {
    return new URL(url, window.location.href).origin;
  } catch {
    return null;
  }
}

function appendPreconnect(url: string) {
  const origin = getOrigin(url);
  if (!origin || origin === window.location.origin) {
    return;
  }

  const existing = document.head.querySelector(
    `link[rel="preconnect"][${PRECONNECT_ATTR}="${origin}"]`,
  );
  if (existing) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  link.crossOrigin = "anonymous";
  link.setAttribute(PRECONNECT_ATTR, origin);
  document.head.appendChild(link);
}

export function preconnectCriticalOrigins() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  appendPreconnect(API_URL);
}
