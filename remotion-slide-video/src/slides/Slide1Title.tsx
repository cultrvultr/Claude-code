import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";

export const Slide1Title: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(frame, [10, 25], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  const allianceOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const allianceScale = interpolate(frame, [20, 35], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  const subtitleOpacity = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const brandsOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const iconOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1b2138",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily:
          "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        borderTop: "4px solid #4fc3f7",
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 72,
          fontWeight: 900,
          color: "white",
          textTransform: "uppercase",
          letterSpacing: 4,
          marginBottom: 0,
        }}
      >
        The Generation Alpha
      </div>

      <div
        style={{
          opacity: allianceOpacity,
          transform: `scale(${allianceScale})`,
          fontSize: 90,
          fontWeight: 900,
          color: "#b388ff",
          textTransform: "uppercase",
          letterSpacing: 6,
          marginTop: 0,
          marginBottom: 30,
        }}
      >
        Alliance
      </div>

      <div
        style={{
          opacity: subtitleOpacity,
          fontSize: 26,
          color: "#ccc",
          fontStyle: "italic",
          marginBottom: 30,
        }}
      >
        The First Full-Funnel Platform to Reach 2 Billion Consumers
      </div>

      <div
        style={{
          opacity: brandsOpacity,
          fontSize: 20,
          color: "#4fc3f7",
          letterSpacing: 3,
          marginBottom: 40,
        }}
      >
        Chartis &nbsp;&bull;&nbsp; Sawhorse &nbsp;&bull;&nbsp; LFG
        &nbsp;&bull;&nbsp; Levellr &nbsp;&bull;&nbsp; Wildfire
      </div>

      <div
        style={{
          opacity: iconOpacity,
        }}
      >
        <svg
          width="60"
          height="50"
          viewBox="0 0 60 50"
          fill="none"
        >
          <rect
            x="5"
            y="8"
            width="50"
            height="30"
            rx="15"
            fill="#4fc3f7"
          />
          <circle cx="22" cy="23" r="4" fill="#1b2138" />
          <circle cx="38" cy="23" r="4" fill="#1b2138" />
          <rect
            x="15"
            y="38"
            width="8"
            height="10"
            rx="2"
            fill="#4fc3f7"
          />
          <rect
            x="37"
            y="38"
            width="8"
            height="10"
            rx="2"
            fill="#4fc3f7"
          />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
