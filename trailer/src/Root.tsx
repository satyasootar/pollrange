import React from "react";
import { Composition } from "remotion";
import { FPS } from "./brand";
import { Trailer, TOTAL } from "./Trailer";
import { Walkthrough, WT_TOTAL } from "./walkthrough/Walkthrough";

export const Root: React.FC = () => (
  <>
    <Composition id="Trailer" component={Trailer} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    <Composition id="Walkthrough" component={Walkthrough} durationInFrames={WT_TOTAL} fps={FPS} width={1920} height={1080} />
  </>
);
