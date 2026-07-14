import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const here = path.dirname(fileURLToPath(import.meta.url));
await mkdir(path.join(here, "..", "public"), { recursive: true });
await copyFile(path.join(here, "..", "..", "shared", "gpaCore.js"), path.join(here, "..", "public", "gpaCore.js"));
await copyFile(path.join(here, "..", "..", "shared", "ui.css"), path.join(here, "..", "public", "ui.css"));
await copyFile(path.join(here, "..", "..", "shared", "dataValidation.js"), path.join(here, "..", "public", "dataValidation.js"));
await copyFile(path.join(here, "..", "..", "shared", "identityText.js"), path.join(here, "..", "public", "identityText.js"));
await copyFile(path.join(here, "..", "..", "shared", "programmeCatalog.js"), path.join(here, "..", "public", "programmeCatalog.js"));
const programmeSource = path.join(here, "..", "..", "shared", "utemPrograms.json");
const programmes = JSON.parse(await readFile(programmeSource, "utf8"));
// A local script asset works with connect-src 'none'. It is generated from the
// one shared JSON source and never contains student-entered information.
await writeFile(
  path.join(here, "..", "public", "utemPrograms.js"),
  `window.UTeMProgrammes = Object.freeze(${JSON.stringify(programmes)});\n`,
  "utf8"
);
await copyFile(path.join(here, "..", "..", "shared", "report.js"), path.join(here, "..", "public", "report.js"));
await copyFile(path.join(here, "..", "..", "shared", "report.css"), path.join(here, "..", "public", "report.css"));
console.log("Copied shared GPA logic, validation, identity normalization, programme catalogue, report tools, and interface styles into the Worker assets.");
