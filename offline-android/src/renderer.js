/**
 * Offline Android renderer — mirrors the offline Windows profile workflow.
 *
 * SECURITY BOUNDARY
 * - User-entered values reach the page only through DOM properties
 *   (textContent, value, dataset) and never through innerHTML, outerHTML,
 *   HTML string parsing, eval(), or new Function(). Every row is built with
 *   document.createElement and Node.append.
 * - GPA/CGPA math comes from shared/gpaCore.js; validation/limits from
 *   shared/dataValidation.js and shared/offlineProfiles.js; reports from
 *   shared/report.js. This file holds no calculation rules.
 * - Persistence uses shared/offlineProfiles.js validation and the local
 *   AndroidStore (Capacitor Filesystem, app-private sandbox). No network.
 * - The printable report handed to the native print plugin is serialized from
 *   a trusted DOM tree (built by shared/report.js) via XMLSerializer — a DOM
 *   API, never HTML-string parsing or raw user-input interpolation. Styles and
 *   the logo are embedded locally so no network fetch is needed (CSP keeps
 *   connect-src 'none').
 */
(function () {
  "use strict";

  const core = globalThis.GpaCore;
  const validation = globalThis.CalculatorValidation;
  const identityText = globalThis.IdentityText;
  const profileTools = globalThis.OfflineProfiles;
  const reportBuilder = globalThis.ReportBuilder;
  const store = globalThis.AndroidStore;
  const printer = (globalThis.capacitorPrinter && globalThis.capacitorPrinter.Printer) || null;

  const grades = [...validation.APPROVED_GRADES];
  const limits = validation.LIMITS;

  let appState = { version: 2, activeProfileId: null, profiles: [] };
  let programmes = [];
  let selectedProgramme = null;
  let editingProfileId = null;
  let autoSaveTimer = null;
  let persistenceQueue = Promise.resolve();

  // ---------- Small DOM helpers (properties only; no HTML parsing) ----------

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

  function newSubject() {
    return { id: globalThis.crypto.randomUUID(), name: "", credit: "", grade: "" };
  }

  function newSemester(number) {
    return { id: globalThis.crypto.randomUUID(), name: `Semester ${number}`, subjects: [newSubject()] };
  }

  function hydrateSemesters(semesters) {
    return semesters.map((semester, index) => ({
      id: globalThis.crypto.randomUUID(),
      name: semester.name || `Semester ${index + 1}`,
      subjects: semester.subjects.length
        ? semester.subjects.map(subject => ({ id: globalThis.crypto.randomUUID(), ...subject }))
        : [newSubject()]
    }));
  }

  // Strip private renderer IDs before validation/persistence; fresh IDs are
  // added only for safe DOM reconciliation after a validated load.
  function hydrateOfflineData(data) {
    const checked = profileTools.validateOfflineData(data);
    return {
      version: 2,
      activeProfileId: checked.activeProfileId,
      profiles: checked.profiles.map(profile => ({ ...profile, semesters: hydrateSemesters(profile.semesters) }))
    };
  }

  function activeProfile() {
    return appState.profiles.find(profile => profile.id === appState.activeProfileId) || null;
  }

  function activeCalculatorData() {
    const profile = activeProfile();
    return { version: 1, semesters: profile ? profile.semesters : [newSemester(1)] };
  }

  // ---------- Persistence via the local Android Filesystem store ----------

  function cancelScheduledAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }

  // Keep local-file operations ordered so a clear/save can never race.
  function queuePersistence(operation) {
    const pending = persistenceQueue.then(operation, operation);
    persistenceQueue = pending.catch(() => {});
    return pending;
  }

  async function saveNow(successMessage = "") {
    cancelScheduledAutoSave();
    if (!appState.profiles.length) return { ok: true };
    try {
      const snapshot = profileTools.validateOfflineData({
        version: 2,
        activeProfileId: appState.activeProfileId,
        profiles: appState.profiles.map(profile => ({
          id: profile.id,
          studentName: profile.studentName,
          matricNumber: profile.matricNumber,
          studyLevel: profile.studyLevel,
          programme: profile.programme,
          programmeCode: profile.programmeCode,
          programmeFaculty: profile.programmeFaculty,
          advisorName: profile.advisorName,
          semesters: profile.semesters.map(semester => ({
            name: semester.name,
            subjects: semester.subjects.map(subject => ({
              name: subject.name, credit: subject.credit, grade: subject.grade
            }))
          }))
        }))
      });
      await queuePersistence(() => store.saveProfile(snapshot));
      if (successMessage) status(successMessage);
      return { ok: true };
    } catch (error) {
      status(`Save failed: ${error.message}`);
      return { ok: false, error: error.message };
    }
  }

  function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => { void saveNow(); }, 600);
  }

  // ---------- Programme picker ----------

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
      button.setAttribute("role", "option");
      button.append(
        element("strong", "", programmeLabel(programme)),
        element("span", "programme-option-faculty", programme.faculty || "Faculty not specified"),
        element("span", "programme-option-meta", programmeDetails(programme))
      );
      results.append(button);
    }
    if (!matches.length) results.append(element("p", "programme-empty", "No matching programme found. Use manual entry."));
    results.hidden = false;
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

  // ---------- Profile form / card ----------

  function setProfileFormBusy(busy) {
    const form = document.querySelector("#profileForm");
    form.setAttribute("aria-busy", String(busy));
    for (const control of form.querySelectorAll("input, select, button")) control.disabled = busy;
  }

  function closeTransientPanels() {
    document.querySelector("#profileSwitchPanel").hidden = true;
    document.querySelector("#reportPanel").hidden = true;
  }

  function showProfileEditor(profile = null) {
    setProfileFormBusy(false);
    editingProfileId = profile ? profile.id : null;
    selectedProgramme = null;
    document.querySelector("#profileCard").hidden = true;
    document.querySelector("#calculatorApp").hidden = true;
    document.querySelector("#profileSwitchPanel").hidden = true;
    document.querySelector("#profileSetup").hidden = false;
    document.querySelector("#profileSetupTitle").textContent = profile ? "Edit your local profile" : "Create your local profile";
    document.querySelector("#profileStudentName").value = profile ? profile.studentName : "";
    document.querySelector("#profileMatricNumber").value = profile ? profile.matricNumber : "";
    document.querySelector("#profileStudyLevel").value = profile ? profile.studyLevel : "";
    document.querySelector("#profileAdvisorName").value = profile ? profile.advisorName : "";
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

  // ---------- Calculator DOM ----------

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
    // Collapse toggle (mobile-friendly); the header click handler reads this.
    const toggle = element("button", "semester-toggle no-print", "▾");
    toggle.dataset.action = "toggle-semester";
    toggle.setAttribute("aria-label", `Collapse Semester ${index + 1}`);
    toggle.setAttribute("aria-expanded", "true");
    const remove = element("button", "remove no-print", "Remove");
    remove.dataset.action = "remove-semester";
    remove.setAttribute("aria-label", `Remove Semester ${index + 1}`);
    header.append(title, gpa, toggle, remove);
    // Body wraps everything that collapses; the GPA header stays visible.
    const body = element("div", "semester-body");
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
    body.append(createSubjectsTable(semester.subjects), summary, actions);
    card.append(header, body);
    return card;
  }

  // Snapshot which semester cards are collapsed so a re-render (e.g. after
  // adding a subject) restores their closed state instead of expanding all.
  function captureCollapsedSemesters() {
    const collapsed = new Set();
    for (const card of document.querySelectorAll("#semesters [data-semester].collapsed")) {
      collapsed.add(card.dataset.semester);
    }
    return collapsed;
  }

  function renderCalculator(collapsedBefore = null) {
    const profile = activeProfile();
    if (!profile) return;
    const collapsed = collapsedBefore || captureCollapsedSemesters();
    const container = document.querySelector("#semesters");
    container.replaceChildren(...profile.semesters.map((semester, index) => createSemesterCard(semester, index)));
    // Reapply the collapsed state to the freshly rendered cards.
    for (const card of container.querySelectorAll("[data-semester]")) {
      if (!collapsed.has(card.dataset.semester)) continue;
      card.classList.add("collapsed");
      const toggle = card.querySelector(".semester-toggle");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "▸";
        toggle.setAttribute("aria-label", toggle.getAttribute("aria-label").replace("Collapse", "Expand"));
      }
    }
    const overall = core.overallResult(profile.semesters);
    document.querySelector("#cgpa").textContent = format(overall.cgpa);
    document.querySelector("#totalCredits").textContent = String(overall.totalCredits);
    document.querySelector("#totalPoints").textContent = format(overall.totalGradePoints);
    document.querySelector("#semesterCount").textContent = String(profile.semesters.length);
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

  // Collapse/expand a semester card. The .collapsed class drives the CSS
  // transition that hides the subject body while the GPA header stays visible.
  function toggleSemesterCard(card, toggleButton) {
    if (!card) return;
    const collapsed = card.classList.toggle("collapsed");
    if (toggleButton) {
      toggleButton.setAttribute("aria-expanded", String(!collapsed));
      toggleButton.textContent = collapsed ? "▸" : "▾";
      toggleButton.setAttribute("aria-label", collapsed ? "Expand semester" : "Collapse semester");
    }
  }

  // ---------- Report + native print ----------

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

  // The printed report must be self-contained because the native WebView that
  // renders the print HTML does not resolve the app's relative <link>/<img>.
  // We embed the already-loaded stylesheet rules (read from the CSSOM, not the
  // network) and the logo as a data URL, then serialize a cloned trusted DOM
  // tree with XMLSerializer. No fetch, no HTML-string parsing, no raw input.
  function collectedCssText() {
    let text = "";
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) text += `${rule.cssText}\n`;
      } catch {
        // Skip any stylesheet whose rules cannot be read.
      }
    }
    return text;
  }

  function imageToDataUrl(img) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 0;
      canvas.height = img.naturalHeight || 0;
      if (!canvas.width || !canvas.height) return "";
      const context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      return canvas.toDataURL("image/png");
    } catch {
      return "";
    }
  }

  function buildPrintableHtml() {
    const reportNode = document.querySelector("#reportContent").firstElementChild;
    if (!reportNode) throw new Error("Preview the report before printing.");
    const clone = reportNode.cloneNode(true);
    const logo = clone.querySelector(".report-logo");
    if (logo) {
      const source = document.querySelector(".brand-logo");
      const dataUrl = source ? imageToDataUrl(source) : "";
      if (dataUrl) logo.src = dataUrl;
      else logo.remove();
    }
    const style = document.createElement("style");
    style.textContent = collectedCssText();
    const meta = document.createElement("meta");
    meta.setAttribute("charset", "UTF-8");
    const head = document.createElement("head");
    head.append(meta, style);
    const body = document.createElement("body");
    body.append(clone);
    const doc = document.createElement("html");
    doc.append(head, body);
    return `<!doctype html>${new XMLSerializer().serializeToString(doc)}`;
  }

  async function printReport() {
    if (!prepareReport()) return;
    try {
      if (printer && typeof printer.printHtml === "function") {
        const html = buildPrintableHtml();
        await printer.printHtml({ name: "UTeM GPA/CGPA Report", html });
      } else {
        // Browser/dev fallback when the native plugin is unavailable.
        globalThis.print();
      }
    } catch (error) {
      status(`Print failed: ${error.message}`);
    }
  }

  // ---------- Profile mutations ----------

  async function deleteActiveProfile(deleteButton) {
    const profile = activeProfile();
    if (!profile || !globalThis.confirm(`Delete ${profile.studentName} and all GPA data in this profile?`)) return;

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
      closeTransientPanels();

      if (!profiles.length) {
        // Make the next profile form interactive before waiting for disk I/O.
        showProfileEditor();
        await queuePersistence(() => store.clearProfile());
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

  // ---------- Event wiring ----------

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
        id: existing ? existing.id : globalThis.crypto.randomUUID(),
        studentName,
        matricNumber,
        studyLevel,
        programme,
        programmeCode: selectedProgramme ? (selectedProgramme.programCode || "") : "",
        programmeFaculty: selectedProgramme ? (selectedProgramme.faculty || "") : "",
        advisorName,
        semesters: existing ? existing.semesters : [newSemester(1)]
      };
      const profiles = existing
        ? appState.profiles.map(item => (item.id === existing.id ? profile : item))
        : [...appState.profiles, profile];
      const checked = profileTools.validateOfflineData({ version: 2, activeProfileId: profile.id, profiles });
      appState = hydrateOfflineData(checked);
      editingProfileId = null;
      renderApp();
      await saveNow("Profile saved privately on this device.");
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
    const semesterCard = event.target.closest("[data-semester]");
    const profile = activeProfile();
    if (!semesterCard || !profile) return;
    const semester = profile.semesters.find(item => item.id === semesterCard.dataset.semester);
    if (!semester) return;
    const subjectId = event.target.closest("[data-subject]").dataset.subject;
    const subject = semester.subjects.find(item => item.id === subjectId);
    if (!subject) return;
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
    if (event.target.dataset.field) void saveNow();
  });

  document.addEventListener("click", async event => {
    const actionEl = event.target.closest("[data-action]");
    const action = actionEl ? actionEl.dataset.action : null;
    if (!action) return;
    const profile = activeProfile();
    const semesterCard = event.target.closest("[data-semester]");
    const semester = semesterCard && profile
      ? profile.semesters.find(item => item.id === semesterCard.dataset.semester)
      : null;
    try {
      if (action === "toggle-semester") {
        toggleSemesterCard(semesterCard, actionEl);
        return;
      }
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
        await deleteActiveProfile(actionEl);
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
        await printReport();
        return;
      }
      if (action === "add-subject") {
        if (!semester) return;
        if (semester.subjects.length >= limits.maxSubjectsPerSemester) return status("Subject limit reached.");
        semester.subjects.push(newSubject());
        renderCalculator();
        scheduleAutoSave();
        return;
      }
      if (action === "remove-subject") {
        if (!semester) return;
        const subjectId = event.target.closest("[data-subject]").dataset.subject;
        semester.subjects = semester.subjects.filter(item => item.id !== subjectId);
        if (!semester.subjects.length) semester.subjects.push(newSubject());
        renderCalculator();
        scheduleAutoSave();
        return;
      }
      if (action === "remove-semester") {
        if (!profile || !semester) return;
        if (profile.semesters.length === 1) return status("Keep at least one semester.");
        const semesterIndex = profile.semesters.findIndex(item => item.id === semester.id);
        // Deleting a middle/early semester renumbers every semester after it.
        if (semesterIndex < profile.semesters.length - 1) {
          const message = `Remove Semester ${semesterIndex + 1}? The semesters after it will be renumbered.`;
          if (!globalThis.confirm(message)) return;
        }
        profile.semesters = profile.semesters.filter(item => item.id !== semester.id);
        renderCalculator();
        scheduleAutoSave();
        return;
      }
      if (action === "save") {
        await saveNow("Saved privately on this device.");
        return;
      }
      if (action === "clear" && globalThis.confirm("Clear every semester in this profile? The profile details will be kept.")) {
        activeProfile().semesters = [newSemester(1)];
        renderCalculator();
        await saveNow("This profile's GPA data was cleared.");
        return;
      }
    } catch (error) {
      status(`Operation failed: ${error.message}`);
    }
  });

  document.querySelector("#addSemester").addEventListener("click", () => {
    const profile = activeProfile();
    if (!profile) return;
    if (profile.semesters.length >= limits.maxSemesters) return status("Semester limit reached.");
    profile.semesters.push(newSemester(profile.semesters.length + 1));
    renderCalculator();
    scheduleAutoSave();
  });

  // Clicking the semester header background (not an input/select/button, which
  // handle their own actions) also collapses/expands that semester on mobile.
  document.querySelector("#semesters").addEventListener("click", event => {
    const header = event.target.closest(".semester-header");
    if (!header) return;
    if (event.target.closest("input, select, button, a, textarea, label")) return;
    const card = header.closest("[data-semester]");
    toggleSemesterCard(card, card ? card.querySelector(".semester-toggle") : null);
  });

  // ---------- Grade scale + startup ----------

  const gradeScale = document.querySelector("#gradeScale");
  gradeScale.replaceChildren(...grades.map(grade => {
    const item = element("div", "grade-item");
    item.append(element("strong", "", grade), element("span", "", format(core.GRADE_SCALE[grade])));
    return item;
  }));

  // The catalogue is bundled as a classic script (shared/utemProgramsData.js)
  // because the page CSP keeps connect-src 'none', which forbids fetching or
  // reading the JSON via Filesystem. Validate the in-memory data before use.
  function loadProgrammes() {
    try {
      const data = globalThis.UTEM_PROGRAMMES_DATA;
      if (!Array.isArray(data)) throw new Error("Programme data module is missing or invalid.");
      programmes = profileTools.validateProgrammeList(data);
    } catch (error) {
      programmes = [];
      status(`Local programme list could not be loaded: ${error.message}`);
    }
  }

  async function startup() {
    loadProgrammes();
    let imported = null;
    try {
      imported = await store.loadProfile();
    } catch (error) {
      status(`Saved data could not be loaded: ${error.message}`);
      showProfileEditor();
      return;
    }
    if (!imported) {
      showProfileEditor();
      return;
    }
    try {
      const parsed = profileTools.validateImportedData(imported);
      if (parsed.kind === "profiles") {
        appState = hydrateOfflineData(parsed.data);
        renderApp();
        status("Your last profile was restored.");
      } else {
        // Legacy calculator backup: attach to a fresh profile once created.
        appState = { version: 2, activeProfileId: null, profiles: [] };
        showProfileEditor();
        status("Create a profile once to continue with your existing saved semesters.");
      }
    } catch (error) {
      status(`Saved data was not valid: ${error.message}`);
      showProfileEditor();
    }
  }

  void startup();
})();
