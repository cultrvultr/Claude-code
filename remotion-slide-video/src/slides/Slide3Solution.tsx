import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";

const FunnelStep: React.FC<{
  label: string;
  labelColor: string;
  company: string;
  borderColor: string;
  delay: number;
  showArrow: boolean;
}> = ({ label, labelColor, company, borderColor, delay, showArrow }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const y = interpolate(frame, [delay, delay + 10], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          backgroundColor: "#232b45",
          borderRadius: 12,
          padding: "30px 20px",
          width: 180,
          textAlign: "center",
          borderTop: `4px solid ${borderColor}`,
        }}
      >
        <div
          style={{
            color: labelColor,
            fontSize: 15,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 2,
            marginBottom: 12,
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: "white",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          {company}
        </div>
      </div>
      {showArrow && (
        <div
          style={{
            opacity,
            color: "#556677",
            fontSize: 28,
          }}
        >
          →
        </div>
      )}
    </div>
  );
};

export const Slide3Solution: React.FC = () => {
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
        borderTop: "4px solid #00e676",
      }}
    >
      <div style={{ opacity: headerOpacity }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: "#00e676",
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 8,
          }}
        >
          The Solution
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#ccc",
            marginBottom: 60,
          }}
        >
          One Platform. Full Funnel. Complete Control.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 60,
        }}
      >
        <FunnelStep
          label="Creative"
          labelColor="#ff4081"
          company="Sawhorse"
          borderColor="#ff4081"
          delay={15}
          showArrow={true}
        />
        <FunnelStep
          label="Incubate"
          labelColor="#00e676"
          company="LFG"
          borderColor="#00e676"
          delay={25}
          showArrow={true}
        />
        <FunnelStep
          label="Distribute"
          labelColor="#b388ff"
          company="Chartis"
          borderColor="#b388ff"
          delay={35}
          showArrow={true}
        />
        <FunnelStep
          label="Engage"
          labelColor="#ff4081"
          company="Wildfire"
          borderColor="#ff4081"
          delay={45}
          showArrow={true}
        />
        <FunnelStep
          label="Convert"
          labelColor="#ffd740"
          company="Levellr"
          borderColor="#ffd740"
          delay={55}
          showArrow={false}
        />
      </div>

      <div
        style={{
          opacity: footerOpacity,
          textAlign: "center",
          color: "#ff4081",
          fontSize: 22,
          fontStyle: "italic",
          fontWeight: 600,
        }}
      >
        No competitor offers this end-to-end capability.
      </div>
    </AbsoluteFill>
  );
};
