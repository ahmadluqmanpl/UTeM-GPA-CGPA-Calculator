const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("./gpaCore");

test("converts grades to grade points", () => {
  assert.equal(core.gradeToPoint("A"), 4);
  assert.equal(core.gradeToPoint("B+"), 3.3);
  assert.equal(core.gradeToPoint("E"), 0);
  assert.equal(core.gradeToPoint(""), null);
});

test("calculates a subject total grade point", () => {
  assert.deepEqual(core.subjectResult({ credit: 3, grade: "B" }), {
    valid: true, credit: 3, gradePoint: 3, totalGradePoint: 9
  });
});

test("calculates the supplied sample semester GPA", () => {
  const subjects = [
    ["BERG2133", 3, "B"], ["BERN2413", 3, "B"], ["BKKE1461", 1, "A"],
    ["BLHW1762", 2, "A"], ["BLLW1442", 2, "A"], ["BMIG1213", 3, "B"],
    ["BMIG1313", 3, "A"]
  ].map(([name, credit, grade]) => ({ name, credit, grade }));
  const result = core.semesterResult(subjects);
  assert.equal(result.totalCredits, 17);
  assert.equal(result.totalGradePoints, 59);
  assert.ok(Math.abs(result.gpa - 3.47) < 0.01);
});

test("calculates CGPA across semesters", () => {
  const result = core.overallResult([
    { subjects: [{ credit: 3, grade: "A" }] },
    { subjects: [{ credit: 3, grade: "B" }] }
  ]);
  assert.equal(result.totalCredits, 6);
  assert.equal(result.totalGradePoints, 21);
  assert.equal(result.cgpa, 3.5);
});

test("ignores empty and incomplete subjects without invalid numbers", () => {
  const result = core.semesterResult([
    {}, { credit: "", grade: "A" }, { credit: 3, grade: "" },
    { credit: 2, grade: "A-" }
  ]);
  assert.equal(result.totalCredits, 2);
  assert.equal(result.totalGradePoints, 7.4);
  assert.equal(result.gpa, 3.7);
  assert.ok(Number.isFinite(core.semesterResult([]).gpa));
});

test("treats malformed lists and invalid credits as empty", () => {
  assert.deepEqual(core.semesterResult(null), {
    totalCredits: 0, totalGradePoints: 0, gpa: 0
  });
  assert.deepEqual(core.overallResult("not a list"), {
    totalCredits: 0, totalGradePoints: 0, cgpa: 0
  });
  assert.equal(core.subjectResult({ credit: -3, grade: "A" }).valid, false);
  assert.equal(core.subjectResult({ credit: "three", grade: "A" }).valid, false);
  assert.equal(core.subjectResult({ credit: 13, grade: "A" }).valid, false);
});

test("counts grade E as a valid zero-point subject", () => {
  const result = core.semesterResult([{ credit: 3, grade: "E" }]);
  assert.equal(result.totalCredits, 3);
  assert.equal(result.totalGradePoints, 0);
  assert.equal(result.gpa, 0);
});

test("weights CGPA by credits instead of averaging semester GPAs", () => {
  const result = core.overallResult([
    { subjects: [{ credit: 1, grade: "A" }] },
    { subjects: [{ credit: 3, grade: "B" }] }
  ]);
  assert.equal(result.cgpa, 3.25);
});
