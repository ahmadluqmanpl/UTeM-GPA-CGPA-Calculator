const core = window.GpaCore;
const validation = window.CalculatorValidation;
const profileTools = window.OfflineProfiles;
const reportBuilder = window.ReportBuilder;
const identityText = window.IdentityText;
const grades = [...validation.APPROVED_GRADES];
const limits = validation.LIMITS;

let appState = { version: 2, activeProfileId: null, profiles: [] };
let programmes = [];
let selectedProgramme = null;
let editingProfileId = null;
let pendingLegacySemesters = null;
let autoSaveTimer = null;
let persistenceQueue = Promise.resolve();

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

function hydrateSemesters(semesters) {
  return semesters.map((semester, index) => ({
    id: crypto.randomUUID(),
    name: semester.name || `Semester ${index + 1}`,
    subjects: semester.subjects.length
      ? semester.subjects.map(subject => ({ id: crypto.randomUUID(), ...subject }))
      : [newSubject()]
  }));
}

// Main-process validation removes private renderer IDs from semesters and
// subjects. Fresh private IDs are added only for safe DOM reconciliation.
function hydrateOfflineData(data) {
  const checked = profileTools.validateOfflineData(data);
  return {
    version: 2,
    activeProfileId: checked.activeProfileId,
    profiles: checked.profiles.map(profile => ({ ...profile, semesters: hydrateSemesters(profile.semesters) }))
  };
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
  setTimeout(() => { if (output.textContent === message) output.textContent = ""; }, 5000);
}

function activeProfile() {
  return appState.profiles.find(profile => profile.id === appState.activeProfileId) || null;
}

function activeCalculatorData() {
  const profile = activeProfile();
  return { version: 1, semesters: profile ? profile.semesters : [newSemester(1)] };
}

function cancelScheduledAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = null;
}

// Profile deletion and a fast subsequent profile save can overlap. Keeping
// local-file IPC in order prevents an older clear/save from winning the race.
function queuePersistence(operation) {
  const pending = persistenceQueue.then(operation, operation);
  persistenceQueue = pending.catch(() => {});
  return pending;
}

async function saveNow(successMessage = "") {
  cancelScheduledAutoSave();
  if (!appState.profiles.length) return { ok: true };
  const snapshot = structuredClone(appState);
  const result = await queuePersistence(() => window.calculator.save(snapshot));
  if (!result.ok) status(`Save failed: ${result.error}`);
  else if (successMessage) status(successMessage);
  return result;
}

function setProfileFormBusy(busy) {
  const form = document.querySelector("#profileForm");
  form.setAttribute("aria-busy", String(busy));
  for (const control of form.querySelectorAll("input, select, button")) control.disabled = busy;
}

function closeTransientPanels() {
  document.querySelector("#profileSwitchPanel").hidden = true;
  document.querySelector("#reportPanel").hidden = true;
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    saveNow().catch(error => status(`Auto-save failed: ${error.message}`));
  }, 400);
}

function profileStudentInfo() {
  const profile = activeProfile();
  return profile ? {
    studentName: profile.studentName,
    matricNumber: profile.matricNumber,
    studyLevel: profile.studyLevel,
    programme: profile.programme,
    advisorName: profile.advisorName
  } : {};
}

function prepareReport() {
  try {
    const model = reportBuilder.createReportModel({
      core,
      validation,
      data: activeCalculatorData(),
      studentInfo: profileStudentInfo(),
      generatedAt: new Date()
    });
    const report = reportBuilder.buildReportElement({ document, model, logoSrc: "./assets/utem-logo.png" });
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

// index is the semester's position in the active profile's array; the title
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
  const remove = element("button", "remove no-print", "Remove");
  remove.dataset.action = "remove-semester";
  remove.setAttribute("aria-label", `Remove Semester ${index + 1}`);
  header.append(title, gpa, remove);
  const summary = element("div", "semester-summary");
  const credits = element("span", "", "Credits ");
  credits.append(element("strong", "", String(result.totalCredits)));
  const points = element("span", "", "Grade points ");
  points.append(element("strong", "", format(result.totalGradePoints)));
  summary.append(credits, points);
  const actions = element("div", "semester-actions no-print");
  const addSubject = element("button", "", "+ Add subject");
  addSubject.dataset.action = "add-subject";
  actions.append(addSubject);
  card.append(header, createSubjectsTable(semester.subjects), summary, actions);
  return card;
}

function renderCalculator() {
  const profile = activeProfile();
  if (!profile) return;
  document.querySelector("#semesters").replaceChildren(...profile.semesters.map(createSemesterCard));
  const overall = core.overallResult(profile.semesters);
  document.querySelector("#cgpa").textContent = format(overall.cgpa);
  document.querySelector("#totalCredits").textContent = String(overall.totalCredits);
  document.querySelector("#totalPoints").textContent = format(overall.totalGradePoints);
  document.querySelector("#semesterCount").textContent = String(profile.semesters.length);
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "ST";
}

function renderProfileCard() {
  const profile = activeProfile();
  if (!profile) return;
  document.querySelector("#profileInitials").textContent = initials(profile.studentName);
  document.querySelector("#profileCardName").textContent = profile.studentName;
  document.querySelector("#profileCardMatric").textContent = profile.matricNumber;
  document.querySelector("#profileCardLevel").textContent = profile.studyLevel;
  document.querySelector("#profileCardProgramme").textContent = profile.programme;
  document.querySelector("#profileCardAdvisor").textContent = profile.advisorName;
  document.querySelector("#profileAdvisorItem").hidden = !profile.advisorName;
  const switcher = document.querySelector("#profileSwitcher");
  switcher.replaceChildren(...appState.profiles.map(item => new Option(`${item.studentName} — ${item.matricNumber}`, item.id)));
  switcher.value = profile.id;
}

function renderApp() {
  const hasProfile = Boolean(activeProfile());
  document.querySelector("#profileSetup").hidden = hasProfile;
  document.querySelector("#profileCard").hidden = !hasProfile;
  document.querySelector("#calculatorApp").hidden = !hasProfile;
  if (hasProfile) {
    renderProfileCard();
    renderCalculator();
  }
}

function findSemester(target) {
  const profile = activeProfile();
  const id = target.closest("[data-semester]")?.dataset.semester;
  return profile?.semesters.find(semester => semester.id === id);
}

function renderKeepingFocus(target) {
  const semesterId = target.closest("[data-semester]").dataset.semester;
  const subjectId = target.closest("[data-subject]")?.dataset.subject;
  const field = target.dataset.field;
  renderCalculator();
  const semester = [...document.querySelectorAll("[data-semester]")].find(item => item.dataset.semester === semesterId);
  const scope = subjectId
    ? [...semester.querySelectorAll("[data-subject]")].find(item => item.dataset.subject === subjectId)
    : semester;
  scope?.querySelector(`[data-field="${field}"]`)?.focus();
}

function programmeLabel(programme) {
  return profileTools.programmeLabel(programme);
}

function programmeDetails(programme) {
  return [
    programme.faculty || "Faculty not specified",
    programme.mode || "Mode not specified",
    programme.accreditationCode || "Accreditation code not listed"
  ].join(" • ");
}

function populateProgrammeFaculties(level, preferredFaculty = "") {
  const faculty = document.querySelector("#programmeFaculty");
  faculty.replaceChildren(
    new Option("All faculties", ""),
    ...profileTools.programmeFaculties(programmes, level).map(name => new Option(name, name))
  );
  faculty.value = [...faculty.options].some(option => option.value === preferredFaculty) ? preferredFaculty : "";
}

function resetProgrammePicker(level, preferredFaculty = "") {
  selectedProgramme = null;
  document.querySelector("#programmeSearch").value = "";
  document.querySelector("#selectedProgramme").hidden = true;
  populateProgrammeFaculties(level, preferredFaculty);
  const results = document.querySelector("#programmeResults");
  results.replaceChildren();
  results.scrollTop = 0;
}

function selectProgramme(programme) {
  selectedProgramme = programme;
  const summary = document.querySelector("#selectedProgramme");
  summary.replaceChildren(
    element("strong", "", programmeLabel(programme)),
    element("span", "", programmeDetails(programme))
  );
  summary.hidden = false;
  document.querySelector("#programmeSearch").value = programmeLabel(programme);
  document.querySelector("#programmeResults").hidden = true;
  document.querySelector("#programmeSearch").setAttribute("aria-expanded", "false");
}

function renderProgrammeResults(query = document.querySelector("#programmeSearch").value) {
  const level = document.querySelector("#profileStudyLevel").value;
  const faculty = document.querySelector("#programmeFaculty").value;
  const matches = profileTools.filterProgrammes(programmes, level, query, faculty);
  const results = document.querySelector("#programmeResults");
  results.replaceChildren();
  for (const programme of matches) {
    const button = element("button", "programme-option");
    button.type = "button";
    button.dataset.action = "choose-programme";
    button.dataset.programmeKey = profileTools.programmeKey(programme);
    button.dataset.programmeFaculty = programme.faculty;
    button.setAttribute("role", "option");
    button.append(
      element("strong", "", programmeLabel(programme)),
      element("span", "programme-option-faculty", programme.faculty || "Faculty not specified"),
      element("span", "programme-option-meta", [
        programme.mode || "Mode not specified",
        programme.accreditationCode || "Accreditation code not listed"
      ].join(" • "))
    );
    results.append(button);
  }
  if (!matches.length) results.append(element("p", "programme-empty", "No matching programme found. Use manual entry."));
  results.hidden = false;
  // Chromium preserves the old offset while a list is hidden, so reset only
  // after revealing the newly rendered level/faculty results.
  results.scrollTop = 0;
  document.querySelector("#programmeSearch").setAttribute("aria-expanded", "true");
}

function showManualProgramme(value = "") {
  selectedProgramme = null;
  document.querySelector("#programmeSearchGroup").hidden = true;
  document.querySelector("#programmeManualGroup").hidden = false;
  document.querySelector("#programmeManual").value = value;
  document.querySelector("#programmeManual").focus();
}

function showProgrammeSearch(preferredFaculty = "", shouldFocus = true) {
  const level = document.querySelector("#profileStudyLevel").value;
  resetProgrammePicker(level, preferredFaculty);
  document.querySelector("#programmeManualGroup").hidden = true;
  document.querySelector("#programmeSearchGroup").hidden = false;
  renderProgrammeResults();
  if (shouldFocus) document.querySelector("#programmeSearch").focus();
}

function configureProgrammeEntry(preferredValue = "") {
  const level = document.querySelector("#profileStudyLevel").value;
  const supportsCatalogue = ["Diploma", "Degree", "Master", "PhD"].includes(level);
  if (supportsCatalogue && !preferredValue) showProgrammeSearch();
  else {
    resetProgrammePicker(level);
    showManualProgramme(preferredValue);
  }
}

function showProfileEditor(profile = null) {
  setProfileFormBusy(false);
  editingProfileId = profile?.id || null;
  selectedProgramme = null;
  document.querySelector("#profileCard").hidden = true;
  document.querySelector("#calculatorApp").hidden = true;
  document.querySelector("#profileSwitchPanel").hidden = true;
  document.querySelector("#profileSetup").hidden = false;
  document.querySelector("#profileSetupTitle").textContent = profile ? "Edit your local profile" : "Create your local profile";
  document.querySelector("#profileStudentName").value = profile?.studentName || "";
  document.querySelector("#profileMatricNumber").value = profile?.matricNumber || "";
  document.querySelector("#profileStudyLevel").value = profile?.studyLevel || "";
  document.querySelector("#profileAdvisorName").value = profile?.advisorName || "";
  document.querySelector("#profileFeedback").textContent = "";
  document.querySelector("#cancelProfile").hidden = !appState.profiles.length;
  if (profile) {
    const match = programmes.find(item =>
      item.level === profile.studyLevel &&
      item.programCode === profile.programmeCode &&
      item.faculty === profile.programmeFaculty &&
      programmeLabel(item) === profile.programme
    );
    if (match) {
      showProgrammeSearch(profile.programmeFaculty, false);
      selectProgramme(match);
    } else configureProgrammeEntry(profile.programme);
  } else {
    document.querySelector("#programmeSearchGroup").hidden = true;
    document.querySelector("#programmeManualGroup").hidden = true;
  }
  document.querySelector("#profileStudentName").focus();
}

document.querySelector("#profileForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (event.currentTarget.getAttribute("aria-busy") === "true") return;
  setProfileFormBusy(true);
  try {
    const studentNameInput = document.querySelector("#profileStudentName");
    const matricNumberInput = document.querySelector("#profileMatricNumber");
    const advisorNameInput = document.querySelector("#profileAdvisorName");
    const studentName = identityText.normalizeIdentityText(studentNameInput.value);
    const matricNumber = identityText.normalizeIdentityText(matricNumberInput.value);
    const advisorName = identityText.normalizeIdentityText(advisorNameInput.value);
    studentNameInput.value = studentName;
    matricNumberInput.value = matricNumber;
    advisorNameInput.value = advisorName;

    const studyLevel = document.querySelector("#profileStudyLevel").value;
    const manualProgramme = document.querySelector("#programmeManual").value;
    const programme = selectedProgramme ? programmeLabel(selectedProgramme) : manualProgramme;
    const existing = appState.profiles.find(profile => profile.id === editingProfileId);
    const profile = {
      id: existing?.id || crypto.randomUUID(),
      studentName,
      matricNumber,
      studyLevel,
      programme,
      programmeCode: selectedProgramme?.programCode || "",
      programmeFaculty: selectedProgramme?.faculty || "",
      advisorName,
      semesters: existing?.semesters || (pendingLegacySemesters ? hydrateSemesters(pendingLegacySemesters) : [newSemester(1)])
    };
    const profiles = existing
      ? appState.profiles.map(item => item.id === existing.id ? profile : item)
      : [...appState.profiles, profile];
    const checked = profileTools.validateOfflineData({ version: 2, activeProfileId: profile.id, profiles });
    appState = hydrateOfflineData(checked);
    pendingLegacySemesters = null;
    editingProfileId = null;
    renderApp();
    await saveNow("Profile saved privately on this computer.");
  } catch (error) {
    document.querySelector("#profileFeedback").textContent = error.message;
  } finally {
    setProfileFormBusy(false);
  }
});

document.querySelector("#profileStudyLevel").addEventListener("change", event => {
  configureProgrammeEntry();
  if (!event.target.value) {
    document.querySelector("#programmeSearchGroup").hidden = true;
    document.querySelector("#programmeManualGroup").hidden = true;
  }
});

document.querySelector("#programmeSearch").addEventListener("input", event => {
  selectedProgramme = null;
  document.querySelector("#selectedProgramme").hidden = true;
  renderProgrammeResults(event.target.value);
});

document.querySelector("#programmeFaculty").addEventListener("change", () => {
  selectedProgramme = null;
  document.querySelector("#selectedProgramme").hidden = true;
  renderProgrammeResults();
});

document.querySelector("#cancelProfile").addEventListener("click", () => {
  editingProfileId = null;
  renderApp();
});

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
    scheduleAutoSave();
    return;
  }
  subject[field] = event.target.value;
  renderKeepingFocus(event.target);
  scheduleAutoSave();
});

document.addEventListener("change", event => {
  if (event.target.dataset.field) saveNow().catch(error => status(`Auto-save failed: ${error.message}`));
});

async function deleteActiveProfile(deleteButton) {
  const profile = activeProfile();
  if (!profile || !confirm(`Delete ${profile.studentName} and all GPA data in this profile?`)) return;

  cancelScheduledAutoSave();
  deleteButton.disabled = true;
  document.querySelector("#profileCard").setAttribute("aria-busy", "true");
  try {
    const profiles = appState.profiles.filter(item => item.id !== profile.id);
    appState = {
      ...appState,
      activeProfileId: profiles.length ? profiles[0].id : null,
      profiles
    };
    editingProfileId = null;
    pendingLegacySemesters = null;
    closeTransientPanels();

    if (!profiles.length) {
      // Make the next profile form interactive before waiting for disk I/O.
      showProfileEditor();
      const result = await queuePersistence(() => window.calculator.clear());
      if (!result.ok) status(`Delete could not be saved: ${result.error}`);
    } else {
      renderApp();
      await saveNow("Profile deleted.");
    }
  } finally {
    deleteButton.disabled = false;
    document.querySelector("#profileCard").removeAttribute("aria-busy");
    if (!appState.profiles.length) setProfileFormBusy(false);
  }
}

document.addEventListener("click", async event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  try {
    if (action === "manual-programme") return showManualProgramme();
    if (action === "search-programme") return showProgrammeSearch();
    if (action === "choose-programme") {
      const key = event.target.closest("[data-programme-key]").dataset.programmeKey;
      const programme = programmes.find(item => profileTools.programmeKey(item) === key);
      if (programme) selectProgramme(programme);
      return;
    }
    if (action === "edit-profile") return showProfileEditor(activeProfile());
    if (action === "add-profile") {
      if (appState.profiles.length >= profileTools.PROFILE_LIMITS.maxProfiles) return status("Profile limit reached.");
      return showProfileEditor();
    }
    if (action === "switch-profile") {
      const panel = document.querySelector("#profileSwitchPanel");
      panel.hidden = !panel.hidden;
      return;
    }
    if (action === "activate-profile") {
      appState.activeProfileId = document.querySelector("#profileSwitcher").value;
      document.querySelector("#profileSwitchPanel").hidden = true;
      renderApp();
      await saveNow("Profile switched.");
      return;
    }
    if (action === "delete-profile") {
      await deleteActiveProfile(event.target.closest("[data-action]"));
      return;
    }
    if (action === "close-report") {
      document.querySelector("#reportPanel").hidden = true;
      return;
    }
    if (action === "preview-report") {
      prepareReport();
      return;
    }
    if (action === "print-report") {
      if (!prepareReport()) return;
      const result = await window.calculator.print();
      if (!result.ok) status(`Print failed: ${result.error}`);
      return;
    }
    if (action === "add-subject") {
      const semester = findSemester(event.target);
      if (semester.subjects.length >= limits.maxSubjectsPerSemester) return status("Subject limit reached.");
      semester.subjects.push(newSubject());
      renderCalculator();
      scheduleAutoSave();
      return;
    }
    if (action === "remove-subject") {
      const semester = findSemester(event.target);
      const subjectId = event.target.closest("[data-subject]").dataset.subject;
      semester.subjects = semester.subjects.filter(subject => subject.id !== subjectId);
      if (!semester.subjects.length) semester.subjects.push(newSubject());
      renderCalculator();
      scheduleAutoSave();
      return;
    }
    if (action === "remove-semester") {
      const profile = activeProfile();
      if (profile.semesters.length === 1) return status("Keep at least one semester.");
      const semester = findSemester(event.target);
      const semesterIndex = profile.semesters.findIndex(item => item.id === semester.id);
      // Deleting a middle/early semester renumbers every semester after it.
      if (semesterIndex < profile.semesters.length - 1) {
        const message = `Remove Semester ${semesterIndex + 1}? The semesters after it will be renumbered.`;
        if (!confirm(message)) return;
      }
      profile.semesters = profile.semesters.filter(item => item.id !== semester.id);
      renderCalculator();
      scheduleAutoSave();
      return;
    }
    if (action === "save") {
      await saveNow("Saved privately on this computer.");
      return;
    }
    if (action === "clear" && confirm("Clear every semester in this profile? The profile details will be kept.")) {
      activeProfile().semesters = [newSemester(1)];
      renderCalculator();
      await saveNow("This profile's GPA data was cleared.");
      return;
    }
    if (action === "export") {
      const result = await window.calculator.exportJson(appState);
      if (result.ok) status("All local profiles were exported to JSON.");
      else if (result.error) status(`Export failed: ${result.error}`);
      return;
    }
    if (action === "import") {
      const result = await window.calculator.importJson();
      if (result.error) return status(result.error);
      if (!result.ok) return;
      if (result.imported.kind === "profiles") {
        if (!confirm("Replace all local profiles with the profiles in this backup?")) return;
        appState = hydrateOfflineData(result.imported.data);
        renderApp();
        await saveNow("Profile backup imported and saved.");
      } else if (activeProfile()) {
        activeProfile().semesters = hydrateSemesters(result.imported.data.semesters);
        renderCalculator();
        await saveNow("Legacy calculator data imported into the current profile.");
      } else {
        pendingLegacySemesters = result.imported.data.semesters;
        showProfileEditor();
        status("Create a profile to attach the imported calculator data.");
      }
    }
  } catch (error) {
    status(`Operation failed: ${error.message}`);
  }
});

document.querySelector("#addSemester").addEventListener("click", () => {
  const profile = activeProfile();
  if (profile.semesters.length >= limits.maxSemesters) return status("Semester limit reached.");
  profile.semesters.push(newSemester(profile.semesters.length + 1));
  renderCalculator();
  scheduleAutoSave();
});

const gradeScale = document.querySelector("#gradeScale");
gradeScale.replaceChildren(...grades.map(grade => {
  const item = element("div", "grade-item");
  item.append(element("strong", "", grade), element("span", "", format(core.GRADE_SCALE[grade])));
  return item;
}));

setupLogoFallback();

Promise.all([window.calculator.listPrograms(), window.calculator.load()]).then(([programmeResult, loadResult]) => {
  if (programmeResult.ok) programmes = programmeResult.programmes;
  else status(`Local programme list could not be loaded: ${programmeResult.error}`);

  if (!loadResult.ok) {
    status(`Saved data could not be loaded: ${loadResult.error}`);
    showProfileEditor();
  } else if (!loadResult.imported) {
    showProfileEditor();
  } else if (loadResult.imported.kind === "profiles") {
    appState = hydrateOfflineData(loadResult.imported.data);
    renderApp();
    status("Your last profile was restored.");
  } else {
    pendingLegacySemesters = loadResult.imported.data.semesters;
    showProfileEditor();
    status("Create a profile once to continue with your existing saved semesters.");
  }
}).catch(error => {
  status(`Startup failed: ${error.message}`);
  showProfileEditor();
});

window.addEventListener("beforeunload", () => {
  if (appState.profiles.length) window.calculator.save(appState);
});
