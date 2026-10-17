import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, "..");
const committeeDataFile = path.resolve(frontendDir, "src/data/committee.ts");

const mappings = {
  "artificial-intelligence": {
    dir: path.resolve(
      frontendDir,
      "public/assets/aiaiac-2027/technical-committees/artificial-intelligence",
    ),
    publicPrefix: "/assets/aiaiac-2027/technical-committees/artificial-intelligence",
    pairs: [
      {
        src: "ChatGPT Image Sep 5, 2026, 07_57_16 AM (2)-720.webp",
        dest: "olugbenga-abimbola-oredeko.webp",
        memberId: "olugbenga-abimbola-oredeko",
      },
      {
        src: "ChatGPT Image Sep 5, 2026, 07_57_18 AM (8)-720.webp",
        dest: "opubo-edwin-atiegoba.webp",
        memberId: "opubo-edwin-atiegoba",
      },
      {
        src: "WhatsApp_Image_2026-09-05_at_19.06.06-removebg-preview-720.webp",
        dest: "onasoga-olukayode.webp",
        memberId: "onasoga-olukayode",
      },
    ],
  },
  "automation-cybersecurity": {
    dir: path.resolve(
      frontendDir,
      "public/assets/aiaiac-2027/technical-committees/automation-cybersecurity",
    ),
    publicPrefix: "/assets/aiaiac-2027/technical-committees/automation-cybersecurity",
    pairs: [
      {
        src: "ChatGPT Image Sep 5, 2026, 08_33_10 AM (1)-720.webp",
        dest: "joseph-s-ojo.webp",
        memberId: "joseph-s-ojo",
      },
      {
        src: "ChatGPT Image Sep 5, 2026, 08_33_10 AM (10)-720.webp",
        dest: "umar-saad.webp",
        memberId: "umar-saad",
      },
      {
        src: "ChatGPT Image Sep 5, 2026, 08_33_10 AM (2)-720.webp",
        dest: "emmanuel-omoke.webp",
        memberId: "emmanuel-omoke",
      },
      {
        src: "ChatGPT Image Sep 5, 2026, 08_33_10 AM (3)-720.webp",
        dest: "ahmed-barrak.webp",
        memberId: "ahmed-barrak",
      },
      {
        src: "ChatGPT Image Sep 5, 2026, 08_33_10 AM (4)-720.webp",
        dest: "ademola-agboola.webp",
        memberId: "ademola-agboola",
      },
      {
        src: "ChatGPT Image Sep 5, 2026, 08_33_10 AM (5)-720.webp",
        dest: "desmond-inyamah.webp",
        memberId: "desmond-inyamah",
      },
      {
        src: "ChatGPT Image Sep 5, 2026, 08_33_10 AM (6)-720.webp",
        dest: "olabode-agboola.webp",
        memberId: "olabode-agboola",
      },
      {
        src: "ChatGPT Image Sep 5, 2026, 08_33_10 AM (8)-720.webp",
        dest: "marshal-abraham.webp",
        memberId: "marshal-abraham",
      },
      {
        src: "ChatGPT Image Sep 5, 2026, 08_33_10 AM (9)-720.webp",
        dest: "tolulope-longe.webp",
        memberId: "tolulope-longe",
      },
      {
        src: "WhatsApp_Image_2026-09-08_at_02.34.09-removebg-preview-720.webp",
        dest: "cynthia-kevin-nwahiri.webp",
        memberId: "cynthia-kevin-nwahiri",
      },
    ],
  },
};

function runMapping() {
  console.log("==================================================");
  console.log(" AIAIAC Technical Committee Image Mapper");
  console.log("==================================================\n");

  let totalCopied = 0;
  const memberPathUpdates = new Map();

  for (const [committeeKey, config] of Object.entries(mappings)) {
    console.log(`📁 Processing Committee: ${committeeKey}`);
    console.log(`   Directory: ${config.dir}\n`);

    if (!fs.existsSync(config.dir)) {
      console.error(`[ERROR] Directory does not exist: ${config.dir}`);
      continue;
    }

    for (const pair of config.pairs) {
      const srcPath = path.join(config.dir, pair.src);
      const destPath = path.join(config.dir, pair.dest);
      const publicDestPath = `${config.publicPrefix}/${pair.dest}`;

      if (fs.existsSync(srcPath)) {
        // Copy to approved slug filename (preserving original source file)
        fs.copyFileSync(srcPath, destPath);
        totalCopied++;
        memberPathUpdates.set(pair.memberId, publicDestPath);
        console.log(`   ✅ Copied: ${pair.src}`);
        console.log(`         └─► ${pair.dest} (${publicDestPath})`);
      } else {
        console.log(`   ⚠️ Source file not found: ${pair.src}`);
      }
    }
    console.log("");
  }

  // Now update committee.ts file with the new mapped paths
  if (fs.existsSync(committeeDataFile) && memberPathUpdates.size > 0) {
    let content = fs.readFileSync(committeeDataFile, "utf-8");
    let updatedCount = 0;

    for (const [memberId, newPath] of memberPathUpdates.entries()) {
      // Look for member block in committee.ts and update its image field
      const regex = new RegExp(`(id:\\s*"${memberId}"[\\s\\S]*?image:\\s*)"[^"]+"`, "g");
      if (regex.test(content)) {
        content = content.replace(regex, `$1"${newPath}"`);
        updatedCount++;
      }
    }

    fs.writeFileSync(committeeDataFile, content, "utf-8");
    console.log(`📝 Updated ${updatedCount} member image paths in committee.ts`);
  }

  console.log("\n==================================================");
  console.log(" MAPPING COMPLETED SUCCESSFULLY");
  console.log(` Total Files Copied to Clean Slugs: ${totalCopied}`);
  console.log(" Original Source Files Preserved until verified.");
  console.log("==================================================\n");
}

runMapping();
