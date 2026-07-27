import type { MouseEvent } from "react";
import { flushSync } from "react-dom";

export type MobileViewTransitionKind = "route" | "deal";

interface ViewTransitionHandle {
  finished: Promise<void>;
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (
    update: () => void | Promise<void>,
  ) => ViewTransitionHandle;
};

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)";
const DEAL_TRANSITION_ATTRIBUTE = "data-deal-transition-id";
const DEAL_TRANSITION_PART_ATTRIBUTE = "data-deal-transition-part";

let activeDealTransitionId: string | null = null;

const normalizeTransitionId = (id: string) =>
  id.replace(/[^a-zA-Z0-9_-]/g, "-");

export const getDealTransitionName = (
  id: string,
  part: "image" | "title",
) => `deal-${part}-${normalizeTransitionId(id)}`;

export const isMobileMotionAvailable = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const transitionDocument = document as ViewTransitionDocument;
  return (
    window.matchMedia(MOBILE_MEDIA_QUERY).matches &&
    !window.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches &&
    typeof transitionDocument.startViewTransition === "function"
  );
};

export const isActiveDealTransition = (id: string) =>
  activeDealTransitionId === id;

export const prepareDealTransition = (
  id: string,
  scope: ParentNode = document,
) => {
  activeDealTransitionId = id;

  scope
    .querySelectorAll<HTMLElement>(
      `[${DEAL_TRANSITION_ATTRIBUTE}="${CSS.escape(id)}"]`,
    )
    .forEach((element) => {
      const part = element.getAttribute(DEAL_TRANSITION_PART_ATTRIBUTE);
      if (part === "image" || part === "title") {
        element.style.viewTransitionName = getDealTransitionName(id, part);
      }
    });
};

const clearDealTransition = (id: string) => {
  document
    .querySelectorAll<HTMLElement>(
      `[${DEAL_TRANSITION_ATTRIBUTE}="${CSS.escape(id)}"]`,
    )
    .forEach((element) => {
      element.style.viewTransitionName = "";
    });

  if (activeDealTransitionId === id) {
    activeDealTransitionId = null;
  }
};

export const getActiveDealTransitionStyle = (
  id: string,
  part: "image" | "title",
) =>
  isActiveDealTransition(id)
    ? { viewTransitionName: getDealTransitionName(id, part) }
    : undefined;

export const runMobileViewTransition = (
  update: () => void,
  kind: MobileViewTransitionKind,
  dealId?: string,
) => {
  const transitionDocument = document as ViewTransitionDocument;

  if (!isMobileMotionAvailable() || !transitionDocument.startViewTransition) {
    update();
    if (dealId) {
      clearDealTransition(dealId);
    }
    return null;
  }

  document.documentElement.dataset.mobileViewTransition = kind;

  try {
    const transition = transitionDocument.startViewTransition(() => {
      flushSync(update);
    });

    void transition.finished.finally(() => {
      delete document.documentElement.dataset.mobileViewTransition;
      if (dealId) {
        clearDealTransition(dealId);
      }
    });

    return transition;
  } catch {
    delete document.documentElement.dataset.mobileViewTransition;
    update();
    if (dealId) {
      clearDealTransition(dealId);
    }
    return null;
  }
};

export const isPlainPrimaryClick = (
  event: Pick<
    MouseEvent,
    "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
  >,
) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;
