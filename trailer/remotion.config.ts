import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Explicit: on Windows "Walkthrough" would otherwise resolve to the walkthrough/ folder.
Config.setEntryPoint("src/index.ts");
