import { Player } from "@remotion/player";
import HomeWalkthroughVideo, {
  HOME_WALKTHROUGH_DURATION_IN_FRAMES,
  HOME_WALKTHROUGH_FPS,
  HOME_WALKTHROUGH_HEIGHT,
  HOME_WALKTHROUGH_WIDTH,
} from "@/components/home/HomeWalkthroughVideo";

interface HomeWalkthroughPlayerProps {
  autoPlay: boolean;
  loop: boolean;
}

export default function HomeWalkthroughPlayer({
  autoPlay,
  loop,
}: HomeWalkthroughPlayerProps) {
  return (
    <div className="aspect-[16/9] w-full overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.96))] shadow-[0_28px_90px_-54px_rgba(15,23,42,0.35)]">
      <Player
        component={HomeWalkthroughVideo}
        durationInFrames={HOME_WALKTHROUGH_DURATION_IN_FRAMES}
        compositionWidth={HOME_WALKTHROUGH_WIDTH}
        compositionHeight={HOME_WALKTHROUGH_HEIGHT}
        fps={HOME_WALKTHROUGH_FPS}
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
