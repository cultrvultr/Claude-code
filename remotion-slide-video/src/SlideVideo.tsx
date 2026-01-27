import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { Slide1Title } from "./slides/Slide1Title";
import { Slide2Problem } from "./slides/Slide2Problem";
import { Slide3Solution } from "./slides/Slide3Solution";
import { Slide4WhyNow } from "./slides/Slide4WhyNow";
import { Slide5PathForward } from "./slides/Slide5PathForward";

const SLIDE_DURATION = 90; // 3 seconds per slide at 30fps
const TRANSITION_DURATION = 15; // 0.5 second transition

const SlideTransition: React.FC<{
  children: React.ReactNode;
  startFrame: number;
}> = ({ children, startFrame }) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  const opacity = interpolate(
    relativeFrame,
    [0, TRANSITION_DURATION],
    [0, 1],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  const translateY = interpolate(
    relativeFrame,
    [0, TRANSITION_DURATION],
    [30, 0],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const SlideVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
      <Sequence from={0} durationInFrames={SLIDE_DURATION}>
        <SlideTransition startFrame={0}>
          <Slide1Title />
        </SlideTransition>
      </Sequence>

      <Sequence from={SLIDE_DURATION} durationInFrames={SLIDE_DURATION}>
        <SlideTransition startFrame={SLIDE_DURATION}>
          <Slide2Problem />
        </SlideTransition>
      </Sequence>

      <Sequence from={SLIDE_DURATION * 2} durationInFrames={SLIDE_DURATION}>
        <SlideTransition startFrame={SLIDE_DURATION * 2}>
          <Slide3Solution />
        </SlideTransition>
      </Sequence>

      <Sequence from={SLIDE_DURATION * 3} durationInFrames={SLIDE_DURATION}>
        <SlideTransition startFrame={SLIDE_DURATION * 3}>
          <Slide4WhyNow />
        </SlideTransition>
      </Sequence>

      <Sequence from={SLIDE_DURATION * 4} durationInFrames={SLIDE_DURATION}>
        <SlideTransition startFrame={SLIDE_DURATION * 4}>
          <Slide5PathForward />
        </SlideTransition>
      </Sequence>
    </AbsoluteFill>
  );
};
