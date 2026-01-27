import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";

const StepCircle: React.FC<{
  number: number;
  label: string;
  color: string;
  delay: number;
}> = ({ number, label, color, delay }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [delay, delay + 10], [0.5, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.ease),
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: 180,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          fontWeight: 900,
          color: "white",
          marginBottom: 14,
        }}
      >
        {number}
      </div>
      <div
        style={{
          color: "#aabbcc",
          fontSize: 16,
          textAlign: "center",
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const Slide5PathForward: React.FC = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [5, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const messageOpacity = interpolate(frame, [50, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const ctaOpacity = interpolate(frame, [58, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const footerOpacity = interpolate(frame, [65, 78], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1b2138",
        fontFamily:
          "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
        padding: "50px 80px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        borderTop: "4px solid #4fc3f7",
      }}
    >
      <div
        style={{
          opacity: titleOpacity,
          fontSize: 52,
          fontWeight: 900,
          color: "white",
          textTransform: "uppercase",
          letterSpacing: 3,
          marginBottom: 50,
          textAlign: "center",
        }}
      >
        The Path Forward
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 30,
          marginBottom: 50,
        }}
      >
        <StepCircle
          number={1}
          label="Founder Conversations"
          color="#4fc3f7"
          delay={15}
        />
        <StepCircle
          number={2}
          label="Joint Strategy Session"
          color="#00e676"
          delay={22}
        />
        <StepCircle
          number={3}
          label="Structure Design"
          color="#b388ff"
          delay={29}
        />
        <StepCircle
          number={4}
          label="Mutual Diligence"
          color="#00e676"
          delay={36}
        />
        <StepCircle
          number={5}
          label="Definitive Agreements"
          color="#ff4081"
          delay={43}
        />
      </div>

      <div
        style={{
          opacity: messageOpacity,
          backgroundColor: "#232b45",
          borderRadius: 12,
          padding: "28px 50px",
          textAlign: "center",
          marginBottom: 20,
          borderTop: "3px solid #b388ff",
          maxWidth: 800,
          width: "100%",
        }}
      >
        <div
          style={{
            color: "#8899aa",
            fontSize: 19,
            marginBottom: 10,
          }}
        >
          We can compete for crumbs while holding companies buy our
          competitors.
        </div>
        <div
          style={{
            opacity: ctaOpacity,
            color: "#00e676",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Or we can come together to own the category we helped create.
        </div>
      </div>

      <div
        style={{
          opacity: footerOpacity,
          textAlign: "center",
          marginTop: 20,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: "white",
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 12,
          }}
        >
          The Generation Alpha Alliance
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#b388ff",
            letterSpacing: 3,
          }}
        >
          Chartis &nbsp;&bull;&nbsp; Sawhorse &nbsp;&bull;&nbsp; LFG
          &nbsp;&bull;&nbsp; Levellr &nbsp;&bull;&nbsp; Wildfire
        </div>
      </div>
    </AbsoluteFill>
  );
};
