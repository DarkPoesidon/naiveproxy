const fs = require("node:fs");
const path = require("node:path");

const required = [
  "src/main.cjs",
  "src/preload.cjs",
  "src/renderer/index.html",
  "src/renderer/styles.css",
  "src/renderer/renderer.js",
  "src/renderer/qa-mock.js"
];
for (const file of required) {
  if (!fs.existsSync(path.join(__dirname, "..", file))) throw new Error(`Missing ${file}`);
}
const html = fs.readFileSync(path.join(__dirname, "..", "src/renderer/index.html"), "utf8");
for (const id of ["connectButton", "importModal", "diagnosticList", "domainInput", "passwordInput"]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Missing required UI element: ${id}`);
}
console.log("Naive Breeze desktop source checks passed.");
