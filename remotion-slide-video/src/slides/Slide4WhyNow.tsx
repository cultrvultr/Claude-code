import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";

const ReasonCard: React.FC<{
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  borderColor: string;
  delay: number;
}> = ({ icon, iconColor, title, subtitle, borderColor, delay }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const x = interpolate(frame, [delay, delay + 12], [-30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${x}px)`,
        backgroundColor: "#232b45",
        borderRadius: 12,
        padding: "24px 30px",
        marginBottom: 20,
        borderLeft: `4px solid ${borderColor}`,
        display: "flex",
        alignItems: "center",
        gap: 24,
      }}
    >
      <div style={{ fontSize: 36, flexShrink: 0 }}>{icon}</div>
      <div>
        <div
          style={{
            color: iconColor,
            fontSize: 24,
            fontWeight: 700,
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        <div style={{ color: "#8899aa", fontSize: 17 }}>{subtitle}</div>
      </div>
    </div>
  );
};

export const Slide4WhyNow: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [5, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const footerOpacity = interpolate(frame, [60, 72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1b2138",
        fontFamily:
          "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        padding: "60px 80px",
        borderTop: "4px solid #ffd740",
      }}
    >
      <div style={{ opacity: headerOpacity }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: "white",
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 4,
          }}
        >
          Why Now
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#ccc",
            fontStyle: "italic",
            marginBottom: 50,
          }}
        >
          The Window Is Open
        </div>
      </div>

      <div style={{ maxWidth: 900 }}>
        <ReasonCard
          icon="💲"
          iconColor="#00e676"
          title="Brand Budgets Shifting"
          subtitle="$5.4B market. Roblox made $210M from sponsored events in Q1 2025."
          borderColor="#ffd740"
          delay={18}
        />
        <ReasonCard
          icon="🚀"
          iconColor="#ff4081"
          title="Platforms Maturing"
          subtitle="Roblox: $3.6B revenue. Epic: 100% rev share. Discord: filed IPO."
          borderColor="#ffd740"
          delay={30}
        />
        <ReasonCard
          icon="🏁"
          iconColor="#ffd740"
          title="Competition Mobilizing"
          subtitle="Publicis bought Influential for $500M. WPP and Stagwell acquiring."
          borderColor="#ffd740"
          delay={42}
        />
      </div>

      <div
        style={{
          opacity: footerOpacity,
          backgroundColor: "#232b45",
          borderRadius: 12,
          padding: "20px 30px",
          marginTop: 30,
          textAlign: "center",
          color: "#ffd740",
          fontSize: 20,
          fontWeight: 700,
          maxWidth: 900,
        }}
      >
        In 18 months: we define this category, or holding companies acquire us
        separately.
      </div>
    </AbsoluteFill>
  );
};
