// PWA アイコン生成: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#1f4d3a"/>
  <g transform="translate(${pad} ${pad}) scale(${(512 - pad * 2) / 512})">
    <g stroke="#c9a56a" stroke-width="30" stroke-linecap="round" fill="none">
      <path d="M86 150 Q256 118 426 150"/>
      <path d="M126 150 V410"/><path d="M386 150 V410"/>
      <path d="M100 212 H412"/>
      <path d="M172 212 V160"/><path d="M340 212 V160"/>
    </g>
    <text x="256" y="350" text-anchor="middle" font-family="serif" font-size="96" font-weight="700" fill="#fbfaf5" letter-spacing="6">MS</text>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });
const jobs = [
  ["public/icons/icon-192.png", 192, 40],
  ["public/icons/icon-512.png", 512, 40],
  ["public/icons/maskable-512.png", 512, 90],
  ["public/icons/apple-touch-icon.png", 180, 40],
  ["src/app/icon.png", 64, 20],
];
for (const [file, size, pad] of jobs) {
  await sharp(Buffer.from(svg(pad))).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}
