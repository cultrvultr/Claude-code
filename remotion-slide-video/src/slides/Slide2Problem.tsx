import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";

const ProblemItem: React.FC<{
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  delay: number;
}> = ({ icon, iconColor, title, subtitle, delay }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const x = interpolate(frame, [delay, delay + 12], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${x}px)`,
        display: "flex",
        alignItems: "center",
        marginBottom: 28,
      }}
    >
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 12,
          backgroundColor: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          marginRight: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            color: "white",
            fontWeight: 700,
            fontSize: 22,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div style={{ color: "#8899aa", fontSize: 17 }}>{subtitle}</div>
      </div>
    </div>
  );
};

export const Slide2Problem: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [5, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const statOpacity = interpolate(frame, [15, 28], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const statScale = interpolate(frame, [15, 28], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1b2138",
        fontFamily:
          "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        padding: "60px 80px",
        borderTop: "4px solid #ff4081",
      }}
    >
      <div style={{ opacity: headerOpacity }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: "#ff4081",
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 8,
          }}
        >
          The Problem
        </div>
        <div
          style={{
            fontSize: 28,
            color: "white",
            marginBottom: 50,
          }}
        >
          Gen Alpha Is Invisible to Traditional Marketing
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 80,
        }}
      >
        <div
          style={{
            opacity: statOpacity,
            transform: `scale(${statScale})`,
            backgroundColor: "#232b45",
            borderRadius: 16,
            padding: "40px 50px",
            textAlign: "center",
            minWidth: 260,
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: "#4fc3f7",
              marginBottom: 8,
            }}
          >
            2B+
          </div>
          <div style={{ color: "#8899aa", fontSize: 18, lineHeight: 1.4 }}>
            consumers unreachable
            <br />
            by traditional ads
          </div>
        </div>

        <div style={{ flex: 1, paddingTop: 10 }}>
          <ProblemItem
            icon="📺"
            iconColor="#e91e63"
            title="Don't watch TV"
            subtitle="Cord-cutting is their default"
            delay={25}
          />
          <ProblemItem
            icon="🚫"
            iconColor="#e91e63"
            title="Skip digital ads"
            subtitle="Ad blockers from birth"
            delay={35}
          />
          <ProblemItem
            icon="🔒"
            iconColor="#e91e63"
            title="Private social lives"
            subtitle="Discord, not public feeds"
            delay={45}
          />
          <ProblemItem
            icon="🎮"
            iconColor="#4fc3f7"
            title="Walled gardens"
            subtitle="150 min/day on Roblox"
            delay={55}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
