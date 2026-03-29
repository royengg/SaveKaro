import { Player } from "@remotion/player";
import GuideMotionVideo, {
  GUIDE_MOTION_DURATION_IN_FRAMES,
  GUIDE_MOTION_FPS,
  GUIDE_MOTION_HEIGHT,
  GUIDE_MOTION_WIDTH,
} from "@/components/guides/GuideMotionVideo";
import { type GuideMotionId } from "@/components/guides/guideMotionData";

interface GuideMotionPlayerProps {
  guideId: GuideMotionId;
  autoPlay: boolean;
  loop: boolean;
}

export default function GuideMotionPlayer({
  guideId,
  autoPlay,
  loop,
}: GuideMotionPlayerProps) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-[28px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,243,237,0.95))] shadow-[0_28px_80px_-48px_rgba(15,23,42,0.38)]">
      <Player
        component={GuideMotionVideo}
        inputProps={{ guideId }}
        durationInFrames={GUIDE_MOTION_DURATION_IN_FRAMES}
        compositionWidth={GUIDE_MOTION_WIDTH}
        compositionHeight={GUIDE_MOTION_HEIGHT}
        fps={GUIDE_MOTION_FPS}
        autoPlay={autoPlay}
        loop={loop}
        controls
        showVolumeControls={false}
        clickToPlay
        moveToBeginningWhenEnded={!loop}
        doubleClickToFullscreen={false}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
