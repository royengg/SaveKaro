import { Player } from "@remotion/player";
import SaveKaroDemoVideo, {
  SAVEKARO_DEMO_DURATION_IN_FRAMES,
  SAVEKARO_DEMO_FPS,
  SAVEKARO_DEMO_HEIGHT,
  SAVEKARO_DEMO_WIDTH,
} from "@/components/demo/SaveKaroDemoVideo";

interface SaveKaroDemoPlayerProps {
  autoPlay: boolean;
  loop: boolean;
}

export default function SaveKaroDemoPlayer({
  autoPlay,
  loop,
}: SaveKaroDemoPlayerProps) {
  return (
    <div className="aspect-[16/9] w-full overflow-hidden rounded-[28px] border border-white/70 bg-[#f8f3ec] shadow-[0_24px_70px_-44px_rgba(15,23,42,0.45)]">
      <Player
        component={SaveKaroDemoVideo}
        durationInFrames={SAVEKARO_DEMO_DURATION_IN_FRAMES}
        compositionWidth={SAVEKARO_DEMO_WIDTH}
        compositionHeight={SAVEKARO_DEMO_HEIGHT}
        fps={SAVEKARO_DEMO_FPS}
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
