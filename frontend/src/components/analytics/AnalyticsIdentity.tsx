import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { isAnalyticsCapturing, posthog } from "@/lib/analytics/posthog";

export function AnalyticsIdentity() {
  const user = useAuthStore((state) => state.user);
  const previousUserId = useRef<string | null>(null);
  const [consentRevision, setConsentRevision] = useState(0);

  useEffect(() => {
    const refreshIdentity = () => setConsentRevision((value) => value + 1);
    window.addEventListener(
      "savekaro:analytics-consent-changed",
      refreshIdentity,
    );
    return () =>
      window.removeEventListener(
        "savekaro:analytics-consent-changed",
        refreshIdentity,
      );
  }, []);

  useEffect(() => {
    if (!isAnalyticsCapturing()) {
      previousUserId.current = null;
      return;
    }

    if (user?.id) {
      if (previousUserId.current !== user.id) {
        posthog.identify(user.id, {
          is_admin: Boolean(user.isAdmin),
        });
      }
      previousUserId.current = user.id;
      return;
    }

    if (previousUserId.current) {
      posthog.reset();
      previousUserId.current = null;
    }
  }, [consentRevision, user]);

  return null;
}
