import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(frontendDir, "..");

const TARGET_WIDTHS = [320, 480, 720];
const WEBP_QUALITY = 80;
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function run() {
  console.log("==================================================");
  console.log(" AIAIAC Committee Image Optimization");
  console.log("==================================================\n");

  // Determine input directory
  const possibleInputDirs = [
    path.resolve(rootDir, "raw-committee-images"),
    path.resolve(frontendDir, "raw-committee-images"),
    path.resolve(
      frontendDir,
      "public/assets/aiaiac-2027/technical-committees/raw-committee-images",
    ),
  ];

  let inputDir = possibleInputDirs.find((dir) => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      return files.some((f) => ALLOWED_EXTENSIONS.has(path.extname(f).toLowerCase()));
    }
    return false;
  });

  if (!inputDir) {
    inputDir = possibleInputDirs[0];
    fs.mkdirSync(inputDir, { recursive: true });
    console.error(`[ERROR] No image files found in input directories.`);
    console.error(`Please place raw JPG/JPEG/PNG images into: ${inputDir}`);
    process.exit(1);
  }

  const outputDir = path.resolve(
    frontendDir,
    "public/assets/aiaiac-2027/technical-committees/optimized",
  );
  fs.mkdirSync(outputDir, { recursive: true });

  const files = fs.readdirSync(inputDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext);
  });

  if (files.length === 0) {
    console.log(`[WARN] No JPG, JPEG, or PNG images found in: ${inputDir}`);
    process.exit(0);
  }

  console.log(`Input Directory:  ${inputDir}`);
  console.log(`Output Directory: ${outputDir}`);
  console.log(`Target Widths:    ${TARGET_WIDTHS.join("px, ")}px`);
  console.log(`WebP Quality:     ${WEBP_QUALITY}\n`);
  console.log(`Found ${files.length} raw image(s) to process...\n`);

  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;
  let totalGeneratedFiles = 0;

  for (const file of files) {
    const inputFilePath = path.join(inputDir, file);
    const originalStats = fs.statSync(inputFilePath);
    const originalSize = originalStats.size;
    totalOriginalBytes += originalSize;

    const baseName = path.parse(file).name;
    console.log(`📸 Processing: ${file} (${formatBytes(originalSize)})`);

    for (const width of TARGET_WIDTHS) {
      const outputFileName = `${baseName}-${width}.webp`;
      const outputFilePath = path.join(outputDir, outputFileName);

      await sharp(inputFilePath)
        .rotate() // Auto-rotate according to EXIF orientation
        .resize({
          width,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outputFilePath);

      const outputStats = fs.statSync(outputFilePath);
      const outputSize = outputStats.size;

      totalOptimizedBytes += outputSize;
      totalGeneratedFiles += 1;

      const savedBytes = originalSize - outputSize;
      const percentageSaved =
        originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : "0.0";

      console.log(
        `   └─► ${outputFileName.padEnd(45)} ${formatBytes(outputSize).padStart(10)} (${percentageSaved}% saved)`,
      );
    }
    console.log("");
  }

  const grandSavedBytes = totalOriginalBytes - totalOptimizedBytes;
  const grandPercentageSaved =
    totalOriginalBytes > 0 ? ((grandSavedBytes / totalOriginalBytes) * 100).toFixed(1) : "0.0";

  console.log("==================================================");
  console.log(" OPTIMIZATION SUMMARY");
  console.log("==================================================");
  console.log(`Raw Images Processed:    ${files.length}`);
  console.log(`Optimized WebP Generated:${totalGeneratedFiles}`);
  console.log(`Total Original Size:     ${formatBytes(totalOriginalBytes)}`);
  console.log(`Total Optimized Size:    ${formatBytes(totalOptimizedBytes)}`);
  console.log(
    `Total Space Saved:       ${formatBytes(grandSavedBytes)} (${grandPercentageSaved}%)`,
  );
  console.log("==================================================\n");
}

run().catch((err) => {
  console.error("Optimization failed:", err);
  process.exit(1);
});
