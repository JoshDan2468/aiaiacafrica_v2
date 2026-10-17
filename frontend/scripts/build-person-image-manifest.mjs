/**
 * AIAIAC Africa 2027 — Build Person Image Manifest
 * Delegates directly to the authoritative pipeline in normalize-people-images.mjs
 */
import { runPipeline } from "./normalize-people-images.mjs";

console.log("=== AIAIAC AFRICA: EXECUTING AUTHORITATIVE PERSON ASSET PIPELINE ===");
runPipeline().catch((err) => {
  console.error("Manifest generation failed:", err);
  process.exit(1);
});
