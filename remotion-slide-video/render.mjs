import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const start = async () => {
  console.log("Bundling project...");
  const bundled = await bundle({
    entryPoint: path.join(__dirname, "src/index.ts"),
    webpackOverride: (config) => config,
  });

  console.log("Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "GenAlphaAlliance",
    chromeMode: "headless-shell",
  });

  console.log(
    `Rendering ${composition.durationInFrames} frames at ${composition.fps}fps...`
  );

  const outputPath = path.join(__dirname, "out", "GenAlphaAlliance.mp4");

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    chromeMode: "headless-shell",
  });

  console.log(`Video rendered successfully to: ${outputPath}`);
};

start().catch((err) => {
  console.error("Render failed:", err);
  process.exit(1);
});
