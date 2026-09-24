'use dom';

import { useEffect, useRef } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import HomeWalkthroughVideo, {
  HOME_WALKTHROUGH_DURATION_IN_FRAMES,
  HOME_WALKTHROUGH_FPS,
  HOME_WALKTHROUGH_HEIGHT,
  HOME_WALKTHROUGH_WIDTH,
} from "@savekaro/motion/home";
import SaveKaroDemoVideo, {
  SAVEKARO_DEMO_DURATION_IN_FRAMES,
  SAVEKARO_DEMO_FPS,
  SAVEKARO_DEMO_HEIGHT,
  SAVEKARO_DEMO_WIDTH,
} from "@savekaro/motion/demo";
import GuideMotionVideo, {
  GUIDE_MOTION_DURATION_IN_FRAMES,
  GUIDE_MOTION_FPS,
  GUIDE_MOTION_HEIGHT,
  GUIDE_MOTION_WIDTH,
} from "@savekaro/motion/guide";
import type { GuideMotionId } from "@savekaro/motion/guide-data";

export type SaveKaroMotionKind = "home" | "demo" | "guide";

interface SaveKaroMotionPlayerProps {
  kind: SaveKaroMotionKind;
  guideId?: GuideMotionId;
  active: boolean;
  autoPlay: boolean;
  loop: boolean;
  dom?: import("expo/dom").DOMProps;
}

const playerStyle = { width: "100%", height: "100%" } as const;

function PlayerContent({
  kind,
  guideId,
  playerRef,
  autoPlay,
  loop,
}: Pick<
  SaveKaroMotionPlayerProps,
  "kind" | "guideId" | "autoPlay" | "loop"
> & {
  playerRef: React.RefObject<PlayerRef | null>;
}) {
  const sharedProps = {
    ref: playerRef,
    autoPlay,
    loop,
    controls: true,
    showVolumeControls: false,
    clickToPlay: true,
    moveToBeginningWhenEnded: !loop,
    doubleClickToFullscreen: false,
    style: playerStyle,
  } as const;

  if (kind === "demo") {
    return (
      <Player
        {...sharedProps}
        component={SaveKaroDemoVideo}
        durationInFrames={SAVEKARO_DEMO_DURATION_IN_FRAMES}
        compositionWidth={SAVEKARO_DEMO_WIDTH}
        compositionHeight={SAVEKARO_DEMO_HEIGHT}
        fps={SAVEKARO_DEMO_FPS}
      />
    );
  }

  if (kind === "guide") {
    return (
      <Player
        {...sharedProps}
        component={GuideMotionVideo}
        inputProps={{
          guideId: guideId ?? "discount-quality",
        }}
        durationInFrames={GUIDE_MOTION_DURATION_IN_FRAMES}
        compositionWidth={GUIDE_MOTION_WIDTH}
        compositionHeight={GUIDE_MOTION_HEIGHT}
        fps={GUIDE_MOTION_FPS}
      />
    );
  }

  return (
    <Player
      {...sharedProps}
      component={HomeWalkthroughVideo}
      durationInFrames={HOME_WALKTHROUGH_DURATION_IN_FRAMES}
      compositionWidth={HOME_WALKTHROUGH_WIDTH}
      compositionHeight={HOME_WALKTHROUGH_HEIGHT}
      fps={HOME_WALKTHROUGH_FPS}
    />
  );
}

export default function SaveKaroMotionPlayer({
  kind,
  guideId,
  active,
  autoPlay,
  loop,
}: SaveKaroMotionPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const pausedByLifecycle = useRef(false);
  const pausedByUser = useRef(false);
  const shouldPlay = active && autoPlay;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => {
      pausedByUser.current = false;
      pausedByLifecycle.current = false;
    };
    const handlePause = () => {
      if (!pausedByLifecycle.current) pausedByUser.current = true;
      pausedByLifecycle.current = false;
    };

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (!shouldPlay) {
      if (player.isPlaying()) {
        pausedByLifecycle.current = true;
        player.pause();
      }
      return;
    }

    if (!pausedByUser.current && !player.isPlaying()) player.play();
  }, [shouldPlay]);

  return (
    <>
      <style>{`
        :root { color-scheme: light; }
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: transparent;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system,
            BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        button, input { font: inherit; }
      `}</style>
      <main style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <PlayerContent
          kind={kind}
          guideId={guideId}
          playerRef={playerRef}
          autoPlay={shouldPlay}
          loop={loop}
        />
      </main>
    </>
  );
}
