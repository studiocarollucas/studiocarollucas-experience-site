import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "public/images/site/home");
const selections = [
  ["15-anos/IMG_7315.JPG.jpeg", "quinze-guitarra", 90],
  ["aniversario-adulto/IMG_0225.JPG.jpeg", "aniversario-dourado"],
  ["15-anos/IMG_4456.JPG.jpeg", "quinze-azul"],
  ["aniversario-adulto/IMG_2004.JPG.jpeg", "aniversario-rosa"],
  ["gestante/IMG_7170.JPG.jpeg", "gestante-vermelho"],
  ["newborn/IMG_5604.JPG.jpeg", "newborn-neutro"],
];

await mkdir(output, { recursive: true });
let originalBytes = 0;
let optimizedBytes = 0;
for (const [source, name, rotation = 0] of selections) {
  const input = path.join(root, "public/images", source);
  const result = await sharp(input)
    .autoOrient()
    .rotate(rotation)
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 6 })
    .toFile(path.join(output, `${name}.webp`));
  originalBytes += (await stat(input)).size;
  optimizedBytes += result.size;
  console.log(`${name}: ${result.width}×${result.height}, ${Math.round(result.size / 1024)} KB`);
}
console.log(
  `Total: ${originalBytes} → ${optimizedBytes} bytes (${Math.round((1 - optimizedBytes / originalBytes) * 100)}% menor)`
);
