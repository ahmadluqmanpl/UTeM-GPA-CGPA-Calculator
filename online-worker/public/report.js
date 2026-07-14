/**
 * Shared local report builder for Electron and the browser version.
 * It produces a validated report model first, then creates DOM nodes without
 * parsing user values as HTML.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ReportBuilder = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const TITLE = "Unofficial UTeM GPA/CGPA Calculator";
  const DISCLAIMER = "This calculator is an unofficial student-made tool and is not affiliated with Universiti Teknikal Malaysia Melaka (UTeM). Please refer to official academic records for final results.";
  const PRIVACY_NOTE = "This report is generated locally on the user’s device. No data is uploaded or stored online.";
  const STUDENT_FIELDS = Object.freeze([
    ["studentName", "Student name", 100],
    ["matricNumber", "Matric number", 100],
    ["studyLevel", "Study level", 20],
    ["programme", "Programme", 160],
    ["programmeCode", "Programme code", 20],
    ["programmeName", "Programme name", 160],
    ["faculty", "Faculty", 160],
    ["mode", "Mode", 20],
    ["advisorName", "Academic advisor name", 100]
  ]);

  function safeText(value, maximum = 100) {
    return typeof value === "string" ? value.trim().slice(0, maximum) : "";
  }

  function createReportModel({ core, validation, data, studentInfo = {}, generatedAt = new Date() }) {
    const checked = validation.validateCalculatorData(data);
    const semesters = checked.semesters.map(semester => {
      const subjects = semester.subjects
        .map(subject => ({ subject, result: core.subjectResult(subject) }))
        .filter(item => item.result.valid)
        .map(({ subject, result }) => ({
          name: safeText(subject.name) || "Unnamed subject",
          credit: result.credit,
          grade: subject.grade,
          gradePoint: result.gradePoint,
          totalGradePoint: result.totalGradePoint
        }));
      const result = core.semesterResult(semester.subjects);
      return { name: safeText(semester.name, 60) || "Semester", subjects, ...result };
    });

    if (!semesters.some(semester => semester.subjects.length > 0)) {
      throw new Error("Add at least one subject with a valid credit hour and grade before creating a report.");
    }

    const information = {};
    for (const [key, , maximum] of STUDENT_FIELDS) information[key] = safeText(studentInfo[key], maximum);
    return {
      title: TITLE,
      disclaimer: DISCLAIMER,
      privacyNote: PRIVACY_NOTE,
      studentInfo: information,
      overall: core.overallResult(checked.semesters),
      semesters,
      generatedAt: generatedAt.toLocaleString()
    };
  }

  function node(document, tag, className, text) {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (text !== undefined) item.textContent = text;
    return item;
  }

  function metric(document, label, value) {
    const item = node(document, "div", "report-metric");
    item.append(node(document, "span", "", label), node(document, "strong", "", value));
    return item;
  }

  function buildReportElement({ document, model, logoSrc }) {
    const report = node(document, "article", "print-report");
    const header = node(document, "header", "report-header");
    if (logoSrc) {
      const logo = node(document, "img", "report-logo");
      logo.src = logoSrc;
      logo.alt = "UTeM logo";
      logo.addEventListener("error", () => { logo.hidden = true; }, { once: true });
      header.append(logo);
    }
    const heading = node(document, "div", "report-heading");
    heading.append(node(document, "p", "report-kicker", "Academic consultation report"), node(document, "h1", "", model.title));
    header.append(heading);
    report.append(header);

    const notices = node(document, "section", "report-notices");
    notices.append(node(document, "p", "", model.disclaimer), node(document, "p", "report-privacy", model.privacyNote));
    report.append(notices);

    const suppliedInfo = STUDENT_FIELDS.filter(([key]) => model.studentInfo[key]);
    if (suppliedInfo.length) {
      const section = node(document, "section", "report-block");
      section.append(node(document, "h2", "", "Student information"));
      const grid = node(document, "dl", "report-info-grid");
      for (const [key, label] of suppliedInfo) {
        const item = node(document, "div", "");
        item.append(node(document, "dt", "", label), node(document, "dd", "", model.studentInfo[key]));
        grid.append(item);
      }
      section.append(grid);
      report.append(section);
    }

    const summary = node(document, "section", "report-block report-summary");
    summary.append(node(document, "h2", "", "Academic summary"));
    const metrics = node(document, "div", "report-metrics");
    metrics.append(
      metric(document, "Overall CGPA", model.overall.cgpa.toFixed(2)),
      metric(document, "Total credit hours", String(model.overall.totalCredits)),
      metric(document, "Total grade points", model.overall.totalGradePoints.toFixed(2)),
      metric(document, "Number of semesters", String(model.semesters.length))
    );
    summary.append(metrics);
    report.append(summary);

    for (const semester of model.semesters) {
      const section = node(document, "section", "report-semester");
      const semesterHeader = node(document, "div", "report-semester-header");
      semesterHeader.append(node(document, "h2", "", semester.name));
      const totals = node(document, "p", "", `GPA ${semester.gpa.toFixed(2)}  •  ${semester.totalCredits} credit hours  •  ${semester.totalGradePoints.toFixed(2)} grade points`);
      semesterHeader.append(totals);
      section.append(semesterHeader);

      if (!semester.subjects.length) {
        section.append(node(document, "p", "report-empty-semester", "No completed subjects in this semester."));
      } else {
        const table = node(document, "table", "report-table");
        const head = node(document, "thead", "");
        const headingRow = node(document, "tr", "");
        for (const label of ["Subject code / name", "Credit", "Grade", "Grade point", "Total point"]) {
          headingRow.append(node(document, "th", "", label));
        }
        head.append(headingRow);
        const body = node(document, "tbody", "");
        for (const subject of semester.subjects) {
          const row = node(document, "tr", "");
          for (const value of [subject.name, subject.credit, subject.grade, subject.gradePoint.toFixed(2), subject.totalGradePoint.toFixed(2)]) {
            row.append(node(document, "td", "", String(value)));
          }
          body.append(row);
        }
        table.append(head, body);
        section.append(table);
      }
      report.append(section);
    }

    const notes = node(document, "section", "report-block report-notes");
    notes.append(node(document, "h2", "", "Notes for Academic Consultation"));
    for (let index = 0; index < 5; index += 1) notes.append(node(document, "div", "report-note-line"));
    report.append(notes);

    const footer = node(document, "footer", "report-footer");
    footer.append(node(document, "span", "", `Generated: ${model.generatedAt}`), node(document, "span", "", "For consultation only — refer to official academic records"));
    report.append(footer);
    return report;
  }

  return { TITLE, DISCLAIMER, PRIVACY_NOTE, STUDENT_FIELDS, createReportModel, buildReportElement };
});
