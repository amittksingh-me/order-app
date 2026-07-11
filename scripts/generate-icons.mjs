import { execSync } from "node:child_process";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();
const src = join(root, "src", "assets", "icon.svg");
const outDir = join(root, "public");

const sizes = [
  { width: 192, file: "pwa-192x192.png" },
  { width: 512, file: "pwa-512x512.png" },
];

for (const { width, file } of sizes) {
  const out = join(outDir, file);
  execSync(`sips -s format png "${src}" --out "${out}" --resampleWidth ${width}`, {
    stdio: "inherit",
  });
  console.log(`Generated ${file} (${width}x${width})`);
}
