import { useCallback, useEffect, useState } from "react";
import {
  denyAnalyticsConsent,
  getAnalyticsConsent,
  grantAnalyticsConsent,
  isAnalyticsConsentRequired,
  isAnalyticsConfigured,
  type AnalyticsConsent,
} from "@/lib/analytics/posthog";

export function AnalyticsConsentBanner() {
  const [consent, setConsent] = useState<AnalyticsConsent>(() =>
    getAnalyticsConsent(),
  );
  const [forceOpen, setForceOpen] = useState(false);

  const refreshConsent = useCallback(() => {
    setConsent(getAnalyticsConsent());
  }, []);

  useEffect(() => {
    const openPreferences = () => {
      refreshConsent();
      setForceOpen(true);
    };

    window.addEventListener(
      "savekaro:open-analytics-preferences",
      openPreferences,
    );
    return () =>
      window.removeEventListener(
        "savekaro:open-analytics-preferences",
        openPreferences,
      );
  }, [refreshConsent]);

  if (
    !isAnalyticsConfigured ||
    !isAnalyticsConsentRequired ||
    (consent !== "pending" && !forceOpen)
  ) {
    return null;
  }

  const accept = () => {
    grantAnalyticsConsent();
    setConsent("granted");
    setForceOpen(false);
  };

  const reject = () => {
    denyAnalyticsConsent();
    setConsent("denied");
    setForceOpen(false);
  };

  return (
    <aside
      aria-label="Analytics preferences"
      className="ph-no-capture fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border bg-background/98 p-4 shadow-2xl backdrop-blur md:bottom-5 md:p-5"
    >
      <p className="font-semibold">Help improve SaveKaro</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        With your permission, we use privacy-masked product analytics to learn
        which pages and deal-discovery features are useful. Sensitive inputs,
        comments, account pages, and authentication details are excluded.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={accept}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={reject}
          className="rounded-full border px-4 py-2 text-sm font-medium"
        >
          {consent === "granted" ? "Disable analytics" : "No thanks"}
        </button>
        {forceOpen ? (
          <button
            type="button"
            onClick={() => setForceOpen(false)}
            className="rounded-full px-4 py-2 text-sm text-muted-foreground"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </aside>
  );
}
