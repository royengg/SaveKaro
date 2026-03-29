import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Heart,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Tag,
} from "lucide-react";
import SaveKaroMark from "@/components/brand/SaveKaroMark";

export const HOME_WALKTHROUGH_FPS = 30;
export const HOME_WALKTHROUGH_WIDTH = 1200;
export const HOME_WALKTHROUGH_HEIGHT = 675;
export const HOME_WALKTHROUGH_DURATION_IN_FRAMES = 330;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const shellStyle: CSSProperties = {
  padding: "54px 72px",
  fontFamily:
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#111827",
};

function enterStyle(frame: number, fps: number, delay = 0): CSSProperties {
  const progress = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: {
      damping: 16,
      stiffness: 130,
      mass: 0.82,
    },
  });

  return {
    opacity: interpolate(progress, [0, 1], [0, 1], clamp),
    transform: `translateY(${interpolate(progress, [0, 1], [22, 0], clamp)}px) scale(${interpolate(progress, [0, 1], [0.985, 1], clamp)})`,
  };
}

function sceneOpacity(frame: number, durationInFrames: number) {
  return interpolate(
    frame,
    [0, 10, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        width: 318,
        height: 584,
        borderRadius: 40,
        background: "rgba(255,255,255,0.94)",
        border: "1px solid rgba(255,255,255,0.88)",
        boxShadow:
          "0 40px 100px -56px rgba(15,23,42,0.52), inset 0 1px 0 rgba(255,255,255,0.7)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 14,
          width: 120,
          height: 20,
          transform: "translateX(-50%)",
          borderRadius: 999,
          background: "rgba(17,24,39,0.9)",
        }}
      />
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
}

function TapIndicator({
  x,
  y,
  frame,
  delay,
}: {
  x: number;
  y: number;
  frame: number;
  delay: number;
}) {
  const { fps } = useVideoConfig();
  const progress = spring({
    fps,
    frame: Math.max(0, frame - delay),
    config: {
      damping: 12,
      stiffness: 160,
      mass: 0.65,
    },
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -18,
          borderRadius: 999,
          border: "2px solid rgba(17,24,39,0.18)",
          opacity: interpolate(progress, [0, 0.75, 1], [0, 0.85, 0], clamp),
          transform: `scale(${interpolate(progress, [0, 1], [0.4, 1.12], clamp)})`,
        }}
      />
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "#ffffff",
          border: "1px solid rgba(17,24,39,0.14)",
          boxShadow: "0 10px 24px -14px rgba(15,23,42,0.34)",
        }}
      />
    </div>
  );
}

function MobileBottomNav() {
  const items = [ShoppingBag, Search, Tag, Heart, Settings];

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        alignItems: "center",
        padding: "10px 14px 12px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.98))",
        borderTop: "1px solid rgba(15,23,42,0.08)",
        backdropFilter: "blur(18px)",
      }}
    >
      {items.map((Icon, index) => (
        <div
          key={index}
          style={{
            display: "grid",
            justifyItems: "center",
            gap: 6,
            color: index === 0 ? "#111827" : "rgba(17,24,39,0.46)",
            fontSize: 9,
            fontWeight: 600,
          }}
        >
          <Icon size={16} />
          <span>{index === 0 ? "Home" : ""}</span>
        </div>
      ))}
    </div>
  );
}

function HomeCard({
  title,
  subtitle,
  price,
  image,
  active,
}: {
  title: string;
  subtitle: string;
  price: string;
  image: string;
  active?: boolean;
}) {
  return (
    <div
      style={{
        borderRadius: 24,
        border: "1px solid rgba(15,23,42,0.08)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(249,250,251,0.92))",
        padding: 10,
        display: "grid",
        gap: 8,
        boxShadow: active
          ? "0 26px 54px -44px rgba(15,23,42,0.42)"
          : "0 16px 32px -28px rgba(15,23,42,0.22)",
      }}
    >
      <div
        style={{
          height: 116,
          borderRadius: 18,
          background: image,
        }}
      />
      <div style={{ display: "grid", gap: 6 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(17,24,39,0.42)",
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: "-0.04em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#047857",
            letterSpacing: "-0.04em",
          }}
        >
          {price}
        </div>
      </div>
    </div>
  );
}

function HomeWalkthroughHomeScene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const scrollOffset = interpolate(frame, [0, 70], [0, -112], clamp);
  const activeCardScale = interpolate(frame, [68, 80, 94], [1, 0.97, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        ...shellStyle,
        background:
          "radial-gradient(circle at top left, rgba(254,226,226,0.7), transparent 32%), radial-gradient(circle at bottom right, rgba(219,234,254,0.66), transparent 26%), linear-gradient(135deg, #fff8f5 0%, #f7f5ef 100%)",
        opacity: sceneOpacity(frame, durationInFrames),
      }}
    >
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          ...enterStyle(frame, fps),
        }}
      >
        <PhoneFrame>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                padding: "42px 16px 0",
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SaveKaroMark className="h-6 w-6" />
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                    }}
                  >
                    SaveKaro
                  </div>
                </div>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.08)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  height: 38,
                  borderRadius: 999,
                  background: "rgba(15,23,42,0.06)",
                  padding: "0 12px",
                  color: "rgba(17,24,39,0.46)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <Search size={14} />
                Search deals...
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflow: "hidden",
                }}
              >
                {["Today's picks", "Trending", "Big drops"].map((label, index) => (
                  <div
                    key={label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: 30,
                      borderRadius: 999,
                      padding: "0 10px",
                      background:
                        index === 0
                          ? "rgba(254,240,138,0.5)"
                          : "rgba(15,23,42,0.05)",
                      color:
                        index === 0
                          ? "#111827"
                          : "rgba(17,24,39,0.62)",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                top: 146,
                bottom: 72,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  transform: `translateY(${scrollOffset}px)`,
                }}
              >
                <HomeCard
                  title="Nike Pegasus 40"
                  subtitle="Myntra"
                  price="₹4,899"
                  image="linear-gradient(145deg, rgba(219,234,254,0.92), rgba(191,219,254,0.65))"
                />
                <div style={{ transform: `scale(${activeCardScale})` }}>
                  <HomeCard
                    title="Sony WH-1000XM5"
                    subtitle="Amazon"
                    price="₹19,999"
                    image="linear-gradient(145deg, rgba(254,226,226,0.9), rgba(253,186,116,0.4))"
                    active
                  />
                </div>
                <HomeCard
                  title="Ajio Sneaker Sale"
                  subtitle="Ajio"
                  price="Up to 60% off"
                  image="linear-gradient(145deg, rgba(220,252,231,0.9), rgba(167,243,208,0.5))"
                />
              </div>
            </div>

            <TapIndicator x={159} y={300} frame={frame} delay={70} />
            <MobileBottomNav />
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
}

function HomeWalkthroughDetailScene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const buttonScale = interpolate(frame, [52, 66, 80], [1, 0.97, 1], clamp);

  return (
    <AbsoluteFill
      style={{
        ...shellStyle,
        background:
          "radial-gradient(circle at top left, rgba(191,219,254,0.68), transparent 30%), radial-gradient(circle at bottom right, rgba(254,240,138,0.48), transparent 28%), linear-gradient(135deg, #f8fbff 0%, #f5f2ea 100%)",
        opacity: sceneOpacity(frame, durationInFrames),
      }}
    >
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          ...enterStyle(frame, fps),
        }}
      >
        <PhoneFrame>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                height: 54,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "40px 16px 0",
                borderBottom: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <ArrowLeft size={18} />
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "rgba(17,24,39,0.72)",
                }}
              >
                Back
              </span>
            </div>

            <div
              style={{
                padding: "14px 16px 74px",
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  height: 150,
                  borderRadius: 24,
                  background:
                    "linear-gradient(145deg, rgba(254,226,226,0.92), rgba(191,219,254,0.56))",
                  border: "1px solid rgba(15,23,42,0.08)",
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {["Amazon", "17h ago", "0 votes"].map((pill, index) => (
                  <div
                    key={pill}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 30,
                      padding: "0 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(15,23,42,0.08)",
                      background: "rgba(15,23,42,0.03)",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "rgba(17,24,39,0.72)",
                    }}
                  >
                    {index === 0 ? <Store size={12} /> : index === 1 ? <Tag size={12} /> : <ArrowUp size={12} />}
                    {pill}
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: 24,
                  lineHeight: 1.06,
                  fontWeight: 800,
                  letterSpacing: "-0.05em",
                }}
              >
                Sony WH-1000XM5 Wireless Headphones
              </div>

              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: "-0.05em",
                  color: "#047857",
                }}
              >
                ₹19,999
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {["0", "", "", ""].map((value, index) => (
                  <div
                    key={index}
                    style={{
                      height: 38,
                      borderRadius: 14,
                      border: "1px solid rgba(15,23,42,0.08)",
                      background: "rgba(255,255,255,0.95)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "rgba(17,24,39,0.76)",
                    }}
                  >
                    {index === 0 ? <ArrowUp size={14} /> : index === 1 ? <Heart size={14} /> : index === 2 ? <ShoppingBag size={14} /> : <Store size={14} />}
                    {value}
                  </div>
                ))}
              </div>

              <div
                style={{
                  height: 48,
                  borderRadius: 999,
                  background: "#111827",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontSize: 16,
                  fontWeight: 700,
                  boxShadow: "0 20px 44px -28px rgba(15,23,42,0.5)",
                  transform: `scale(${buttonScale})`,
                }}
              >
                Visit Store
                <ExternalLink size={15} />
              </div>
            </div>

            <TapIndicator x={159} y={456} frame={frame} delay={58} />
            <MobileBottomNav />
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
}

function HomeWalkthroughStoreScene() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        ...shellStyle,
        background:
          "radial-gradient(circle at top right, rgba(220,252,231,0.72), transparent 34%), radial-gradient(circle at bottom left, rgba(254,226,226,0.46), transparent 26%), linear-gradient(135deg, #f8fff9 0%, #f7f5ef 100%)",
        opacity: sceneOpacity(frame, durationInFrames),
      }}
    >
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          ...enterStyle(frame, fps),
        }}
      >
        <PhoneFrame>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                padding: "40px 12px 0",
              }}
            >
              <div
                style={{
                  height: 38,
                  borderRadius: 16,
                  background: "rgba(244,244,245,0.96)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "rgba(17,24,39,0.7)",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
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
                  amazon.in
                </div>
                <Store size={14} color="rgba(17,24,39,0.5)" />
              </div>
            </div>

            <div
              style={{
                padding: "14px 16px 74px",
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  height: 172,
                  borderRadius: 22,
                  background:
                    "linear-gradient(145deg, rgba(219,234,254,0.9), rgba(255,255,255,0.46))",
                  border: "1px solid rgba(15,23,42,0.08)",
                }}
              />

              <div
                style={{
                  display: "grid",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "rgba(17,24,39,0.44)",
                  }}
                >
                  Official store page
                </div>
                <div
                  style={{
                    fontSize: 22,
                    lineHeight: 1.08,
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Sony WH-1000XM5 Wireless Headphones
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: "-0.05em",
                    color: "#047857",
                  }}
                >
                  ₹19,999
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {[
                  "Buy from the real merchant page",
                  "Check stock, offers, and delivery here",
                ].map((row) => (
                  <div
                    key={row}
                    style={{
                      minHeight: 40,
                      borderRadius: 14,
                      background: "rgba(15,23,42,0.04)",
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "rgba(17,24,39,0.7)",
                    }}
                  >
                    {row}
                  </div>
                ))}
              </div>
            </div>

            <MobileBottomNav />
          </div>
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
}

export default function HomeWalkthroughVideo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#f8f5ef", overflow: "hidden" }}>
      <Sequence from={0} durationInFrames={110}>
        <HomeWalkthroughHomeScene />
      </Sequence>
      <Sequence from={110} durationInFrames={110}>
        <HomeWalkthroughDetailScene />
      </Sequence>
      <Sequence from={220} durationInFrames={110}>
        <HomeWalkthroughStoreScene />
      </Sequence>
    </AbsoluteFill>
  );
}
