import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicDir = path.join(projectRoot, "public");

// Import manifest
const manifestPath = path.join(projectRoot, "src", "generated", "personImageManifest.ts");
const manifestContent = fs.readFileSync(manifestPath, "utf8");
// Extract personImageManifest object
const jsonMatch = manifestContent.match(
  /export const personImageManifest:[^=]*=\s*({[\s\S]*?})\s*as const;/,
);
if (!jsonMatch) {
  console.error("Failed to parse personImageManifest.ts");
  process.exit(1);
}
const personImageManifest = new Function(`return ${jsonMatch[1]}`)();

function checkFileExists(relPublicPath) {
  if (!relPublicPath) return { exists: false, size: 0 };
  const cleanPath = relPublicPath.replace(/^\//, "");
  const fullPath = path.join(publicDir, cleanPath);
  if (fs.existsSync(fullPath)) {
    return { exists: true, size: fs.statSync(fullPath).size, fullPath };
  }
  return { exists: false, size: 0, fullPath };
}

// Committees to verify
const checks = [
  {
    title: "Keynote Speaker",
    section: "keynote-speakers",
    members: [{ name: "Dr. James Makinde", slug: "james-makinde" }],
  },
  {
    title: "Technical Chairman",
    section: "technical-chairman",
    members: [{ name: "Dr. (Engr.) Gbenga Ayodele Owolabi", slug: "gbenga-ayodele-owolabi" }],
  },
  {
    title: "Advisory Board",
    section: "advisory-board",
    members: [
      { name: "Dr. Engr. Isaac Adekanye", slug: "isaac-adekanye" },
      { name: "Engr. Olalekan Oyeleye", slug: "olalekan-oyeleye" },
      { name: "Engr. Sooravan Tharmalingam", slug: "sooravan-tharmalingam" },
      { name: "Engr. Ester Christopher", slug: "ester-christopher" },
      { name: "Omar Rugebani", slug: "omar-rugebani" },
      { name: "Engr. Nnanna Charles Ukaegbu", slug: "nnanna-ukaegbu" },
      { name: "Dr. Mrs. Tina Isichei", slug: "tina-isichei" },
      { name: "Engr. Abel Onyemaechi Nwobodo", slug: "abel-nwobodo" },
      { name: "Engr. Ayo Giwa", slug: "ayo-giwa" },
      { name: "Raj Mohandoss", slug: "raj-mohandoss" },
      { name: "Kayode Adeleke", slug: "kayode-adeleke" },
      { name: "Dr. Kola Fagbayi", slug: "kola-fagbayi" },
    ],
  },
  {
    title: "Organising Committee",
    section: "organising-committee",
    members: [
      { name: "Bunmi Daramola", slug: "bunmi-daramola" },
      { name: "Omowunmi Oladele", slug: "omowunmi-oladele" },
      { name: "Brumilda Haslund", slug: "brumilda-haslund" },
      { name: "Joseph Fatoye", slug: "joseph-fatoye" },
      { name: "Nonye Nketa", slug: "nonye-nketa" },
      { name: "Ezeji Stephanie", slug: "ezeji-stephanie" },
      { name: "Victory Adabhie", slug: "victory-adabhie" },
      { name: "Wilbert Adri", slug: "wilbert-adri" },
      { name: "Emmanuel Samson", slug: "emmanuel-samson" },
      { name: "Adedoyin Yusuf", slug: "adedoyin-yusuf" },
      { name: "Maria Henshaw", slug: "maria-henshaw" },
      { name: "Quadri Basit Omoniyi", slug: "quadri-basit-omaniyi" },
    ],
  },
  {
    title: "Asset Integrity Technical Committee",
    section: "asset-integrity",
    members: [
      { name: "Engr. David Oni", slug: "david-oni" },
      { name: "Engr. Ikenna Ikonta", slug: "ikenna-ikonta" },
      { name: "Engr. Olalekan Adeaga", slug: "olalekan-adeaga" },
      { name: "Engr. Olawale Onasoga", slug: "olawale-onasoga" },
      { name: "Engr. Paul Aminadokiruaru", slug: "paul-aminadokiruaru" },
      { name: "Dr. (Engr.) Mavis Sika Okyere", slug: "mavis-sika-okyere" },
      { name: "Engr. Eric Oguama", slug: "eric-oguama" },
      { name: "Engr. Razaq Shuaib", slug: "razaq-shuaib" },
      { name: "Engr. Collins Okaru", slug: "collins-okaru" },
      { name: "Engr. (Dr.) Henry Osabohien", slug: "henry-osabohien" },
      { name: "Dr. Tamuonemi Efebeli", slug: "tamuonemi-efebeli" },
      { name: "Engr. Abduganiyu Teslim", slug: "abduganiyu-teslim" },
      { name: "Engr. Ikedi Uche", slug: "ikedi-uche" },
      { name: "Engr. Albert Okechukwu Echibe", slug: "albert-okechukwu-echibe" },
      { name: "Engr. Franklin Okafor", slug: "franklin-okafor" },
      { name: "Engr. Olusola Aina", slug: "olusola-aina" },
      { name: "Engr. Jeremiah Amodu Peter", slug: "jeremiah-amodu-peter" },
      { name: "Engr. Edgar Njeje", slug: "edgar-njeje" },
      { name: "Dr. Chukwu Emeke", slug: "chukwu-emeke" },
      { name: "Engr. Oluwasegun Lamidi", slug: "oluwasegun-lamidi" },
      { name: "Allison Gabriel", slug: "allison-gabriel" },
    ],
  },
  {
    title: "Artificial Intelligence Technical Committee",
    section: "artificial-intelligence",
    members: [
      { name: "Dr. (Engr.) Onasoga Olukayode A.", slug: "onasoga-olukayode-a" },
      { name: "Engr. Olugbenga Abimbola Oredeko", slug: "olugbenga-abimbola-oredeko" },
      { name: "Engr. Opubo Edwin Atiegoba", slug: "opubo-edwin-atiegoba" },
      { name: "Oluwatomisin Asere", slug: "oluwatomisin-asere" },
      { name: "Effiong Okwong", slug: "effiong-okwong" },
      { name: "Engr. Taiwo Lawal", slug: "taiwo-lawal" },
    ],
  },
  {
    title: "Automation & Cybersecurity Technical Committee",
    section: "automation-cybersecurity",
    members: [
      { name: "Prof. Joseph S. Ojo", slug: "joseph-s-ojo" },
      { name: "Dr. Umar Sa'ad", slug: "umar-saad" },
      { name: "Ahmed Barrak", slug: "ahmed-barrak" },
      { name: "Engr. Desmond Inyamah", slug: "desmond-inyamah" },
      { name: "Emmanuel Omoke", slug: "emmanuel-omoke" },
      { name: "Olabode Agboola", slug: "olabode-agboola" },
      { name: "Cynthia Kevin-Nwahiri", slug: "cynthia-kevin-nwahiri" },
      { name: "Engr. Marshal Abraham", slug: "marshal-abraham" },
      { name: "Dr. Ademola Agboola", slug: "ademola-agboola" },
      { name: "Tolulope Longe", slug: "tolulope-longe" },
      { name: "Prof. Boniface Kayode Alese", slug: "boniface-kayode-alese" },
      { name: "Mohammed Al Abbadi", slug: "mohammed-al-abbadi" },
      { name: "Belarmino Van Dunem", slug: "belarmino-van-dunem" },
      { name: "Engr. Oladapo Ojo", slug: "oladapo-ojo" },
      { name: "Engr. Emmanuel Eno", slug: "emmanuel-eno" },
      { name: "Engr. Awe Afolabi Thomas", slug: "awe-afolabi-thomas" },
      { name: "Engr. Wasiu Abiola Salami", slug: "wasiu-abiola-salami" },
    ],
  },
];

console.log("=== COMPREHENSIVE PEOPLE ASSET VERIFICATION REPORT ===\n");
let totalTested = 0;
let totalPassed = 0;
let totalFailed = 0;

for (const group of checks) {
  console.log(`--- ${group.title} (${group.members.length} members) ---`);
  const secMap = personImageManifest[group.section] || {};

  for (const m of group.members) {
    totalTested++;
    const resolvedUrl = secMap[m.slug] || secMap[m.name];
    if (!resolvedUrl) {
      console.log(`❌ [FAIL] ${m.name} (${m.slug}): Manifest entry NOT FOUND`);
      totalFailed++;
      continue;
    }

    const { exists, size } = checkFileExists(resolvedUrl);
    if (!exists) {
      console.log(`❌ [FAIL] ${m.name} (${m.slug}): File DOES NOT EXIST on disk at ${resolvedUrl}`);
      totalFailed++;
    } else {
      console.log(`✅ [OK] ${m.name} -> ${resolvedUrl} (${(size / 1024).toFixed(1)} KB)`);
      totalPassed++;
    }
  }
  console.log();
}

// Verify Featured Speakers preserved
const speakersDir = path.join(publicDir, "assets", "aiaiac-2027", "people", "speakers");
console.log(`--- Preserved Featured Speakers (Target Directory: ${speakersDir}) ---`);
if (fs.existsSync(speakersDir)) {
  const speakerFiles = fs.readdirSync(speakersDir).filter((f) => f.endsWith(".webp"));
  console.log(`Found ${speakerFiles.length} preserved featured speaker WebP portraits:`);
  speakerFiles.forEach((f) => {
    const size = fs.statSync(path.join(speakersDir, f)).size;
    console.log(`✅ [SPEAKER] ${f} (${(size / 1024).toFixed(1)} KB)`);
  });
} else {
  console.log(`❌ [FAIL] Speakers directory not found`);
}

console.log("\n==================================================");
console.log(`Total Tested:  ${totalTested}`);
console.log(`Total Passed:  ${totalPassed}`);
console.log(`Total Failed:  ${totalFailed}`);
console.log("==================================================\n");

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log("ALL PEOPLE ASSETS VERIFIED WITH 100% SUCCESS!");
}
