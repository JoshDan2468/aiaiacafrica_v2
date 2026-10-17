import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");
const iconsDir = path.join(publicDir, "icons");
const sourceLogo = path.join(publicDir, "brand", "aiaiac-emblem.png");

fs.mkdirSync(iconsDir, { recursive: true });

async function generateIcons() {
  console.log("=== GENERATING FAVICONS, APP ICONS & PWA MANIFEST ===");
  console.log("Source Icon:", sourceLogo);

  // 1. favicon-48.png
  await sharp(sourceLogo).resize(48, 48).png().toFile(path.join(publicDir, "favicon-48.png"));
  console.log("Generated: public/favicon-48.png");

  // 2. favicon-96.png
  await sharp(sourceLogo).resize(96, 96).png().toFile(path.join(publicDir, "favicon-96.png"));
  console.log("Generated: public/favicon-96.png");

  // 3. favicon.ico (fallback 48x48 png format supported by all modern browsers)
  await sharp(sourceLogo).resize(48, 48).png().toFile(path.join(publicDir, "favicon.ico"));
  console.log("Generated: public/favicon.ico");

  // 4. apple-touch-icon.png (180x180)
  await sharp(sourceLogo)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, "apple-touch-icon.png"));
  console.log("Generated: public/apple-touch-icon.png");

  // 5. PWA icon-192.png
  await sharp(sourceLogo).resize(192, 192).png().toFile(path.join(iconsDir, "icon-192.png"));
  console.log("Generated: public/icons/icon-192.png");

  // 6. PWA icon-512.png
  await sharp(sourceLogo).resize(512, 512).png().toFile(path.join(iconsDir, "icon-512.png"));
  console.log("Generated: public/icons/icon-512.png");

  // 7. PWA maskable-192.png (padded with dark background #05190F to protect safe zone)
  const inner192 = await sharp(sourceLogo).resize(150, 150, { fit: "inside" }).toBuffer();

  await sharp({
    create: {
      width: 192,
      height: 192,
      channels: 4,
      background: { r: 5, g: 25, b: 15, alpha: 1 }, // #05190F
    },
  })
    .composite([{ input: inner192, gravity: "center" }])
    .png()
    .toFile(path.join(iconsDir, "maskable-192.png"));
  console.log("Generated: public/icons/maskable-192.png");

  // 8. PWA maskable-512.png (padded with dark background #05190F to protect safe zone)
  const inner512 = await sharp(sourceLogo).resize(400, 400, { fit: "inside" }).toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 5, g: 25, b: 15, alpha: 1 }, // #05190F
    },
  })
    .composite([{ input: inner512, gravity: "center" }])
    .png()
    .toFile(path.join(iconsDir, "maskable-512.png"));
  console.log("Generated: public/icons/maskable-512.png");

  // 9. site.webmanifest
  const manifest = {
    name: "AIAIAC Africa 2027",
    short_name: "AIAIAC",
    description:
      "The Asset Integrity, Artificial Intelligence, Automation & Cybersecurity Conference in Lagos, Nigeria.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#05190F",
    background_color: "#05190F",
    icons: [
      {
        src: "/favicon-48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/favicon-96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  fs.writeFileSync(
    path.join(publicDir, "site.webmanifest"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );
  console.log("Generated: public/site.webmanifest\n");
}

generateIcons().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
