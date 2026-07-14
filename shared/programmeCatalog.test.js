const test = require("node:test");
const assert = require("node:assert/strict");
const catalogue = require("./utemPrograms.json");
const {
  programmeName,
  programmeLabel,
  programmeKey,
  programmeFaculties,
  filterProgrammes
} = require("./programmeCatalog");

test("shares complete sorted programme choices across both applications", () => {
  assert.deepEqual(Object.fromEntries(["Diploma", "Degree", "Master", "PhD"].map(level => [
    level, filterProgrammes(catalogue, level).length
  ])), { Diploma: 6, Degree: 50, Master: 41, PhD: 12 });
  assert.equal(new Set(catalogue.map(programmeKey)).size, catalogue.length);
  assert.ok(programmeFaculties(catalogue, "Degree").length > 1);
});

test("uses the BI programme name and safely falls back to BM", () => {
  const berg = catalogue.find(programme => programme.programCode === "BERG" && programme.programNameBI);
  const dec = catalogue.find(programme => programme.programCode === "DEC");
  assert.equal(programmeLabel(berg), "BERG - Bachelor of Electronic Engineering with Honours");
  assert.equal(programmeName(dec), dec.programNameBM);
  assert.equal(programmeLabel(dec), `DEC - ${dec.programNameBM}`);
});
