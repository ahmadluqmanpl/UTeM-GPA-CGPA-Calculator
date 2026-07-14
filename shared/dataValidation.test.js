const test = require("node:test");
const assert = require("node:assert/strict");
const { LIMITS, validateCalculatorData } = require("./dataValidation");

const validData = () => ({
  version: 1,
  semesters: [{ name: "Semester 1", subjects: [{ name: "BERG2133", credit: 3, grade: "B" }] }]
});

test("accepts valid calculator data and incomplete empty rows", () => {
  const data = validData();
  data.semesters[0].subjects.push({ name: "", credit: "", grade: "" });
  assert.deepEqual(validateCalculatorData(data).semesters[0].subjects[1], { name: "", credit: "", grade: "" });
});

test("rejects unsupported grades and invalid credits", () => {
  const badGrade = validData(); badGrade.semesters[0].subjects[0].grade = "A+";
  assert.throws(() => validateCalculatorData(badGrade), /approved grade scale/);
  const badCredit = validData(); badCredit.semesters[0].subjects[0].credit = 13;
  assert.throws(() => validateCalculatorData(badCredit), /no greater than/);
});

test("rejects oversized names and malformed structures", () => {
  const longName = validData();
  longName.semesters[0].subjects[0].name = "x".repeat(LIMITS.maxSubjectNameLength + 1);
  assert.throws(() => validateCalculatorData(longName), /too long/);
  assert.throws(() => validateCalculatorData({ semesters: "wrong" }), /semesters list/);
});
