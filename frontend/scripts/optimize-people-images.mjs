import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicAssetsDir = path.join(projectRoot, "public", "assets", "aiaiac-2027");

const peopleFolders = [
  "advisory-board",
  "organising-committee",
  "technical-committees/asset-integrity",
  "technical-committees/artificial-intelligence",
  "technical-committees/automation-cybersecurity",
  "ket-note-speakers",
  "speakers",
];

import sharp from "sharp";

async function optimizeImages() {
  console.log("Scanning people image directories for large assets...");
  let count = 0;
  console.log("Scanning people image directories for large assets (>300 KB)...");
  let optimizedCount = 0;
  let totalSavedBytes = 0;

  for (const folder of peopleFolders) {
    const dirPath = path.join(publicAssetsDir, folder);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) continue;

      const stat = fs.statSync(filePath);
      const ext = path.extname(file).toLowerCase();

      if (stat.size > 500 * 1024) {
        console.log(
          `[Heavy Image Detected] ${folder}/${file} (${(stat.size / 1024).toFixed(1)} KB)`,
        );
        count++;
      }

      // Look for large images (>300KB) that are PNG or JPG
      if (stat.size > 300 * 1024 && (ext === ".png" || ext === ".jpg" || ext === ".jpeg")) {
        const baseName = path.basename(file, ext);
        const webpFilename = `${baseName}.webp`;
        const webpPath = path.join(dirPath, webpFilename);

        // If .webp already exists, check if it's smaller
        if (fs.existsSync(webpPath)) {
          const webpStat = fs.statSync(webpPath);
          console.log(
            `[Exists] ${folder}/${webpFilename} already present (${(webpStat.size / 1024).toFixed(1)} KB vs original ${(stat.size / 1024).toFixed(1)} KB)`,
          );
          continue;
        }

        try {
          console.log(
            `[Optimizing] ${folder}/${file} (${(stat.size / 1024).toFixed(1)} KB) -> WebP 480px @ 80%...`,
          );
          await sharp(filePath)
            .resize({ width: 480, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(webpPath);

          const newStat = fs.statSync(webpPath);
          const saved = stat.size - newStat.size;
          totalSavedBytes += saved;
          optimizedCount++;
          console.log(
            `[Success] Created ${folder}/${webpFilename} (${(newStat.size / 1024).toFixed(1)} KB, saved ${(saved / 1024).toFixed(1)} KB / ${((saved / stat.size) * 100).toFixed(1)}%)`,
          );
        } catch (err) {
          console.error(`[Error] Failed to convert ${folder}/${file}:`, err);
        }
      }
    }
  }

  if (count === 0) {
    console.log("All people images are optimized under size thresholds.");
  } else {
    console.log(`Found ${count} heavy images (>500KB). WebP conversion supported.`);
  }
  console.log(
    `\nOptimization finished: ${optimizedCount} images converted. Total saved: ${(totalSavedBytes / (1024 * 1024)).toFixed(2)} MB. Original files preserved intact.`,
  );
}

optimizeImages();
