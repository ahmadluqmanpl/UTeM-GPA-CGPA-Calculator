/**
 * Shared validation for saved and imported calculator data.
 * It accepts incomplete UI rows, but rejects malformed types, unsupported
 * grades, excessive lengths, unrealistic credits, and oversized data sets.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CalculatorValidation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const APPROVED_GRADES = Object.freeze([
    "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "E"
  ]);
  const LIMITS = Object.freeze({
    maxCreditHours: 12,
    maxSubjectNameLength: 100,
    maxSemesterNameLength: 60,
    maxSemesters: 30,
    maxSubjectsPerSemester: 50,
    maxImportBytes: 1_000_000
  });

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function validateText(value, field, maximum) {
    if (typeof value !== "string") throw new Error(`${field} must be text.`);
    if (value.length > maximum) throw new Error(`${field} is too long (maximum ${maximum} characters).`);
    return value;
  }

  function validateCredit(value) {
    if (value === "" || value === null || value === undefined) return "";
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0 || number > LIMITS.maxCreditHours) {
      throw new Error(`Credit hour must be a positive number no greater than ${LIMITS.maxCreditHours}.`);
    }
    return number;
  }

  function validateGrade(value) {
    if (value === "" || value === null || value === undefined) return "";
    if (typeof value !== "string" || !APPROVED_GRADES.includes(value)) {
      throw new Error("Grade is not in the approved grade scale.");
    }
    return value;
  }

  function validateSubject(value) {
    if (!isPlainObject(value)) throw new Error("Every subject must be an object.");
    return {
      name: validateText(value.name ?? "", "Subject code or name", LIMITS.maxSubjectNameLength),
      credit: validateCredit(value.credit),
      grade: validateGrade(value.grade)
    };
  }

  function validateSemester(value, index) {
    if (!isPlainObject(value)) throw new Error("Every semester must be an object.");
    if (!Array.isArray(value.subjects)) throw new Error("Every semester must contain a subjects list.");
    if (value.subjects.length > LIMITS.maxSubjectsPerSemester) {
      throw new Error(`A semester cannot contain more than ${LIMITS.maxSubjectsPerSemester} subjects.`);
    }
    return {
      name: validateText(value.name ?? `Semester ${index + 1}`, "Semester name", LIMITS.maxSemesterNameLength),
      subjects: value.subjects.map(validateSubject)
    };
  }

  function validateCalculatorData(data) {
    if (!isPlainObject(data) || !Array.isArray(data.semesters)) {
      throw new Error("Calculator data must contain a semesters list.");
    }
    if (data.semesters.length < 1 || data.semesters.length > LIMITS.maxSemesters) {
      throw new Error(`Calculator data must contain 1 to ${LIMITS.maxSemesters} semesters.`);
    }
    return { version: 1, semesters: data.semesters.map(validateSemester) };
  }

  function isValidCredit(value) {
    try { validateCredit(value); return value !== "" && value !== null && value !== undefined; }
    catch { return false; }
  }

  return { APPROVED_GRADES, LIMITS, isValidCredit, validateCalculatorData };
});
