import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicAssetsDir = path.join(projectRoot, "public", "assets", "aiaiac-2027");

const peopleFolders = [
  { folder: "ket-note-speakers", maxWidth: 1000, quality: 85 },
  { folder: "technical-chairman", maxWidth: 900, quality: 85 },
  { folder: "advisory-board", maxWidth: 480, quality: 82 },
  { folder: "organising-committee", maxWidth: 480, quality: 82 },
  { folder: "technical-committees/asset-integrity", maxWidth: 480, quality: 82 },
  { folder: "technical-committees/artificial-intelligence", maxWidth: 480, quality: 82 },
  { folder: "technical-committees/automation-cybersecurity", maxWidth: 480, quality: 82 },
];

async function convertPeopleImages() {
  console.log("=== AIAIAC AFRICA: CONVERTING PEOPLE IMAGES TO WEBP ===");
  console.log(`Assets Directory: ${publicAssetsDir}\n`);

  let totalConverted = 0;
  let totalSkipped = 0;
  let totalSavedBytes = 0;

  for (const { folder, maxWidth, quality } of peopleFolders) {
    const dirPath = path.join(publicAssetsDir, folder);
    if (!fs.existsSync(dirPath)) {
      console.warn(`[Skip] Directory not found: ${dirPath}`);
      continue;
    }

    console.log(`\nProcessing folder: ${folder}`);
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (file === ".gitkeep") continue;

      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) continue;

      const ext = path.extname(file).toLowerCase();
      if (![".png", ".jpg", ".jpeg"].includes(ext)) {
        continue;
      }

      const baseName = path.basename(file, ext);
      const webpFilename = `${baseName}.webp`;
      const webpPath = path.join(dirPath, webpFilename);
      const srcStat = fs.statSync(filePath);

      if (fs.existsSync(webpPath)) {
        const destStat = fs.statSync(webpPath);
        // If webp already exists and source is not newer, skip
        if (destStat.mtimeMs >= srcStat.mtimeMs && destStat.size > 0) {
          console.log(
            `  [Exists] ${webpFilename} already present (${(destStat.size / 1024).toFixed(1)} KB vs src ${(srcStat.size / 1024).toFixed(1)} KB)`,
          );
          totalSkipped++;
          continue;
        }
      }

      try {
        console.log(
          `  [Converting] ${file} (${(srcStat.size / 1024).toFixed(1)} KB) -> ${webpFilename} (max ${maxWidth}px, q=${quality})...`,
        );

        await sharp(filePath)
          .rotate() // Auto-rotate based on EXIF
          .resize({
            width: maxWidth,
            withoutEnlargement: true,
            fit: "inside",
          })
          .webp({ quality })
          .toFile(webpPath);

        const newStat = fs.statSync(webpPath);
        const saved = srcStat.size - newStat.size;
        totalSavedBytes += saved;
        totalConverted++;

        console.log(
          `  [Success] Created ${webpFilename} (${(newStat.size / 1024).toFixed(1)} KB, saved ${(saved / 1024).toFixed(1)} KB / ${((saved / srcStat.size) * 100).toFixed(1)}%)`,
        );
      } catch (err) {
        console.error(`  [Error] Failed to convert ${file}:`, err);
      }
    }
  }

  console.log("\n=== CONVERSION SUMMARY ===");
  console.log(`Newly Converted: ${totalConverted}`);
  console.log(`Previously Existing / Skipped: ${totalSkipped}`);
  console.log(`Total Storage Saved: ${(totalSavedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log("Original JPG/PNG files preserved intact beside generated WebP files.\n");
}

convertPeopleImages().catch((err) => {
  console.error("Fatal error during image conversion:", err);
  process.exit(1);
});
