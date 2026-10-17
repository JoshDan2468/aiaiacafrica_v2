import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const targetDir = path.join(projectRoot, "public", "assets", "aiaiac-2027", "people", "speakers");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const speakersToRecover = [
  {
    id: "dr-kola-fagbayi",
    name: "Dr. Kola Fagbayi",
    framerFile: "ho9N2YWUKoJMquo8LVOnOzBkY.png",
  },
  {
    id: "engr-audu-ibrahim",
    name: "Engr. Audu Ibrahim, FNSE",
    framerFile: "rAo8sr8YVJ94yYs6lb5Cmlj8gdA.png",
  },
  {
    id: "rapheal-oluyomi",
    name: "Rapheal Oluyomi",
    framerFile: "doyPbAfxrKe1nbkeU1TwfaQjbY.png",
  },
  {
    id: "zephaniah-ajibade",
    name: "Zephaniah Ajibade",
    framerFile: "nAU0behoGXldW1QzFehLFb8I3JQ.png",
  },
  {
    id: "david-oni",
    name: "David Oni",
    framerFile: "yqQQJrwzvsXSuLYMqaOfPNds83o.png",
  },
  {
    id: "chinenye-michelle-orajaka",
    name: "Chinenye Michelle Orajaka",
    framerFile: "a9g0hTqp2j0VcXQsl9HDHmCpXA.png",
  },
  {
    id: "olakunle-john-ajayi",
    name: "Olakunle John Ajayi",
    framerFile: "fjeCHvSnRhLfZG9pawNH63dtQAw.png",
  },
  {
    id: "ayodeji-gabriel-ashidi",
    name: "Ayodeji Gabriel Ashidi",
    framerFile: "kn26j4QXITOxjixNyefzjTkSoKc.png",
  },
  {
    id: "razaq-shuaib",
    name: "Razaq Shuaib",
    framerFile: "1ZfP9L4p4QOTonUf9yFOAX9OfDU.png",
  },
  {
    id: "albert-ogosi",
    name: "Albert Ogosi",
    framerFile: "NNSAzWyk5OBZeqraPXYRLHzpeHY.png",
  },
  {
    id: "nelson-nnadozie-emeghara",
    name: "Nelson Nnadozie Emeghara",
    framerFile: "GHzvnvWbqmvt2DDBjAcBStE0PA.png",
  },
  {
    id: "engr-timothy-oluwadero",
    name: "Engr. Timothy Oluwadero",
    framerFile: "HgFjNnEdE9mUmodQ0M4wMh7Hol4.png",
  },
  {
    id: "omar-el-sheikh",
    name: "Omar El Sheikh",
    framerFile: "kwFZZZgA8ZXbAQ2shiTG0LFyCY.png",
  },
  {
    id: "ajiri-ivovi",
    name: "Ajiri Ivovi",
    framerFile: "GGgYnJC5BSRPLhns22i0a5ve50.png",
  },
  {
    id: "comfort-moses",
    name: "Comfort Moses",
    framerFile: "afyXxSlpXt3y4tR8gdAMoRo1G4E.png",
  },
  {
    id: "hossam-aboegla",
    name: "Hossam Aboegla",
    framerFile: "8gCotW6gexamhUF3ebeWNwUaTE.png",
  },
  {
    id: "wasiu-salami",
    name: "Wasiu Salami",
    framerFile: "8jsRm4LXd83aouf6DQT9qwZvDY.png",
  },
  {
    id: "dr-gabriel-farotade",
    name: "Dr. Gabriel Farotade",
    framerFile: "iojhqggDamKYJQcDC3knRMkZ4I.png",
  },
  {
    id: "dev-menon",
    name: "Dev Menon",
    framerFile: "chY3kSWYKCvy6ojO5BqfyPsgNnM.png",
  },
  {
    id: "djallel-lameche",
    name: "Djallel Lameche",
    framerFile: "f7ts6AvxPCij9MqBu5gtQdlBrg.png",
  },
  {
    id: "dr-okikiade-adewale-layioye",
    name: "Dr. Okikiade Adewale Layioye",
    framerFile: "zftjI90AkeeydvEn8FlGWHlrIwA.png",
  },
  {
    id: "medinatu-musa",
    name: "Medinatu Musa",
    framerFile: "7sJxoFeGVFkWU0tBQSQCVrgOQI.png",
  },
  {
    id: "emmanuel-omoke",
    name: "Emmanuel Omoke",
    framerFile: "heUUiXtzhwq7y81LkDXcfsXK78.png",
  },
  {
    id: "dr-umar-saad",
    name: "Umar Sa'ad",
    framerFile: "e5Cnwbvrju0YExFY8jqnza3Ysu4.png",
  },
  {
    id: "osemwinyen-ekhorutomwen",
    name: "Osemwinyen Ekhorutomwen",
    framerFile: "TkcFcNuBLXJtKKNZuCzSXajrqM.png",
  },
];

async function run() {
  console.log(`Starting recovery of ${speakersToRecover.length} former conference speakers...`);

  for (const item of speakersToRecover) {
    const url = `https://framerusercontent.com/images/${item.framerFile}`;
    const destPath = path.join(targetDir, `${item.id}.webp`);

    console.log(`Fetching ${item.name} (${item.id})...`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Convert to WebP, resize max 480px width, quality 82
      await sharp(buffer)
        .resize({ width: 480, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(destPath);

      const stat = fs.statSync(destPath);
      console.log(`✓ Saved ${item.id}.webp (${Math.round(stat.size / 1024)} KB)`);
    } catch (err) {
      console.error(`✗ Error recovering ${item.name}:`, err.message);
    }
  }

  console.log("\nAll speaker images processed.");
}

run();
