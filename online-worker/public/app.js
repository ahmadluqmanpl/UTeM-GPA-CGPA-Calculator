// State exists only in this page's memory. There are deliberately no storage,
// cookie, account, or data-upload calls in the online application.
const core = window.GpaCore;
const validation = window.CalculatorValidation;
const programmeTools = window.UTeMProgrammeCatalog;
const reportBuilder = window.ReportBuilder;
const identityText = window.IdentityText;
const grades = [...validation.APPROVED_GRADES];
const limits = validation.LIMITS;
const programmes = Array.isArray(window.UTeMProgrammes) ? window.UTeMProgrammes : [];
const MANUAL_PROGRAMME = "__manual_programme__";
let state = { semesters: [newSemester(1)] };
let selectedReportProgramme = null;

function setupLogoFallback() {
  const logo = document.querySelector(".brand-logo");
  const hideBrokenLogo = () => {
    logo.hidden = true;
    logo.setAttribute("aria-hidden", "true");
  };
  logo.addEventListener("error", hideBrokenLogo, { once: true });
  if (logo.complete && logo.naturalWidth === 0) hideBrokenLogo();
}

function newSubject() {
  return { id: crypto.randomUUID(), name: "", credit: "", grade: "" };
}

function newSemester(number) {
  return { id: crypto.randomUUID(), name: `Semester ${number}`, subjects: [newSubject()] };
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function format(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2) : "0.00";
}

function status(message) {
  const output = document.querySelector("#status");
  output.textContent = message;
  setTimeout(() => { if (output.textContent === message) output.textContent = ""; }, 4000);
}

function clearOnlineProgrammeSelection() {
  selectedReportProgramme = null;
  document.querySelector("#onlineManualProgrammeGroup").hidden = true;
  document.querySelector("#onlineManualProgramme").value = "";
  document.querySelector("#onlineProgrammeSummary").textContent = "";
}

function populateOnlineFaculties(level) {
  const faculty = document.querySelector("#onlineFaculty");
  faculty.replaceChildren(
    new Option("All faculties", ""),
    ...programmeTools.programmeFaculties(programmes, level).map(name => new Option(name, name))
  );
  faculty.value = "";
  faculty.disabled = faculty.options.length === 1;
}

function populateOnlineProgrammes(level, faculty = "") {
  const select = document.querySelector("#onlineProgramme");
  const matches = programmeTools.filterProgrammes(programmes, level, "", faculty);
  select.replaceChildren(new Option("Select programme", ""));

  let group = null;
  let previousGroup = "";
  for (const programme of matches) {
    const groupName = `${programme.faculty || "Faculty not specified"} — ${programme.mode || "Mode not specified"}`;
    if (groupName !== previousGroup) {
      group = document.createElement("optgroup");
      group.label = groupName;
      select.append(group);
      previousGroup = groupName;
    }
    group.append(new Option(programmeTools.programmeLabel(programme), programmeTools.programmeKey(programme)));
  }

  select.append(new Option("My programme is not listed", MANUAL_PROGRAMME));
  select.value = "";
  select.disabled = !level;
}

function resetOnlineProgrammeForLevel() {
  const level = document.querySelector("#onlineStudyLevel").value;
  clearOnlineProgrammeSelection();
  populateOnlineFaculties(level);
  populateOnlineProgrammes(level);
}

function updateOnlineProgrammeSelection() {
  const value = document.querySelector("#onlineProgramme").value;
  clearOnlineProgrammeSelection();
  if (value === MANUAL_PROGRAMME) {
    document.querySelector("#onlineManualProgrammeGroup").hidden = false;
    document.querySelector("#onlineManualProgramme").focus();
    return;
  }

  selectedReportProgramme = programmes.find(programme => programmeTools.programmeKey(programme) === value) || null;
  if (selectedReportProgramme) {
    document.querySelector("#onlineProgrammeSummary").textContent = [
      selectedReportProgramme.faculty || "Faculty not specified",
      selectedReportProgramme.mode || "Mode not specified"
    ].join(" • ");
  }
}

function setupOnlineProgrammeSelector() {
  document.querySelector("#onlineStudyLevel").addEventListener("change", resetOnlineProgrammeForLevel);
  document.querySelector("#onlineFaculty").addEventListener("change", event => {
    clearOnlineProgrammeSelection();
    populateOnlineProgrammes(document.querySelector("#onlineStudyLevel").value, event.target.value);
  });
  document.querySelector("#onlineProgramme").addEventListener("change", updateOnlineProgrammeSelection);
}

function studentInfo() {
  const information = {};
  for (const input of document.querySelectorAll("[data-student-field]")) {
    const normalized = identityText.normalizeIdentityText(input.value).slice(0, 100);
    input.value = normalized;
    information[input.dataset.studentField] = normalized;
  }
  information.studyLevel = document.querySelector("#onlineStudyLevel").value;
  if (selectedReportProgramme) {
    information.programmeCode = selectedReportProgramme.programCode;
    information.programmeName = programmeTools.programmeName(selectedReportProgramme);
    information.faculty = selectedReportProgramme.faculty;
    information.mode = selectedReportProgramme.mode;
  } else if (document.querySelector("#onlineProgramme").value === MANUAL_PROGRAMME) {
    information.programmeName = document.querySelector("#onlineManualProgramme").value.slice(0, 160);
  }
  return information;
}

function prepareReport() {
  try {
    const model = reportBuilder.createReportModel({
      core, validation, data: state, studentInfo: studentInfo(), generatedAt: new Date()
    });
    const report = reportBuilder.buildReportElement({
      document, model, logoSrc: "./assets/utem-logo.png"
    });
    document.querySelector("#reportContent").replaceChildren(report);
    const panel = document.querySelector("#reportPanel");
    panel.hidden = false;
    panel.scrollTop = 0;
    document.querySelector("[data-report-feedback]").textContent = "";
    return true;
  } catch (error) {
    document.querySelector("[data-report-feedback]").textContent = error.message;
    status(error.message);
    return false;
  }
}

function createTextInput(field, label, value, maximum) {
  const input = document.createElement("input");
  input.dataset.field = field;
  input.setAttribute("aria-label", label);
  input.maxLength = maximum;
  input.value = value;
  return input;
}

function createCreditInput(subject) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0.5";
  input.max = String(limits.maxCreditHours);
  input.step = "0.5";
  input.placeholder = "3";
  input.dataset.field = "credit";
  input.setAttribute("aria-label", "Credit hour");
  input.value = subject.credit;
  const valid = subject.credit === "" || validation.isValidCredit(subject.credit);
  input.setCustomValidity(valid ? "" : `Credit hour must be between 0.5 and ${limits.maxCreditHours}.`);
  input.setAttribute("aria-invalid", String(!valid));
  return input;
}

function createGradeSelect(subject) {
  const select = document.createElement("select");
  select.dataset.field = "grade";
  select.setAttribute("aria-label", "Grade");
  select.append(new Option("Select", ""));
  for (const grade of grades) select.append(new Option(grade, grade));
  select.value = grades.includes(subject.grade) ? subject.grade : "";
  return select;
}

function labelledCell(label, child, className = "") {
  const cell = element("td", className);
  cell.dataset.label = label;
  if (child instanceof Node) cell.append(child);
  else cell.textContent = child;
  return cell;
}

function createSubjectRow(subject) {
  const result = core.subjectResult(subject);
  const row = document.createElement("tr");
  row.dataset.subject = subject.id;
  const nameInput = createTextInput("name", "Subject code or name", subject.name, limits.maxSubjectNameLength);
  nameInput.placeholder = "e.g. BERG2133";
  row.append(
    labelledCell("Subject", nameInput),
    labelledCell("Credit hour", createCreditInput(subject), "number"),
    labelledCell("Grade", createGradeSelect(subject)),
    labelledCell("Grade point", result.gradePoint === null ? "—" : format(result.gradePoint), "calculated"),
    labelledCell("Total point", result.valid ? format(result.totalGradePoint) : "—", "calculated total-cell")
  );
  const removeCell = element("td", "remove-cell");
  const remove = element("button", "remove", "×");
  remove.dataset.action = "remove-subject";
  remove.setAttribute("aria-label", "Remove subject");
  removeCell.append(remove);
  row.append(removeCell);
  return row;
}

function createSubjectsTable(subjects) {
  const table = element("table", "subjects");
  const head = document.createElement("thead");
  const headingRow = document.createElement("tr");
  for (const label of ["Subject code / name", "Credit hour", "Grade", "Grade point", "Total point", ""]) {
    headingRow.append(element("th", label ? "" : "remove-cell", label));
  }
  head.append(headingRow);
  const body = document.createElement("tbody");
  body.append(...subjects.map(createSubjectRow));
  table.append(head, body);
  return table;
}

// index is the semester's position in the semesters array; the title
// is read-only and derived strictly from it so names can never duplicate.
function createSemesterCard(semester, index) {
  const result = core.semesterResult(semester.subjects);
  const card = element("article", "semester");
  card.dataset.semester = semester.id;
  const header = element("header", "semester-header");
  // Read-only positional title instead of an editable input.
  const title = element("h3", "semester-title", `Semester ${index + 1}`);
  const gpa = element("div", "semester-gpa");
  gpa.append(element("span", "", "Semester GPA"), element("strong", "", format(result.gpa)));
  const remove = element("button", "remove", "Remove");
  remove.dataset.action = "remove-semester";
  remove.setAttribute("aria-label", `Remove Semester ${index + 1}`);
  header.append(title, gpa, remove);

  const summary = element("div", "semester-summary");
  const credits = element("span", "", "Credits ");
  credits.append(element("strong", "", String(result.totalCredits)));
  const points = element("span", "", "Grade points ");
  points.append(element("strong", "", format(result.totalGradePoints)));
  summary.append(credits, points);

  const actions = element("div", "semester-actions");
  const addSubject = element("button", "", "+ Add subject");
  addSubject.dataset.action = "add-subject";
  actions.append(addSubject);
  card.append(header, createSubjectsTable(semester.subjects), summary, actions);
  return card;
}

function render() {
  document.querySelector("#semesters").replaceChildren(...state.semesters.map(createSemesterCard));
  const overall = core.overallResult(state.semesters);
  document.querySelector("#cgpa").textContent = format(overall.cgpa);
  document.querySelector("#totalCredits").textContent = String(overall.totalCredits);
  document.querySelector("#totalPoints").textContent = format(overall.totalGradePoints);
  document.querySelector("#semesterCount").textContent = String(state.semesters.length);
}

function findSemester(target) {
  const id = target.closest("[data-semester]")?.dataset.semester;
  return state.semesters.find(semester => semester.id === id);
}

function renderKeepingFocus(target) {
  const semesterId = target.closest("[data-semester]").dataset.semester;
  const subjectId = target.closest("[data-subject]")?.dataset.subject;
  const field = target.dataset.field;
  render();
  const semester = [...document.querySelectorAll("[data-semester]")]
    .find(item => item.dataset.semester === semesterId);
  const scope = subjectId
    ? [...semester.querySelectorAll("[data-subject]")].find(item => item.dataset.subject === subjectId)
    : semester;
  scope?.querySelector(`[data-field="${field}"]`)?.focus();
}

document.addEventListener("input", event => {
  if (event.target.matches("[data-identity-field]")) {
    identityText.uppercaseIdentityInput(event.target);
    return;
  }
  const field = event.target.dataset.field;
  if (!field) return;
  const semester = findSemester(event.target);
  if (!semester) return;
  const subjectId = event.target.closest("[data-subject]").dataset.subject;
  const subject = semester.subjects.find(item => item.id === subjectId);
  if (field === "name") {
    subject.name = event.target.value.slice(0, limits.maxSubjectNameLength);
    return;
  }
  subject[field] = event.target.value;
  renderKeepingFocus(event.target);
});

document.addEventListener("click", event => {
  const action = event.target.dataset.action;
  if (!action) return;
  if (action === "close-report") {
    document.querySelector("#reportPanel").hidden = true;
    return;
  }
  if (action === "preview-report") {
    prepareReport();
    return;
  }
  if (action === "print-report") {
    if (prepareReport()) window.print();
    return;
  }

  const semester = findSemester(event.target);
  if (action === "add-subject") {
    if (semester.subjects.length >= limits.maxSubjectsPerSemester) return status("Subject limit reached.");
    semester.subjects.push(newSubject());
  }
  if (action === "remove-subject") {
    const subjectId = event.target.closest("[data-subject]").dataset.subject;
    semester.subjects = semester.subjects.filter(subject => subject.id !== subjectId);
    if (!semester.subjects.length) semester.subjects.push(newSubject());
  }
  if (action === "remove-semester") {
    if (state.semesters.length === 1) return status("Keep at least one semester.");
    const semesterIndex = state.semesters.findIndex(item => item.id === semester.id);
    // Deleting a middle/early semester renumbers every semester after it.
    if (semesterIndex < state.semesters.length - 1) {
      const message = `Remove Semester ${semesterIndex + 1}? The semesters after it will be renumbered.`;
      if (!confirm(message)) return;
    }
    state.semesters = state.semesters.filter(item => item.id !== semester.id);
  }
  render();
});

document.querySelector("#addSemester").addEventListener("click", () => {
  if (state.semesters.length >= limits.maxSemesters) return status("Semester limit reached.");
  state.semesters.push(newSemester(state.semesters.length + 1));
  render();
});

const gradeScale = document.querySelector("#gradeScale");
gradeScale.replaceChildren(...grades.map(grade => {
  const item = element("div", "grade-item");
  item.append(element("strong", "", grade), element("span", "", format(core.GRADE_SCALE[grade])));
  return item;
}));

setupLogoFallback();
setupOnlineProgrammeSelector();
render();
