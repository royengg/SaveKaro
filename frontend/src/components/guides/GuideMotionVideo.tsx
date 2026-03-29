import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  BadgePercent,
  Check,
  Layers3,
  Link as LinkIcon,
  ScanSearch,
  ShieldCheck,
  Shirt,
  Sparkles,
  Tags,
  Wallet,
} from "lucide-react";
import SaveKaroMark from "@/components/brand/SaveKaroMark";
import {
  GUIDE_MOTION_CONFIG,
  type GuideMotionIconKey,
  type GuideMotionId,
  type GuideMotionScene,
} from "@/components/guides/guideMotionData";

export const GUIDE_MOTION_FPS = 30;
export const GUIDE_MOTION_SCENE_DURATION = 105;
export const GUIDE_MOTION_DURATION_IN_FRAMES =
  GUIDE_MOTION_SCENE_DURATION * 3;
export const GUIDE_MOTION_WIDTH = 1200;
export const GUIDE_MOTION_HEIGHT = 675;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const iconMap = {
  spark: Sparkles,
  wallet: Wallet,
  badge: BadgePercent,
  layers: Layers3,
  link: LinkIcon,
  shield: ShieldCheck,
  scan: ScanSearch,
  shirt: Shirt,
  grid: Layers3,
  tag: Tags,
  check: Check,
} satisfies Record<GuideMotionIconKey, typeof Sparkles>;

const shellStyle: CSSProperties = {
  padding: "58px 64px",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#111827",
};

function sceneOpacity(frame: number, durationInFrames: number) {
  return interpolate(
    frame,
    [0, 10, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
}

function enterStyle(frame: number, fps: number, delay = 0): CSSProperties {
  const progress = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: {
      damping: 17,
      stiffness: 138,
      mass: 0.78,
    },
  });

  return {
    opacity: interpolate(progress, [0, 1], [0, 1], clamp),
    transform: `translateY(${interpolate(progress, [0, 1], [28, 0], clamp)}px) scale(${interpolate(progress, [0, 1], [0.97, 1], clamp)})`,
  };
}

function MotionChip({
  label,
  icon,
  frame,
  delay,
  accentSoft,
  accentText,
}: {
  label: string;
  icon: GuideMotionIconKey;
  frame: number;
  delay: number;
  accentSoft: string;
  accentText: string;
}) {
  const { fps } = useVideoConfig();
  const Icon = iconMap[icon];

  return (
    <div
      style={{
        ...enterStyle(frame, fps, delay),
        display: "flex",
        alignItems: "center",
        gap: 12,
        borderRadius: 999,
        padding: "14px 18px",
        background: accentSoft,
        color: accentText,
        border: "1px solid rgba(255,255,255,0.72)",
        boxShadow: "0 18px 38px -34px rgba(15,23,42,0.22)",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          height: 34,
          width: 34,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          background: "rgba(255,255,255,0.72)",
        }}
      >
        <Icon size={17} />
      </div>
      <span
        style={{
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function SceneBoard({
  scene,
  frame,
  accent,
  accentSoft,
  accentText,
  cardBackground,
}: {
  scene: GuideMotionScene;
  frame: number;
  accent: string;
  accentSoft: string;
  accentText: string;
  cardBackground: string;
}) {
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        ...enterStyle(frame, fps, 8),
        position: "relative",
        display: "grid",
        gap: 18,
        padding: 28,
        borderRadius: 30,
        background: cardBackground,
        border: "1px solid rgba(255,255,255,0.78)",
        boxShadow: "0 28px 70px -42px rgba(15,23,42,0.32)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -18,
          top: -18,
          height: 180,
          width: 180,
          borderRadius: 999,
          background: accentSoft,
          filter: "blur(2px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 26,
          top: 24,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          borderRadius: 999,
          background: "rgba(255,255,255,0.72)",
          padding: "10px 14px",
          border: "1px solid rgba(255,255,255,0.86)",
        }}
      >
        <div
          style={{
            height: 12,
            width: 12,
            borderRadius: 999,
            background: accent,
          }}
        />
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: "rgba(17,24,39,0.56)",
          }}
        >
          {scene.overline}
        </span>
      </div>

      <div style={{ height: 42 }} />

      <div
        style={{
          ...enterStyle(frame, fps, 12),
          display: "grid",
          gap: 12,
          padding: 24,
          borderRadius: 28,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.72))",
          border: "1px solid rgba(255,255,255,0.82)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            width: "fit-content",
            alignItems: "center",
            gap: 10,
            borderRadius: 999,
            padding: "8px 12px",
            background: accentSoft,
            color: accentText,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          Step {scene.step}
        </div>
        <div
          style={{
            fontSize: 34,
            lineHeight: 1.04,
            letterSpacing: "-0.05em",
            fontWeight: 800,
          }}
        >
          {scene.title}
        </div>
        <div
          style={{
            fontSize: 21,
            lineHeight: 1.42,
            color: "rgba(17,24,39,0.68)",
          }}
        >
          {scene.body}
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {scene.highlights.map((highlight, index) => (
          <MotionChip
            key={highlight.label}
            label={highlight.label}
            icon={highlight.icon}
            frame={frame}
            delay={20 + index * 6}
            accentSoft={accentSoft}
            accentText={accentText}
          />
        ))}
      </div>

      <div
        style={{
          ...enterStyle(frame, fps, 28),
          justifySelf: "end",
          display: "inline-flex",
          alignItems: "center",
          borderRadius: 999,
          background: accent,
          color: "#fff",
          padding: "14px 20px",
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          boxShadow: "0 22px 46px -34px rgba(15,23,42,0.38)",
        }}
      >
        {scene.stat}
      </div>
    </div>
  );
}

function MotionScene({
  guideId,
  scene,
}: {
  guideId: GuideMotionId;
  scene: GuideMotionScene;
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const config = GUIDE_MOTION_CONFIG[guideId];

  return (
    <AbsoluteFill
      style={{
        ...shellStyle,
        background: config.palette.background,
        opacity: sceneOpacity(frame, durationInFrames),
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top right, rgba(255,255,255,0.42), transparent 34%)",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.88fr 1.12fr",
          gap: 42,
          height: "100%",
          alignItems: "center",
        }}
      >
        <div style={{ ...enterStyle(frame, fps), display: "grid", gap: 18 }}>
          <div
            style={{
              display: "inline-flex",
              width: "fit-content",
              alignItems: "center",
              gap: 12,
              borderRadius: 999,
              padding: "12px 16px",
              background: "rgba(255,255,255,0.78)",
              border: "1px solid rgba(255,255,255,0.84)",
              boxShadow: "0 18px 40px -34px rgba(15,23,42,0.22)",
            }}
          >
            <SaveKaroMark className="h-6 w-6" />
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(17,24,39,0.58)",
              }}
            >
              {config.eyebrow}
            </span>
          </div>

          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(17,24,39,0.42)",
            }}
          >
            Motion Summary
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 58,
              lineHeight: 1.02,
              letterSpacing: "-0.055em",
              fontWeight: 800,
            }}
          >
            {config.heading}
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: 24,
              lineHeight: 1.44,
              color: "rgba(17,24,39,0.68)",
            }}
          >
            {config.subheading}
          </p>
        </div>

        <SceneBoard
          scene={scene}
          frame={frame}
          accent={config.palette.accent}
          accentSoft={config.palette.accentSoft}
          accentText={config.palette.accentText}
          cardBackground={config.palette.card}
        />
      </div>
    </AbsoluteFill>
  );
}

export interface GuideMotionVideoProps {
  guideId: GuideMotionId;
}

export default function GuideMotionVideo({
  guideId,
}: GuideMotionVideoProps) {
  const config = GUIDE_MOTION_CONFIG[guideId];

  return (
    <AbsoluteFill>
      {config.scenes.map((scene, index) => (
        <Sequence
          key={`${guideId}-${scene.step}`}
          from={index * GUIDE_MOTION_SCENE_DURATION}
          durationInFrames={GUIDE_MOTION_SCENE_DURATION}
        >
          <MotionScene guideId={guideId} scene={scene} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
