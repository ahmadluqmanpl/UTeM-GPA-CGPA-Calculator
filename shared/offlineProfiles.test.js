const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateOfflineData,
  validateImportedData,
  validateProgrammeList,
  programmeLabel,
  programmeKey,
  programmeFaculties,
  filterProgrammes
} = require("./offlineProfiles");
const programmes = require("./utemPrograms.json");

function profile(id, studentName, grade) {
  return {
    id,
    studentName,
    matricNumber: `M-${id}`,
    studyLevel: "Degree",
    programme: "BERG - Bachelor of Electronic Engineering with Honours",
    programmeCode: "BERG",
    programmeFaculty: "Engineering",
    advisorName: "",
    semesters: [{ name: "Semester 1", subjects: [{ name: "Subject", credit: 3, grade }] }]
  };
}

test("validates separate GPA data for multiple profiles and remembers the active profile", () => {
  const checked = validateOfflineData({
    version: 2,
    activeProfileId: "second",
    profiles: [profile("first", "First Student", "A"), profile("second", "Second Student", "B")]
  });
  assert.equal(checked.activeProfileId, "second");
  assert.equal(checked.profiles[0].semesters[0].subjects[0].grade, "A");
  assert.equal(checked.profiles[1].semesters[0].subjects[0].grade, "B");
});

test("rejects missing profile fields, duplicate IDs, and an unknown active profile", () => {
  const missingName = profile("first", "", "A");
  assert.throws(() => validateOfflineData({ activeProfileId: "first", profiles: [missingName] }), /Student name is required/);
  assert.throws(() => validateOfflineData({ activeProfileId: "first", profiles: [profile("first", "One", "A"), profile("first", "Two", "B")] }), /unique/);
  assert.throws(() => validateOfflineData({ activeProfileId: "missing", profiles: [profile("first", "One", "A")] }), /does not exist/);
});

test("accepts legacy calculator backups without treating imported content as code", () => {
  const imported = validateImportedData({
    version: 1,
    semesters: [{ name: "<script>alert(1)</script>", subjects: [{ name: "<img onerror=alert(1)>", credit: 2, grade: "B+" }] }]
  });
  assert.equal(imported.kind, "legacy-calculator");
  assert.equal(imported.data.semesters[0].subjects[0].name, "<img onerror=alert(1)>");
});

test("validates the complete bundled local programme catalogue", () => {
  const checked = validateProgrammeList(programmes);
  const counts = Object.fromEntries(["Diploma", "Degree", "Master", "PhD"].map(level => [
    level, checked.filter(programme => programme.level === level).length
  ]));
  assert.deepEqual(counts, { Diploma: 6, Degree: 50, Master: 41, PhD: 12 });
  assert.ok(checked.every(programme => programme.lastVerified === "2026-07-13"));
  assert.ok(checked.every(programme => programme.source.startsWith("https://www.utem.edu.my/")));
  assert.equal(checked.some(programme => /sample|placeholder|replace with verified/i.test(JSON.stringify(programme))), false);
});

test("searches every level by official codes and names", () => {
  const checked = validateProgrammeList(programmes);
  const expectCode = (level, query, code) => {
    assert.ok(filterProgrammes(checked, level, query).some(programme => programme.programCode === code), `${query} did not find ${code}`);
  };
  expectCode("Diploma", "DER", "DER");
  expectCode("Diploma", "Electronics Engineering", "DER");
  for (const code of ["BERG", "BERR", "BITM"]) expectCode("Degree", code, code);
  expectCode("Degree", "Fakulti Teknologi Maklumat", "BITM");
  for (const code of ["MENA", "MEKA", "MITA"]) expectCode("Master", code, code);
  expectCode("Master", "Master of Science", "MENA");
  for (const code of ["PENA", "EENA", "PEKA"]) expectCode("PhD", code, code);
  expectCode("PhD", "Doctor of Philosophy", "PENA");
  expectCode("Degree", "MQA/FA3448", "BERG");
  expectCode("Degree", "Electronic Engineering", "BERG");
  expectCode("Degree", "Degree", "BERG");
  assert.ok(filterProgrammes(checked, "Degree", "Part-time").every(programme => programme.mode === "Part-time"));
  assert.deepEqual(filterProgrammes(checked, "Other"), []);
});

test("shows every programme immediately, sorted, with optional faculty filtering", () => {
  const checked = validateProgrammeList(programmes);
  const expectedCounts = { Diploma: 6, Degree: 50, Master: 41, PhD: 12 };
  for (const [level, expectedCount] of Object.entries(expectedCounts)) {
    const visible = filterProgrammes(checked, level);
    assert.equal(visible.length, expectedCount, `${level} should expose its complete catalogue`);
    const independentlySorted = [...visible].sort((left, right) => {
      for (const field of ["level", "faculty", "programCode", "mode", "programNameBM"]) {
        const comparison = String(left[field] ?? "").localeCompare(String(right[field] ?? ""), "en", {
          sensitivity: "base",
          numeric: true
        });
        if (comparison) return comparison;
      }
      return programmeKey(left).localeCompare(programmeKey(right), "en", { sensitivity: "base", numeric: true });
    });
    assert.deepEqual(visible.map(programmeKey), independentlySorted.map(programmeKey));
  }

  const degreeFaculties = programmeFaculties(checked, "Degree");
  assert.ok(degreeFaculties.length > 1);
  const selectedFaculty = degreeFaculties[0];
  const facultyMatches = filterProgrammes(checked, "Degree", "", selectedFaculty);
  assert.ok(facultyMatches.length > 0 && facultyMatches.length < expectedCounts.Degree);
  assert.ok(facultyMatches.every(programme => programme.faculty === selectedFaculty));
});

test("uses unique option keys and safely searches blank optional fields", () => {
  const checked = validateProgrammeList(programmes);
  const keys = checked.map(programmeKey);
  assert.equal(new Set(keys).size, checked.length);
  assert.doesNotThrow(() => filterProgrammes([
    {
      level: "Degree", faculty: "", programCode: "SAFE", programNameBM: "Program Selamat",
      programNameBI: "", accreditationCode: "", mode: "Full-time"
    }
  ], "Degree", "safe"));
});

test("uses the BM name when an official BI name is missing", () => {
  const checked = validateProgrammeList(programmes);
  const diploma = checked.find(programme => programme.programCode === "DEC");
  assert.equal(diploma.programNameBI, "");
  assert.equal(programmeLabel(diploma), "DEC - Diploma E-Commerce");
});
