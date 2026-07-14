const { copyFile, mkdir } = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const target = path.join(__dirname, "..", "src", "shared");
  await mkdir(target, { recursive: true });
  await copyFile(
    path.join(__dirname, "..", "..", "shared", "gpaCore.js"),
    path.join(target, "gpaCore.js")
  );
  await copyFile(
    path.join(__dirname, "..", "..", "shared", "ui.css"),
    path.join(target, "ui.css")
  );
  await copyFile(
    path.join(__dirname, "..", "..", "shared", "dataValidation.js"),
    path.join(target, "dataValidation.js")
  );
  await copyFile(path.join(__dirname, "..", "..", "shared", "report.js"), path.join(target, "report.js"));
  await copyFile(path.join(__dirname, "..", "..", "shared", "report.css"), path.join(target, "report.css"));
  await copyFile(path.join(__dirname, "..", "..", "shared", "programmeCatalog.js"), path.join(target, "programmeCatalog.js"));
  await copyFile(path.join(__dirname, "..", "..", "shared", "offlineProfiles.js"), path.join(target, "offlineProfiles.js"));
  await copyFile(path.join(__dirname, "..", "..", "shared", "utemPrograms.json"), path.join(target, "utemPrograms.json"));
  console.log("Copied shared GPA logic, validation, offline profiles, programme data, report tools, and interface styles into the Electron app.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
