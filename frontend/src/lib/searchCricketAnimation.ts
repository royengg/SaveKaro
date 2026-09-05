export function cancelAnimations(node: Element | null) {
  if (!node) {
    return;
  }

  node.getAnimations().forEach((animation) => animation.cancel());
}

function animateWicketPart(
  part: Element | null,
  keyframes: Keyframe[],
  duration: number,
  transformOrigin: string,
) {
  if (!part) {
    return;
  }

  cancelAnimations(part);
  (part as HTMLElement).style.transformOrigin = transformOrigin;
  part.animate(keyframes, {
    duration,
    easing: "linear",
    fill: "both",
  });
}

export function playSearchCricketAnimation(
  ballNode: HTMLElement | null,
  wicketNode: HTMLElement | null,
  duration: number,
) {
  if (!ballNode) {
    return;
  }

  const trackWidth = ballNode.parentElement?.clientWidth ?? 0;
  if (trackWidth < 60) {
    return;
  }

  // Ball travels left → right, hitting wickets at the far-right end.
  const bounceOneX = Math.max(14, Math.min(trackWidth * 0.05, 22));
  const bounceTwoX = trackWidth * 0.2;
  const bounceThreeX = trackWidth * 0.42;
  const bounceFourX = trackWidth * 0.66;
  const tailX = trackWidth * 0.88;
  const endX = trackWidth + 28;

  // Ball completes its travel in the first ~60% of the total duration,
  // preserving the same visual speed as the original 1500ms animation.
  cancelAnimations(ballNode);
  ballNode.animate(
    [
      { offset: 0, opacity: 0, transform: "translate3d(-18px, -14px, 0) scale(0.9) rotate(-10deg)" },
      { offset: 0.03, opacity: 1, transform: "translate3d(-12px, -8px, 0) scale(0.95) rotate(8deg)" },
      { offset: 0.07, opacity: 1, transform: `translate3d(${bounceOneX}px, 16px, 0) scaleX(1.08) scaleY(0.9) rotate(120deg)` },
      { offset: 0.16, opacity: 1, transform: `translate3d(${bounceTwoX}px, 2px, 0) scale(1) rotate(196deg)` },
      { offset: 0.26, opacity: 1, transform: `translate3d(${bounceThreeX}px, 14px, 0) scaleX(1.04) scaleY(0.94) rotate(276deg)` },
      { offset: 0.37, opacity: 1, transform: `translate3d(${bounceFourX}px, 6px, 0) scale(0.98) rotate(384deg)` },
      { offset: 0.49, opacity: 1, transform: `translate3d(${tailX}px, 10px, 0) scale(0.95) rotate(486deg)` },
      { offset: 0.60, opacity: 0, transform: `translate3d(${endX}px, 9px, 0) scale(0.9) rotate(560deg)` },
      { offset: 1, opacity: 0, transform: `translate3d(${endX}px, 9px, 0) scale(0.9) rotate(560deg)` },
    ],
    { duration, easing: "linear", fill: "both" },
  );

  if (!wicketNode) {
    return;
  }

  // Wicket impact at ~50% when the ball reaches the right side.
  // The wobble holds until ~92%, giving ~1 second of broken state.
  cancelAnimations(wicketNode);
  wicketNode.animate(
    [
      { offset: 0, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.47, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.50, transform: "translate3d(-1px, 1px, 0) rotate(-10deg) scale(0.985)" },
      { offset: 0.54, transform: "translate3d(1px, -1px, 0) rotate(8deg) scale(1.02)" },
      { offset: 0.58, transform: "translate3d(-0.5px, 0, 0) rotate(-4deg) scale(0.995)" },
      { offset: 0.92, transform: "translate3d(-0.5px, 0, 0) rotate(-3deg) scale(0.996)" },
      { offset: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
    ],
    { duration, easing: "linear", fill: "both" },
  );

  const wicketSvg = wicketNode.querySelector("svg");
  if (!wicketSvg) {
    return;
  }

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="bail-left"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.52, opacity: 1, transform: "translate3d(-7px, -6px, 0) rotate(-32deg) scale(0.95)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(-7px, -6px, 0) rotate(-32deg) scale(0.95)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
    ],
    duration, "35% 65%",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="bail-right"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.52, opacity: 1, transform: "translate3d(7px, -6px, 0) rotate(32deg) scale(0.95)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(7px, -6px, 0) rotate(32deg) scale(0.95)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
    ],
    duration, "65% 65%",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="stump-left"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.53, opacity: 1, transform: "translate3d(-5px, 2px, 0) rotate(-18deg) scaleY(0.98)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(-5px, 2px, 0) rotate(-18deg) scaleY(0.98)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
    ],
    duration, "center bottom",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="stump-middle"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.53, opacity: 1, transform: "translate3d(1px, 2px, 0) rotate(6deg) scaleY(0.99)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(1px, 2px, 0) rotate(6deg) scaleY(0.99)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
    ],
    duration, "center bottom",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="stump-right"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.53, opacity: 1, transform: "translate3d(5px, 2px, 0) rotate(18deg) scaleY(0.98)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(5px, 2px, 0) rotate(18deg) scaleY(0.98)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
    ],
    duration, "center bottom",
  );
}
