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
  Bell,
  Bookmark,
  ChartSpline,
  CircleAlert,
  ExternalLink,
  MoveUpRight,
  Search,
  Store,
} from "lucide-react";
import SaveKaroMark from "@/components/brand/SaveKaroMark";

export const SAVEKARO_DEMO_FPS = 30;
export const SAVEKARO_DEMO_DURATION_IN_FRAMES = 450;
export const SAVEKARO_DEMO_WIDTH = 1200;
export const SAVEKARO_DEMO_HEIGHT = 675;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const shellStyle: CSSProperties = {
  padding: "72px 76px",
  color: "#111827",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const glassCard: CSSProperties = {
  borderRadius: 30,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.8))",
  border: "1px solid rgba(255,255,255,0.82)",
  boxShadow: "0 26px 70px -38px rgba(15,23,42,0.34)",
  backdropFilter: "blur(20px)",
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  borderRadius: 999,
  padding: "12px 18px",
  background: "rgba(255,255,255,0.7)",
  border: "1px solid rgba(255,255,255,0.75)",
  boxShadow: "0 18px 40px -34px rgba(15,23,42,0.28)",
};

function enterStyle(frame: number, fps: number, delay = 0): CSSProperties {
  const progress = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: {
      damping: 18,
      stiffness: 140,
      mass: 0.75,
    },
  });

  const translateY = interpolate(progress, [0, 1], [36, 0], clamp);
  const scale = interpolate(progress, [0, 1], [0.97, 1], clamp);
  const opacity = interpolate(progress, [0, 1], [0, 1], clamp);

  return {
    opacity,
    transform: `translateY(${translateY}px) scale(${scale})`,
  };
}

function sceneOpacity(frame: number, durationInFrames: number) {
  return interpolate(
    frame,
    [0, 12, durationInFrames - 16, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
}

function StepBadge({ value, accent }: { value: string; accent: string }) {
  return (
    <div
      style={{
        ...chipStyle,
        width: "fit-content",
        padding: "10px 16px",
        background: "rgba(255,255,255,0.84)",
        color: accent,
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: "-0.02em",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          height: 30,
          width: 30,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          background: accent,
          color: "#fff",
          fontSize: 15,
          fontWeight: 800,
        }}
      >
        {value}
      </span>
      Step {value}
    </div>
  );
}

function SceneTitle({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 430 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 58,
          lineHeight: 1.02,
          letterSpacing: "-0.05em",
          fontWeight: 800,
        }}
      >
        {title}
      </h2>
      <p
        style={{
          margin: 0,
          fontSize: 24,
          lineHeight: 1.45,
          color: "rgba(17,24,39,0.72)",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function DealCard({
  frame,
  delay,
  title,
  store,
  price,
  discount,
  accent,
}: {
  frame: number;
  delay: number;
  title: string;
  store: string;
  price: string;
  discount: string;
  accent: string;
}) {
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        ...glassCard,
        ...enterStyle(frame, fps, delay),
        display: "grid",
        gap: 18,
        padding: "20px 22px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            height: 68,
            width: 68,
            borderRadius: 22,
            background: accent,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        />
        <div style={{ display: "grid", gap: 7 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(17,24,39,0.44)",
            }}
          >
            {store}
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            {title}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-0.04em",
          }}
        >
          {price}
        </div>
        <div
          style={{
            borderRadius: 999,
            padding: "10px 16px",
            background: "rgba(236,72,153,0.12)",
            color: "#be185d",
            fontSize: 18,
            fontWeight: 700,
          }}
        >
          {discount}
        </div>
      </div>
    </div>
  );
}

function DiscoverScene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        ...shellStyle,
        opacity: sceneOpacity(frame, durationInFrames),
        background:
          "radial-gradient(circle at top left, rgba(255,238,222,0.96), transparent 38%), linear-gradient(135deg, #fff8f1 0%, #f6efe3 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at right center, rgba(250,204,21,0.16), transparent 34%)",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.96fr 1.1fr",
          gap: 40,
          height: "100%",
          alignItems: "center",
        }}
      >
        <div style={enterStyle(frame, fps)}>
          <StepBadge value="1" accent="#c2410c" />
          <div style={{ height: 22 }} />
          <SceneTitle
            title="Spot the best deals fast"
            body="Browse fresh drops from Amazon, Myntra, and more in one clean feed."
          />
        </div>

        <div
          style={{
            ...glassCard,
            ...enterStyle(frame, fps, 6),
            padding: 26,
            display: "grid",
            gap: 18,
          }}
        >
          <div
            style={{
              ...chipStyle,
              padding: "16px 20px",
              justifyContent: "flex-start",
              gap: 12,
            }}
          >
            <Search size={22} color="rgba(17,24,39,0.6)" />
            <span
              style={{
                fontSize: 22,
                color: "rgba(17,24,39,0.5)",
              }}
            >
              Search deals, stores, categories...
            </span>
          </div>

          <DealCard
            frame={frame}
            delay={10}
            title="Sony WH-1000XM5"
            store="Amazon"
            price="Rs 19,999"
            discount="31% off"
            accent="linear-gradient(135deg, #fee2e2, #fecaca)"
          />
          <DealCard
            frame={frame}
            delay={20}
            title="Nike Pegasus 40"
            store="Myntra"
            price="Rs 4,899"
            discount="44% off"
            accent="linear-gradient(135deg, #dbeafe, #bfdbfe)"
          />
          <DealCard
            frame={frame}
            delay={30}
            title="PS5 Slim Bundle"
            store="Croma"
            price="Rs 42,999"
            discount="Hot deal"
            accent="linear-gradient(135deg, #dcfce7, #bbf7d0)"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function SaveScene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const bookmarkPulse = spring({
    fps,
    frame: Math.max(0, frame - 24),
    config: { damping: 12, stiffness: 120, mass: 0.7 },
  });

  const alertPulse = spring({
    fps,
    frame: Math.max(0, frame - 38),
    config: { damping: 11, stiffness: 115, mass: 0.7 },
  });

  return (
    <AbsoluteFill
      style={{
        ...shellStyle,
        opacity: sceneOpacity(frame, durationInFrames),
        background:
          "radial-gradient(circle at bottom left, rgba(224,231,255,0.95), transparent 38%), linear-gradient(135deg, #f8f7ff 0%, #eef3ff 100%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.98fr 1.08fr",
          gap: 44,
          height: "100%",
          alignItems: "center",
        }}
      >
        <div style={enterStyle(frame, fps)}>
          <StepBadge value="2" accent="#4338ca" />
          <div style={{ height: 22 }} />
          <SceneTitle
            title="Save what you want"
            body="Bookmark deals or create a price alert in one tap so the app keeps watch for you."
          />
        </div>

        <div
          style={{
            ...glassCard,
            ...enterStyle(frame, fps, 8),
            padding: 26,
            display: "grid",
            gap: 24,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -24,
              top: -24,
              height: 170,
              width: 170,
              borderRadius: 999,
              background: "rgba(99,102,241,0.12)",
              filter: "blur(4px)",
            }}
          />

          <div
            style={{
              display: "grid",
              gap: 14,
              padding: 22,
              borderRadius: 28,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.74))",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 20px 48px -38px rgba(15,23,42,0.32)",
            }}
          >
            <div
              style={{
                height: 210,
                borderRadius: 24,
                background:
                  "linear-gradient(145deg, rgba(165,180,252,0.25), rgba(255,255,255,0.4))",
              }}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              Apple Watch SE
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                Rs 22,499
              </div>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 999,
                  background: "rgba(129,140,248,0.14)",
                  color: "#4338ca",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                25% off
              </div>
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              right: 36,
              top: 48,
              transform: `scale(${interpolate(bookmarkPulse, [0, 1], [0.85, 1], clamp)})`,
            }}
          >
            <div
              style={{
                ...chipStyle,
                background: "#111827",
                color: "#fff",
                padding: "14px 18px",
              }}
            >
              <Bookmark size={22} fill="currentColor" />
              Saved
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 40,
              bottom: 42,
              transform: `scale(${interpolate(alertPulse, [0, 1], [0.85, 1], clamp)})`,
            }}
          >
            <div
              style={{
                ...chipStyle,
                background:
                  "linear-gradient(180deg, rgba(250,245,255,0.94), rgba(244,238,255,0.8))",
                color: "#4c1d95",
                padding: "14px 18px",
              }}
            >
              <Bell size={22} />
              Alert me below Rs 21,999
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function TrackScene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        ...shellStyle,
        opacity: sceneOpacity(frame, durationInFrames),
        background:
          "radial-gradient(circle at top right, rgba(220,252,231,0.92), transparent 36%), linear-gradient(135deg, #f4fbf7 0%, #eef8f4 100%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.98fr 1.08fr",
          gap: 44,
          height: "100%",
          alignItems: "center",
        }}
      >
        <div style={enterStyle(frame, fps)}>
          <StepBadge value="3" accent="#0f766e" />
          <div style={{ height: 22 }} />
          <SceneTitle
            title="Watch the price move"
            body="Check price history, spot the drop, and know when the deal gets better."
          />
        </div>

        <div
          style={{
            ...glassCard,
            ...enterStyle(frame, fps, 8),
            padding: 28,
            display: "grid",
            gap: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 16,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "rgba(17,24,39,0.46)",
                  fontWeight: 700,
                }}
              >
                Price trend
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: "-0.04em",
                }}
              >
                Rs 42,999 to Rs 37,499
              </div>
            </div>
            <div
              style={{
                ...chipStyle,
                padding: "12px 16px",
                color: "#047857",
                background: "rgba(16,185,129,0.12)",
              }}
            >
              <ChartSpline size={22} />
              Best drop today
            </div>
          </div>

          <div
            style={{
              ...glassCard,
              padding: 22,
              borderRadius: 28,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.72))",
            }}
          >
            <svg viewBox="0 0 560 220" style={{ width: "100%", height: 250 }}>
              <defs>
                <linearGradient id="lineFade" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#0f766e" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity="0.95" />
                </linearGradient>
              </defs>
              <path
                d="M24 168C96 164 112 138 170 138C224 138 246 74 322 74C404 74 430 44 536 44"
                fill="none"
                stroke="url(#lineFade)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="536" cy="44" r="14" fill="#0f766e" />
              <circle cx="536" cy="44" r="30" fill="rgba(15,118,110,0.12)" />
            </svg>
          </div>

          <div
            style={{
              ...chipStyle,
              ...enterStyle(frame, fps, 26),
              justifyContent: "space-between",
              width: "100%",
              padding: "18px 20px",
              background:
                "linear-gradient(180deg, rgba(240,253,250,0.96), rgba(236,253,245,0.82))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CircleAlert size={22} color="#047857" />
              <div style={{ display: "grid", gap: 4 }}>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Price dropped on PS5 Slim
                </div>
                <div
                  style={{
                    fontSize: 17,
                    color: "rgba(17,24,39,0.62)",
                  }}
                >
                  Now is a better time to buy
                </div>
              </div>
            </div>
            <MoveUpRight size={24} color="#047857" />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function PurchaseScene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const buttonScale = interpolate(frame, [26, 36, 48], [1, 0.95, 1], clamp);
  const arrowTravel = interpolate(frame, [34, 72], [0, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        ...shellStyle,
        opacity: sceneOpacity(frame, durationInFrames),
        background:
          "radial-gradient(circle at top left, rgba(254,240,138,0.34), transparent 34%), radial-gradient(circle at bottom right, rgba(191,219,254,0.56), transparent 38%), linear-gradient(135deg, #fff9ef 0%, #f6f0e5 100%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.9fr 1.14fr",
          gap: 44,
          height: "100%",
          alignItems: "center",
        }}
      >
        <div style={enterStyle(frame, fps)}>
          <StepBadge value="4" accent="#b45309" />
          <div style={{ height: 22 }} />
          <SceneTitle
            title="Tap Purchase Now"
            body="SaveKaro opens the real Amazon, Myntra, or brand store page so you finish checkout on the main store link."
          />
        </div>

        <div
          style={{
            ...glassCard,
            ...enterStyle(frame, fps, 8),
            padding: 24,
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              ...glassCard,
              padding: 22,
              borderRadius: 28,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.76))",
              display: "grid",
              gap: 18,
            }}
          >
            <div
              style={{
                height: 174,
                borderRadius: 24,
                background:
                  "linear-gradient(145deg, rgba(254,226,226,0.42), rgba(255,255,255,0.35))",
              }}
            />
            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(17,24,39,0.42)",
                }}
              >
                SaveKaro deal page
              </div>
              <div
                style={{
                  fontSize: 27,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                }}
              >
                Sony WH-1000XM5
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                    color: "#047857",
                  }}
                >
                  Rs 19,999
                </div>
                <div
                  style={{
                    borderRadius: 999,
                    padding: "9px 13px",
                    background: "rgba(236,72,153,0.12)",
                    color: "#be185d",
                    fontSize: 17,
                    fontWeight: 700,
                  }}
                >
                  31% off
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div
                style={{
                  ...chipStyle,
                  padding: "11px 14px",
                  color: "#111827",
                  background: "rgba(255,255,255,0.82)",
                }}
              >
                <Bookmark size={18} />
                Saved
              </div>

              <div
                style={{
                  borderRadius: 999,
                  background: "#111827",
                  color: "#fff",
                  padding: "14px 18px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 18,
                  fontWeight: 700,
                  transform: `scale(${buttonScale})`,
                  boxShadow: "0 18px 38px -24px rgba(15,23,42,0.45)",
                }}
              >
                Purchase Now
                <ExternalLink size={18} />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              placeItems: "center",
              gap: 12,
              width: 84,
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.82)",
                border: "1px solid rgba(255,255,255,0.9)",
                boxShadow: "0 20px 48px -34px rgba(15,23,42,0.32)",
                transform: `translateX(${interpolate(arrowTravel, [0, 1], [-6, 6], clamp)}px)`,
              }}
            >
              <MoveUpRight size={24} color="#b45309" />
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(17,24,39,0.45)",
              }}
            >
              Opens
            </div>
          </div>

          <div
            style={{
              ...glassCard,
              ...enterStyle(frame, fps, 24),
              padding: 22,
              borderRadius: 28,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.8))",
              display: "grid",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                borderRadius: 22,
                background: "rgba(244,244,245,0.95)",
                padding: "12px 14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                  }}
                >
                  {["#fca5a5", "#fde68a", "#86efac"].map((dot) => (
                    <span
                      key={dot}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: dot,
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "rgba(17,24,39,0.64)",
                  }}
                >
                  amazon.in
                </div>
              </div>
              <Store size={18} color="rgba(17,24,39,0.52)" />
            </div>

            <div
              style={{
                borderRadius: 24,
                background:
                  "linear-gradient(145deg, rgba(191,219,254,0.34), rgba(255,255,255,0.4))",
                height: 148,
              }}
            />

            <div style={{ display: "grid", gap: 8 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(17,24,39,0.42)",
                }}
              >
                Official store page
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  lineHeight: 1.18,
                  letterSpacing: "-0.03em",
                }}
              >
                Complete your checkout on the merchant site
              </div>
            </div>

            <div
              style={{
                ...chipStyle,
                width: "100%",
                justifyContent: "space-between",
                padding: "16px 18px",
                background:
                  "linear-gradient(180deg, rgba(255,247,237,0.95), rgba(255,237,213,0.82))",
                color: "#9a3412",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ExternalLink size={20} />
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                  }}
                >
                  You buy from the real store link
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function OutroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        ...shellStyle,
        background:
          "radial-gradient(circle at top center, rgba(254,226,226,0.96), transparent 30%), linear-gradient(135deg, #fff8f7 0%, #fff4ef 100%)",
      }}
    >
      <div
        style={{
          display: "grid",
          placeItems: "center",
          height: "100%",
          textAlign: "center",
          color: "#111827",
          ...enterStyle(frame, fps),
        }}
      >
        <div style={{ display: "grid", gap: 24, justifyItems: "center" }}>
          <div
            style={{
              ...glassCard,
              width: 146,
              height: 146,
              display: "grid",
              placeItems: "center",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.86))",
            }}
          >
            <SaveKaroMark style={{ width: 94, height: 94 }} />
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                fontSize: 60,
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: "-0.06em",
              }}
            >
              SaveKaro
            </div>
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.3,
                color: "rgba(17,24,39,0.72)",
              }}
            >
              Discover deals. Track prices. Buy on the store site.
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function SaveKaroDemoVideo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f8f5ef", overflow: "hidden" }}>
      <Sequence from={0} durationInFrames={90}>
        <DiscoverScene />
      </Sequence>
      <Sequence from={90} durationInFrames={90}>
        <SaveScene />
      </Sequence>
      <Sequence from={180} durationInFrames={90}>
        <TrackScene />
      </Sequence>
      <Sequence from={270} durationInFrames={120}>
        <PurchaseScene />
      </Sequence>
      <Sequence from={390} durationInFrames={60}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
}

export default SaveKaroDemoVideo;
