/**
 * Shared GPA calculation rules used by both versions of the application.
 * The small UMD wrapper makes this file usable by Node.js and by a browser.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GpaCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GRADE_SCALE = Object.freeze({
    A: 4.0, "A-": 3.7, "B+": 3.3, B: 3.0, "B-": 2.7,
    "C+": 2.3, C: 2.0, "C-": 1.7, "D+": 1.3, D: 1.0, E: 0.0
  });
  const MAX_CREDIT_HOURS = 12;

  function gradeToPoint(grade) {
    return Object.prototype.hasOwnProperty.call(GRADE_SCALE, grade)
      ? GRADE_SCALE[grade]
      : null;
  }

  function normaliseCredit(value) {
    const credit = Number(value);
    return Number.isFinite(credit) && credit > 0 && credit <= MAX_CREDIT_HOURS ? credit : 0;
  }

  // A subject counts only when it has a positive credit value and a valid grade.
  function subjectResult(subject = {}) {
    const credit = normaliseCredit(subject.credit);
    const gradePoint = gradeToPoint(subject.grade);
    const valid = credit > 0 && gradePoint !== null;
    return {
      valid,
      credit: valid ? credit : 0,
      gradePoint: valid ? gradePoint : null,
      totalGradePoint: valid ? credit * gradePoint : 0
    };
  }

  function semesterResult(subjects = []) {
    // Imported JSON may contain an unexpected value. Treat it like an empty list.
    const safeSubjects = Array.isArray(subjects) ? subjects : [];
    const totals = safeSubjects.reduce(
      (sum, subject) => {
        const result = subjectResult(subject);
        return {
          credits: sum.credits + result.credit,
          gradePoints: sum.gradePoints + result.totalGradePoint
        };
      },
      { credits: 0, gradePoints: 0 }
    );

    return {
      totalCredits: totals.credits,
      totalGradePoints: totals.gradePoints,
      gpa: totals.credits > 0 ? totals.gradePoints / totals.credits : 0
    };
  }

  function overallResult(semesters = []) {
    const safeSemesters = Array.isArray(semesters) ? semesters : [];
    const totals = safeSemesters.reduce(
      (sum, semester) => {
        const result = semesterResult(semester && semester.subjects);
        return {
          credits: sum.credits + result.totalCredits,
          gradePoints: sum.gradePoints + result.totalGradePoints
        };
      },
      { credits: 0, gradePoints: 0 }
    );

    return {
      totalCredits: totals.credits,
      totalGradePoints: totals.gradePoints,
      cgpa: totals.credits > 0 ? totals.gradePoints / totals.credits : 0
    };
  }

  return { GRADE_SCALE, MAX_CREDIT_HOURS, gradeToPoint, subjectResult, semesterResult, overallResult };
});
