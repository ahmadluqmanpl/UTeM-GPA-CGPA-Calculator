const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("./gpaCore");
const validation = require("./dataValidation");
const { createReportModel } = require("./report");

test("builds a validated, credit-weighted report model", () => {
  const model = createReportModel({
    core, validation,
    data: { semesters: [
      { name: "Semester 1", subjects: [{ name: "Subject A", credit: 3, grade: "B" }] },
      { name: "Semester 2", subjects: [{ name: "Subject B", credit: 1, grade: "A" }, { name: "", credit: "", grade: "" }] }
    ] },
    studentInfo: {
      studentName: "  Student Example  ", studyLevel: "Degree", programmeCode: "BERG",
      programmeName: "Bachelor of Electronic Engineering with Honours",
      faculty: "Fakulti Teknologi Dan Kejuruteraan Elektronik Dan Komputer", mode: "Full-time"
    },
    generatedAt: new Date("2026-07-12T00:00:00Z")
  });
  assert.equal(model.overall.cgpa, 3.25);
  assert.equal(model.overall.totalCredits, 4);
  assert.equal(model.semesters[1].subjects.length, 1);
  assert.equal(model.studentInfo.studentName, "Student Example");
  assert.equal(model.studentInfo.studyLevel, "Degree");
  assert.equal(model.studentInfo.programmeCode, "BERG");
  assert.equal(model.studentInfo.programmeName, "Bachelor of Electronic Engineering with Honours");
  assert.equal(model.studentInfo.faculty, "Fakulti Teknologi Dan Kejuruteraan Elektronik Dan Komputer");
  assert.equal(model.studentInfo.mode, "Full-time");
});

test("refuses to create an empty report", () => {
  assert.throws(() => createReportModel({
    core, validation,
    data: { semesters: [{ name: "Semester 1", subjects: [{ name: "", credit: "", grade: "" }] }] }
  }), /Add at least one subject/);
});
