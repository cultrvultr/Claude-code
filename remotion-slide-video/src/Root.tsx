import React from "react";
import { Composition } from "remotion";
import { SlideVideo } from "./SlideVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GenAlphaAlliance"
        component={SlideVideo}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
