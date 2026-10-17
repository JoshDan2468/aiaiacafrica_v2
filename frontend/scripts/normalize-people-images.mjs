import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const publicAssetsDir = path.join(projectRoot, "public", "assets", "aiaiac-2027");

// Production targets
const prodPeopleDir = path.join(publicAssetsDir, "people");
const altProdPeopleDir = path.join(projectRoot, "public", "aiaiac-2027", "people");
const personImagesManifestPath = path.join(projectRoot, "src", "generated", "personImages.ts");
const legacyManifestPath = path.join(projectRoot, "src", "generated", "personImageManifest.ts");

/**
 * Normalizer: turns arbitrary name or filename into a clean, hyphenated slug without titles
 */
export function normalizePersonName(name) {
  if (!name) return "";
  let str = name.replace(/\.(webp|jpg|jpeg|png|avif)$/i, "");
  str = str.replace(/[’'`]/g, "'");
  str = str.replace(/-\s*(conference director|director|chair|member).*/gi, " ");
  str = str.replace(/([a-z])([A-Z])/g, "$1 $2");
  const titleRegex =
    /\b(dr|engr|engineer|egnr|prof|professor|mr|mrs|ms|fnse|fnipr|arc|surv|chief|elder|high chief)\b/gi;
  str = str.replace(titleRegex, " ");
  str = str.replace(/[()]/g, " ");
  str = str.replace(/[^a-zA-Z0-9]/g, " ");
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .join("-");
}

/**
 * Generates a clean URL-safe production filename preserving title prefixes if present in source
 * e.g. "Dr James Makinde.png" -> "dr-james-makinde.webp"
 * e.g. "Engr. David Oni.jpg" -> "engr-david-oni.webp"
 */
function toProductionFilename(name) {
  if (!name) return "profile.webp";
  let str = name.replace(/\.(webp|jpg|jpeg|png|avif)$/i, "");
  str = str.replace(/[’'`]/g, "");
  str = str.replace(/-\s*(conference director|director|chair|member).*/gi, "");
  str = str.replace(/([a-z])([A-Z])/g, "$1 $2");
  str = str.replace(/[^a-zA-Z0-9]+/g, "-");
  str = str.toLowerCase().replace(/^-+|-+$/g, "");
  return `${str}.webp`;
}

/** Section folder configuration in the user's source public directory */
const sectionsConfig = {
  keynote: {
    sourceDir: "ket-note-speakers",
    prodSubDir: "keynote",
    maxWidth: 900,
    quality: 84,
    members: [
      {
        name: "Dr. James Makinde",
        slug: "james-makinde",
        sourceCandidates: ["James-Makinde.png", "James-Makinde.webp"],
        prodFilename: "dr-james-makinde.webp",
      },
    ],
  },
  chairman: {
    sourceDir: "technical-chairman",
    prodSubDir: "chairman",
    maxWidth: 800,
    quality: 84,
    members: [
      {
        name: "Dr. (Engr.) Gbenga Ayodele Owolabi",
        slug: "gbenga-ayodele-owolabi",
        sourceCandidates: [
          "Gbenga-Ayodele-Owolabi.webp",
          "WhatsApp_Image_2026-09-06_at_20.57.22__1_-removebg-preview-720.webp",
        ],
        prodFilename: "dr-engr-gbenga-ayodele-owolabi.webp",
      },
    ],
  },
  advisoryBoard: {
    sourceDir: "advisory-board",
    prodSubDir: "advisory-board",
    maxWidth: 480,
    quality: 80,
    members: [
      {
        name: "Dr. Engr. Isaac Adekanye",
        slug: "isaac-adekanye",
        sourceCandidates: [
          "dr-engr-isaac-adekanye.png",
          "isaac-adekanye.jpg",
          "isaac-adekanye.webp",
          "dr-engr-isaac-adekanye.webp",
        ],
        prodFilename: "dr-engr-isaac-adekanye.webp",
      },
      {
        name: "Engr. Olalekan Oyeleye",
        slug: "olalekan-oyeleye",
        sourceCandidates: ["engr-olalekan-oyeleye.webp", "Engr. Olalekan Oyeleye.webp"],
        prodFilename: "engr-olalekan-oyeleye.webp",
      },
      {
        name: "Engr. Sooravan Tharmalingam",
        slug: "sooravan-tharmalingam",
        sourceCandidates: [
          "engr-sooravan-tharmalingam.png",
          "sooravan-tharmalingam.jpg",
          "sooravan-tharmalingam.webp",
          "engr-sooravan-tharmalingam.webp",
        ],
        prodFilename: "engr-sooravan-tharmalingam.webp",
      },
      {
        name: "Engr. Ester Christopher",
        slug: "ester-christopher",
        sourceCandidates: [
          "engr-ester-christopher.png",
          "ester-christopher.jpg",
          "ester-christopher.webp",
          "engr-ester-christopher.webp",
        ],
        prodFilename: "engr-ester-christopher.webp",
      },
      {
        name: "Omar Rugebani",
        slug: "omar-rugebani",
        sourceCandidates: ["omar-rugebani.jpg", "omar-rugebani.png", "omar-rugebani.webp"],
        prodFilename: "omar-rugebani.webp",
      },
      {
        name: "Engr. Nnanna Charles Ukaegbu",
        slug: "nnanna-charles-ukaegbu",
        sourceCandidates: [
          "engr-nnanna-charles-ukaegbu.webp",
          "Engr. Nnanna Charles Ukaegbu.webp",
          "Nnana_photo-removebg-preview-720.webp",
        ],
        prodFilename: "engr-nnanna-charles-ukaegbu.webp",
      },
      {
        name: "Dr. Mrs. Tina Isichei",
        slug: "tina-isichei",
        sourceCandidates: [
          "dr-mrs-tina-isichei.png",
          "tina-isichei.jpg",
          "dr-mrs-tina-isichei.webp",
          "tina-isichei.webp",
          "Dr. Mrs. Tina Isichei.webp",
        ],
        prodFilename: "dr-mrs-tina-isichei.webp",
      },
      {
        name: "Engr. Abel Onyemaechi Nwobodo",
        slug: "abel-onyemaechi-nwobodo",
        sourceCandidates: [
          "engr-abel-onyemaechi-nwobodo.png",
          "engr-abel-onyemaechi-nwobodo.webp",
          "Engr. Abel Onyemaechi Nwobodo.webp",
          "Engr. Abel Onyemaechi Nwobodo.jpg",
        ],
        prodFilename: "engr-abel-onyemaechi-nwobodo.webp",
      },
      {
        name: "Engr. Ayo Giwa",
        slug: "ayo-giwa",
        sourceCandidates: ["engr-ayo-giwa.webp", "Engr. Ayo Giwa.webp", "Engr. Ayo Giwa.png"],
        prodFilename: "engr-ayo-giwa.webp",
      },
      {
        name: "Raj Mohandoss",
        slug: "raj-mohandoss",
        sourceCandidates: ["raj-mohandoss.webp", "Raj Mohandoss.webp", "Raj Mohandoss.png"],
        prodFilename: "raj-mohandoss.webp",
      },
      {
        name: "Kayode Adeleke",
        slug: "kayode-adeleke",
        sourceCandidates: [
          "kayode-adeleke.png",
          "Kayode Adeleke.jpg",
          "Kayode Adeleke.webp",
          "kayode-adeleke.webp",
        ],
        prodFilename: "kayode-adeleke.webp",
      },
      {
        name: "Dr. Kola Fagbayi",
        slug: "kola-fagbayi",
        sourceCandidates: [
          "dr-kola-fagbayi.png",
          "Dr. Kola Fagbayi.jpg",
          "dr-kola-fagbayi.webp",
          "Dr. Kola Fagbayi.webp",
        ],
        prodFilename: "dr-kola-fagbayi.webp",
      },
    ],
  },
  assetIntegrity: {
    sourceDir: "technical-committees/asset-integrity",
    prodSubDir: "technical-committees/asset-integrity",
    maxWidth: 480,
    quality: 80,
    members: [
      {
        name: "Engr. David Oni",
        slug: "david-oni",
        sourceCandidates: ["egnr-David.webp"],
        prodFilename: "engr-david-oni.webp",
      },
      {
        name: "Engr. Ikenna Ikonta",
        slug: "ikenna-ikonta",
        sourceCandidates: ["IkennaIkonta.webp"],
        prodFilename: "engr-ikenna-ikonta.webp",
      },
      {
        name: "Engr. Olalekan Adeaga",
        slug: "olalekan-adeaga",
        sourceCandidates: ["OlalekanAdeaga.webp"],
        prodFilename: "engr-olalekan-adeaga.webp",
      },
      {
        name: "Engr. Olawale Onasoga",
        slug: "olawale-onasoga",
        sourceCandidates: ["OlawaleOnasoga.webp"],
        prodFilename: "engr-olawale-onasoga.webp",
      },
      {
        name: "Engr. Paul Aminadokiruaru",
        slug: "paul-aminadokiruaru",
        sourceCandidates: ["PaulAminadokiruaru.webp", "PaulAminadokiruaru.png"],
        prodFilename: "engr-paul-aminadokiruaru.webp",
      },
      {
        name: "Dr. (Engr.) Mavis Sika Okyere",
        slug: "mavis-sika-okyere",
        sourceCandidates: ["MavisSika.webp"],
        prodFilename: "dr-engr-mavis-sika-okyere.webp",
      },
      {
        name: "Engr. Eric Oguama",
        slug: "eric-oguama",
        sourceCandidates: ["EricOguama.webp"],
        prodFilename: "engr-eric-oguama.webp",
      },
      {
        name: "Engr. Razaq Shuaib",
        slug: "razaq-shuaib",
        sourceCandidates: ["Razaq.webp"],
        prodFilename: "engr-razaq-shuaib.webp",
      },
      {
        name: "Engr. Collins Okaru",
        slug: "collins-okaru",
        sourceCandidates: ["collin.webp"],
        prodFilename: "engr-collins-okaru.webp",
      },
      {
        name: "Engr. (Dr.) Henry Osabohien",
        slug: "henry-osabohien",
        sourceCandidates: ["Engr. (Dr.) Henry Osabohien.webp", "Engr. (Dr.) Henry Osabohien.png"],
        prodFilename: "engr-dr-henry-osabohien.webp",
      },
      {
        name: "Dr. Tamuonemi Efebeli",
        slug: "tamuonemi-efebeli",
        sourceCandidates: ["Tamuonemi.webp"],
        prodFilename: "dr-tamuonemi-efebeli.webp",
      },
      {
        name: "Engr. Abduganiyu Teslim",
        slug: "abduganiyu-teslim",
        sourceCandidates: ["Abduganiyu Teslim.webp", "Abduganiyu Teslim.png"],
        prodFilename: "engr-abduganiyu-teslim.webp",
      },
      {
        name: "Engr. Ikedi Uche",
        slug: "ikedi-uche",
        sourceCandidates: ["Ikedi.webp", "Ikedi.png"],
        prodFilename: "engr-ikedi-uche.webp",
      },
      {
        name: "Engr. Albert Okechukwu Echibe",
        slug: "albert-okechukwu-echibe",
        sourceCandidates: [
          "Engr. Albert Okechukwu Echibe.webp",
          "Engr. Albert Okechukwu Echibe.png",
        ],
        prodFilename: "engr-albert-okechukwu-echibe.webp",
      },
      {
        name: "Engr. Franklin Okafor",
        slug: "franklin-okafor",
        sourceCandidates: ["Franklin.webp"],
        prodFilename: "engr-franklin-okafor.webp",
      },
      {
        name: "Engr. Olusola Aina",
        slug: "olusola-aina",
        sourceCandidates: ["Olusola.webp"],
        prodFilename: "engr-olusola-aina.webp",
      },
      {
        name: "Engr. Jeremiah Amodu Peter",
        slug: "jeremiah-amodu-peter",
        sourceCandidates: ["Jeremiah.webp"],
        prodFilename: "engr-jeremiah-amodu-peter.webp",
      },
      {
        name: "Engr. Edgar Njeje",
        slug: "edgar-njeje",
        sourceCandidates: ["Edgar.webp", "Edgar.png"],
        prodFilename: "engr-edgar-njeje.webp",
      },
      {
        name: "Dr. Chukwu Emeke",
        slug: "chukwu-emeke",
        sourceCandidates: ["Dr. Chukwu Emeke.webp", "Dr. Chukwu Emeke.png"],
        prodFilename: "dr-chukwu-emeke.webp",
      },
      {
        name: "Engr. Oluwasegun Lamidi",
        slug: "oluwasegun-lamidi",
        sourceCandidates: ["Engr. Oluwasegun Lamidi.webp", "Engr. Oluwasegun Lamidi.png"],
        prodFilename: "engr-oluwasegun-lamidi.webp",
      },
      {
        name: "Allison Gabriel",
        slug: "allison-gabriel",
        sourceCandidates: ["Allison.webp"],
        prodFilename: "allison-gabriel.webp",
      },
    ],
  },
  artificialIntelligence: {
    sourceDir: "technical-committees/artificial-intelligence",
    prodSubDir: "technical-committees/artificial-intelligence",
    maxWidth: 480,
    quality: 80,
    members: [
      {
        name: "Engr. Olugbenga Abimbola Oredeko",
        slug: "olugbenga-abimbola-oredeko",
        sourceCandidates: [
          "Engr. Olugbenga Abimbola Oredeko.webp",
          "Engr. Olugbenga Abimbola Oredeko.png",
        ],
        prodFilename: "engr-olugbenga-abimbola-oredeko.webp",
      },
      {
        name: "Engr. Opubo Edwin Atiegoba",
        slug: "opubo-edwin-atiegoba",
        sourceCandidates: ["Opubo Edwin Atiegoba.webp"],
        prodFilename: "engr-opubo-edwin-atiegoba.webp",
      },
      {
        name: "Dr. Engr. Onasoga Olukayode A",
        slug: "onasoga-olukayode-a",
        sourceCandidates: ["Dr.Engr.Onasoga OlukayodeA.webp", "Dr.Engr.Onasoga OlukayodeA.png"],
        prodFilename: "dr-engr-onasoga-olukayode-a.webp",
      },
      {
        name: "Engr. Taiwo Lawal",
        slug: "taiwo-lawal",
        sourceCandidates: ["Engr. Taiwo Lawal.webp"],
        prodFilename: "engr-taiwo-lawal.webp",
      },
      {
        name: "Oluwatomisin Asere",
        slug: "oluwatomisin-asere",
        sourceCandidates: ["Oluwatomisin Asere.webp"],
        prodFilename: "oluwatomisin-asere.webp",
      },
      {
        name: "Effiong Okwong",
        slug: "effiong-okwong",
        sourceCandidates: ["EffiongOkwong.webp", "EffiongOkwong.png"],
        prodFilename: "effiong-okwong.webp",
      },
    ],
  },
  automationCybersecurity: {
    sourceDir: "technical-committees/automation-cybersecurity",
    prodSubDir: "technical-committees/automation-cybersecurity",
    maxWidth: 480,
    quality: 80,
    members: [
      {
        name: "Prof. Joseph S. Ojo",
        slug: "joseph-s-ojo",
        sourceCandidates: ["joseph-s-ojo.webp", "Prof. Joseph S. Ojo.webp"],
        prodFilename: "prof-joseph-s-ojo.webp",
      },
      {
        name: "Dr. Umar Sa’ad",
        slug: "umar-sa-ad",
        sourceCandidates: ["Dr. Umar Sa’ad.webp"],
        prodFilename: "dr-umar-saad.webp",
      },
      {
        name: "Emmanuel Omoke",
        slug: "emmanuel-omoke",
        sourceCandidates: ["Emmanuel Omoke.webp", "emmanuel-omoke.webp"],
        prodFilename: "emmanuel-omoke.webp",
      },
      {
        name: "Ahmed Barrak",
        slug: "ahmed-barrak",
        sourceCandidates: ["Ahmed Barrak.webp"],
        prodFilename: "ahmed-barrak.webp",
      },
      {
        name: "Dr. Ademola Agboola",
        slug: "ademola-agboola",
        sourceCandidates: ["Dr. Ademola Agboola.webp"],
        prodFilename: "dr-ademola-agboola.webp",
      },
      {
        name: "Engr. Desmond Inyamah",
        slug: "desmond-inyamah",
        sourceCandidates: ["Desmond Inyamah.webp"],
        prodFilename: "engr-desmond-inyamah.webp",
      },
      {
        name: "Olabode Agboola",
        slug: "olabode-agboola",
        sourceCandidates: ["Olabode Agboola.webp"],
        prodFilename: "olabode-agboola.webp",
      },
      {
        name: "Engr. Marshal Abraham",
        slug: "marshal-abraham",
        sourceCandidates: ["Engr. Marshal Abraham.webp", "Engr. Marshal Abraham.png"],
        prodFilename: "engr-marshal-abraham.webp",
      },
      {
        name: "Tolulope Longe",
        slug: "tolulope-longe",
        sourceCandidates: ["Tolulope Longe.webp", "Tolulope Longe.png"],
        prodFilename: "tolulope-longe.webp",
      },
      {
        name: "Cynthia Kevin-Nwahiri",
        slug: "cynthia-kevin-nwahiri",
        sourceCandidates: ["cynthia-kevin-nwahiri.webp"],
        prodFilename: "cynthia-kevin-nwahiri.webp",
      },
      {
        name: "Prof. Boniface Kayode Alese",
        slug: "boniface-kayode-alese",
        sourceCandidates: ["Prof. Boniface Kayode Alese.webp"],
        prodFilename: "prof-boniface-kayode-alese.webp",
      },
      {
        name: "Mohammed Al Abbadi",
        slug: "mohammed-al-abbadi",
        sourceCandidates: ["Mohammed Al Abbadi.webp", "Mohammed Al Abbadi.png"],
        prodFilename: "mohammed-al-abbadi.webp",
      },
      {
        name: "Belarmino Van Dunem",
        slug: "belarmino-van-dunem",
        sourceCandidates: ["Belarmino Van Dunem.webp"],
        prodFilename: "belarmino-van-dunem.webp",
      },
      {
        name: "Engr. Oladapo Ojo",
        slug: "oladapo-ojo",
        sourceCandidates: ["Engr. Oladapo Ojo.webp", "Engr. Oladapo Ojo.png"],
        prodFilename: "engr-oladapo-ojo.webp",
      },
      {
        name: "Engr. Emmanuel Eno",
        slug: "emmanuel-eno",
        sourceCandidates: ["Engr. Emmanuel Eno.webp", "Engr. Emmanuel Eno.png"],
        prodFilename: "engr-emmanuel-eno.webp",
      },
      {
        name: "Engr. Awe Afolabi Thomas",
        slug: "awe-afolabi-thomas",
        sourceCandidates: ["Engr. Awe Afolabi Thomas.webp", "Engr. Awe Afolabi Thomas.png"],
        prodFilename: "engr-awe-afolabi-thomas.webp",
      },
      {
        name: "Engr. Wasiu Abiola Salami",
        slug: "wasiu-abiola-salami",
        sourceCandidates: ["Engr. Wasiu Abiola Salami.webp", "Engr. Wasiu Abiola Salami.png"],
        prodFilename: "engr-wasiu-abiola-salami.webp",
      },
    ],
  },
  organisingCommittee: {
    sourceDir: "organising-committee",
    prodSubDir: "organising-committee",
    maxWidth: 480,
    quality: 80,
    members: [
      {
        name: "Bunmi Daramola",
        slug: "bunmi-daramola",
        sourceCandidates: ["Bunmi Daramola.webp", "Bunmi Daramola.png"],
        prodFilename: "bunmi-daramola.webp",
      },
      {
        name: "Omowunmi Oladele",
        slug: "omowunmi-oladele",
        sourceCandidates: [
          "Omowunmi Oladele- Conference Director.webp",
          "Omowunmi Oladele- Conference Director.png",
        ],
        prodFilename: "omowunmi-oladele.webp",
      },
      {
        name: "Brumilda Haslund",
        slug: "brumilda-haslund",
        sourceCandidates: ["Brumilda Haslund.webp", "Brumilda Haslund.png"],
        prodFilename: "brumilda-haslund.webp",
      },
      {
        name: "Joseph Fatoye",
        slug: "joseph-fatoye",
        sourceCandidates: ["Joseph Fatoye.webp", "Joseph Fatoye.png"],
        prodFilename: "joseph-fatoye.webp",
      },
      {
        name: "Nonye Nketa",
        slug: "nonye-nketa",
        sourceCandidates: ["Nonye Nketa.webp", "Nonye Nketa.png"],
        prodFilename: "nonye-nketa.webp",
      },
      {
        name: "Ezeji Stephanie",
        slug: "ezeji-stephanie",
        sourceCandidates: ["Ezeji Stephanie.webp", "Ezeji Stephanie.png"],
        prodFilename: "ezeji-stephanie.webp",
      },
      {
        name: "Victory Adabhie",
        slug: "victory-adabhie",
        sourceCandidates: ["Victory Adabhie.webp", "Victory Adabhie.png"],
        prodFilename: "victory-adabhie.webp",
      },
      {
        name: "Wilbert Adri",
        slug: "wilbert-adri",
        sourceCandidates: ["Wilbert Adri.webp", "Wilbert Adri.png"],
        prodFilename: "wilbert-adri.webp",
      },
      {
        name: "Emmanuel Samson",
        slug: "emmanuel-samson",
        sourceCandidates: ["Emmanuel Samson.webp", "Emmanuel Samson.png"],
        prodFilename: "emmanuel-samson.webp",
      },
      {
        name: "Adedoyin Yusuf",
        slug: "adedoyin-yusuf",
        sourceCandidates: ["Adedoyin Yusuf.webp", "Adedoyin Yusuf.png"],
        prodFilename: "adedoyin-yusuf.webp",
      },
      {
        name: "Maria Henshaw",
        slug: "maria-henshaw",
        sourceCandidates: ["Maria Henshaw.webp", "Maria Henshaw.png"],
        prodFilename: "maria-henshaw.webp",
      },
      {
        name: "Quadri Basit Omoniyi",
        slug: "quadri-basit-omaniyi",
        sourceCandidates: [
          "quadri-basit-omoniyi.png",
          "quadri-basit-omoniyi.webp",
          "Quadri Basit Omoniyi.webp",
          "Quadri Basit Omoniyi.png",
        ],
        prodFilename: "quadri-basit-omoniyi.webp",
      },
    ],
  },
};

async function runPipeline() {
  console.log("=== AIAIAC AFRICA: STANDARDISED PEOPLE ASSET PIPELINE ===\n");

  const personImages = {
    keynote: {},
    chairman: {},
    advisoryBoard: {},
    technicalCommittees: {
      assetIntegrity: {},
      artificialIntelligence: {},
      automationCybersecurity: {},
    },
    organisingCommittee: {},
  };

  const legacyManifest = {};
  const report = {
    totalSourceFiles: 0,
    totalWebPGenerated: 0,
    sourceSizesBytes: [],
    webpSizesBytes: [],
    largeFiles: [],
    matched: 0,
    missing: 0,
    details: [],
  };

  for (const [secKey, sec] of Object.entries(sectionsConfig)) {
    const srcDirPath = path.join(publicAssetsDir, sec.sourceDir);
    const prodDestDir = path.join(prodPeopleDir, sec.prodSubDir);
    const altProdDestDir = path.join(altProdPeopleDir, sec.prodSubDir);

    fs.mkdirSync(prodDestDir, { recursive: true });
    fs.mkdirSync(altProdDestDir, { recursive: true });

    // Section key for legacy manifest mapping
    const legacyKey =
      secKey === "assetIntegrity"
        ? "asset-integrity"
        : secKey === "artificialIntelligence"
          ? "artificial-intelligence"
          : secKey === "automationCybersecurity"
            ? "automation-cybersecurity"
            : secKey === "advisoryBoard"
              ? "advisory-board"
              : secKey === "organisingCommittee"
                ? "organising-committee"
                : secKey === "keynote"
                  ? "keynote-speakers"
                  : secKey === "chairman"
                    ? "technical-chairman"
                    : secKey;

    if (!legacyManifest[legacyKey]) legacyManifest[legacyKey] = {};

    for (const member of sec.members) {
      let matchedSourceFile = null;
      let matchedSourcePath = null;

      // Find best available source file
      // Check priority 1: user-supplied clean sources in altProdDestDir (public/aiaiac-2027/people/...)
      // Check priority 2: raw source directory in srcDirPath (public/assets/aiaiac-2027/...)
      for (const cand of member.sourceCandidates) {
        const altCand = path.join(altProdDestDir, cand);
        if (fs.existsSync(altCand)) {
          matchedSourceFile = cand;
          matchedSourcePath = altCand;
          break;
        }
        const fullCand = path.join(srcDirPath, cand);
        if (fs.existsSync(fullCand)) {
          matchedSourceFile = cand;
          matchedSourcePath = fullCand;
          break;
        }
      }

      if (matchedSourcePath) {
        report.matched++;
        const srcStat = fs.statSync(matchedSourcePath);
        report.sourceSizesBytes.push(srcStat.size);
        report.totalSourceFiles++;

        const destFile = member.prodFilename;
        const destPath = path.join(prodDestDir, destFile);
        const altDestPath = path.join(altProdDestDir, destFile);

        // Convert / optimize via Sharp using file buffer
        const fileBuffer = fs.readFileSync(matchedSourcePath);
        const outputBuffer = await sharp(fileBuffer)
          .rotate()
          .resize({
            width: sec.maxWidth,
            withoutEnlargement: true,
            fit: "inside",
          })
          .webp({ quality: sec.quality })
          .toBuffer();

        fs.writeFileSync(destPath, outputBuffer);
        fs.writeFileSync(altDestPath, outputBuffer);

        const webpStat = fs.statSync(destPath);
        report.webpSizesBytes.push(webpStat.size);
        report.totalWebPGenerated++;

        const webpSizeKb = (webpStat.size / 1024).toFixed(1);
        if (webpStat.size > 200 * 1024) {
          report.largeFiles.push(`${secKey}/${destFile} (${webpSizeKb} KB)`);
        }

        const publicUrl = `/assets/aiaiac-2027/people/${sec.prodSubDir}/${destFile}`;

        // Populate structured manifest
        if (secKey === "keynote") {
          personImages.keynote[member.slug] = publicUrl;
        } else if (secKey === "chairman") {
          personImages.chairman[member.slug] = publicUrl;
        } else if (secKey === "advisoryBoard") {
          personImages.advisoryBoard[member.slug] = publicUrl;
        } else if (secKey === "organisingCommittee") {
          personImages.organisingCommittee[member.slug] = publicUrl;
        } else if (secKey === "assetIntegrity") {
          personImages.technicalCommittees.assetIntegrity[member.slug] = publicUrl;
        } else if (secKey === "artificialIntelligence") {
          personImages.technicalCommittees.artificialIntelligence[member.slug] = publicUrl;
        } else if (secKey === "automationCybersecurity") {
          personImages.technicalCommittees.automationCybersecurity[member.slug] = publicUrl;
        }

        // Populate legacy manifest
        legacyManifest[legacyKey][member.slug] = publicUrl;
        legacyManifest[legacyKey][member.name] = publicUrl;

        // Custom aliases for normalized names and IDs used in data files
        if (member.name === "Quadri Basit Omoniyi") {
          legacyManifest[legacyKey]["quadri-basit-omoniyi"] = publicUrl;
          legacyManifest[legacyKey]["quadri-basit-omaniyi"] = publicUrl;
          personImages.organisingCommittee["quadri-basit-omoniyi"] = publicUrl;
          personImages.organisingCommittee["quadri-basit-omaniyi"] = publicUrl;
        }
        if (member.name === "Engr. Abel Onyemaechi Nwobodo") {
          legacyManifest[legacyKey]["abel-nwobodo"] = publicUrl;
          personImages.advisoryBoard["abel-nwobodo"] = publicUrl;
        }
        if (member.name === "Engr. Nnanna Charles Ukaegbu") {
          legacyManifest[legacyKey]["nnanna-ukaegbu"] = publicUrl;
          personImages.advisoryBoard["nnanna-ukaegbu"] = publicUrl;
        }
        if (member.slug === "umar-sa-ad" || member.name.includes("Umar")) {
          legacyManifest[legacyKey]["umar-saad"] = publicUrl;
          legacyManifest[legacyKey]["umar-sa-ad"] = publicUrl;
          personImages.technicalCommittees.automationCybersecurity["umar-saad"] = publicUrl;
        }

        report.details.push({
          name: member.name,
          slug: member.slug,
          source: matchedSourceFile,
          prodFile: destFile,
          url: publicUrl,
          srcSize: (srcStat.size / 1024).toFixed(1) + " KB",
          webpSize: webpSizeKb + " KB",
          status: "MATCHED",
        });
      } else {
        report.missing++;
        report.details.push({
          name: member.name,
          slug: member.slug,
          status: "MISSING",
        });
      }
    }
  }

  // Cross-reference speakers for featured speakers
  const speakersList = [
    {
      name: "Dr. James Makinde",
      slug: "dr-james-makinde",
      sourceSec: "keynote",
      sourceSlug: "james-makinde",
    },
    {
      name: "Dr. Kola Fagbayi",
      slug: "kola-fagbayi",
      sourceSec: "advisoryBoard",
      sourceSlug: "kola-fagbayi",
    },
    { name: "David Oni", slug: "david-oni", sourceSec: "assetIntegrity", sourceSlug: "david-oni" },
    {
      name: "Razaq Shuaib",
      slug: "razaq-shuaib",
      sourceSec: "assetIntegrity",
      sourceSlug: "razaq-shuaib",
    },
    {
      name: "Emmanuel Omoke",
      slug: "emmanuel-omoke",
      sourceSec: "automationCybersecurity",
      sourceSlug: "emmanuel-omoke",
    },
    {
      name: "Umar Sa'ad",
      slug: "umar-saad",
      sourceSec: "automationCybersecurity",
      sourceSlug: "umar-sa-ad",
    },
    {
      name: "Wasiu Salami",
      slug: "wasiu-salami",
      sourceSec: "automationCybersecurity",
      sourceSlug: "wasiu-abiola-salami",
    },
  ];

  legacyManifest["speakers"] = {};
  for (const s of speakersList) {
    let matchedUrl = null;
    if (s.sourceSec === "keynote") matchedUrl = personImages.keynote[s.sourceSlug];
    else if (s.sourceSec === "advisoryBoard") matchedUrl = personImages.advisoryBoard[s.sourceSlug];
    else if (s.sourceSec === "assetIntegrity")
      matchedUrl = personImages.technicalCommittees.assetIntegrity[s.sourceSlug];
    else if (s.sourceSec === "automationCybersecurity")
      matchedUrl = personImages.technicalCommittees.automationCybersecurity[s.sourceSlug];

    if (matchedUrl) {
      legacyManifest["speakers"][s.slug] = matchedUrl;
      legacyManifest["speakers"][s.name] = matchedUrl;
    }
  }

  // Write src/generated/personImages.ts
  const manifestContent = `/**
 * AIAIAC Africa 2027 — Standardised Person Images Manifest
 * Generated automatically from physical filesystem discovery.
 * DO NOT EDIT DIRECTLY.
 */

export const personImages = ${JSON.stringify(personImages, null, 2)} as const;
`;
  fs.writeFileSync(personImagesManifestPath, manifestContent, "utf8");
  console.log(`Generated: ${personImagesManifestPath}`);

  // Write src/generated/personImageManifest.ts (for full backward/resolver compatibility)
  const legacyContent = `/**
 * AIAIAC Person Image Manifest (Production Normalized)
 * Generated automatically by scripts/normalize-people-images.mjs
 * DO NOT EDIT DIRECTLY.
 */

export const personImageManifest: Record<string, Record<string, string>> = ${JSON.stringify(
    legacyManifest,
    null,
    2,
  )} as const;
`;
  fs.writeFileSync(legacyManifestPath, legacyContent, "utf8");
  console.log(`Generated: ${legacyManifestPath}`);

  // Calculate statistics
  const avgSrcSize =
    report.sourceSizesBytes.reduce((a, b) => a + b, 0) /
    (report.sourceSizesBytes.length || 1) /
    1024;
  const avgWebpSize =
    report.webpSizesBytes.reduce((a, b) => a + b, 0) / (report.webpSizesBytes.length || 1) / 1024;

  console.log("\n==================================================");
  console.log("       PEOPLE ASSET PIPELINE AUDIT REPORT");
  console.log("==================================================");
  console.log(`Total Source Files Discovered: ${report.totalSourceFiles}`);
  console.log(`Total WebP Generated:          ${report.totalWebPGenerated}`);
  console.log(`Average Source Size:           ${avgSrcSize.toFixed(1)} KB`);
  console.log(`Average WebP Size:             ${avgWebpSize.toFixed(1)} KB`);
  console.log(`Total Matched:                 ${report.matched}`);
  console.log(`Total Missing:                 ${report.missing}`);
  console.log(
    `Files > 200 KB:                ${report.largeFiles.length === 0 ? "None (all under 200 KB)" : report.largeFiles.join(", ")}`,
  );
  console.log("Keynote Production File:       ", personImages.keynote["james-makinde"]);
  console.log("Chairman Production File:      ", personImages.chairman["gbenga-ayodele-owolabi"]);
  console.log("==================================================\n");

  return report;
}

runPipeline().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
