const { app, BrowserWindow, ipcMain } = require("electron");
const assert = require("node:assert/strict");
const path = require("node:path");
const localProgrammes = require("../src/shared/utemPrograms.json");

const onlineUrl = process.env.ONLINE_TEST_URL || "http://127.0.0.1:8787";
let savedSmokeData = null;

// Mirror the production main/preload boundary: the sandboxed renderer receives
// a cloned local catalogue over narrow IPC and never reads files itself.
ipcMain.handle("smoke:programmes", () => ({ ok: true, programmes: structuredClone(localProgrammes) }));
ipcMain.handle("smoke:save", (_event, data) => {
  savedSmokeData = structuredClone(data);
  return { ok: true };
});
ipcMain.handle("smoke:load", () => ({
  ok: true,
  imported: savedSmokeData ? { kind: "profiles", data: structuredClone(savedSmokeData) } : null
}));
ipcMain.handle("smoke:clear", () => {
  savedSmokeData = null;
  return { ok: true };
});

async function pause(milliseconds = 80) {
  await new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function checkOfflineProfileFlow(window) {
  const firstLaunch = await window.webContents.executeJavaScript(`({
    setupVisible: !document.querySelector("#profileSetup").hidden,
    calculatorHidden: document.querySelector("#calculatorApp").hidden
  })`);

  const catalogue = await window.webContents.executeJavaScript(`(() => {
    function chooseLevel(levelValue) {
      const level = document.querySelector("#profileStudyLevel");
      level.value = levelValue;
      level.dispatchEvent(new Event("change", { bubbles: true }));
      const results = document.querySelector("#programmeResults");
      const options = [...document.querySelectorAll(".programme-option")];
      const keys = options.map(option => option.dataset.programmeKey);
      return {
        count: options.length,
        uniqueKeys: new Set(keys).size,
        faculty: document.querySelector("#programmeFaculty").value,
        firstFacultyOption: document.querySelector("#programmeFaculty").options[0].textContent,
        scrollable: results.scrollHeight > results.clientHeight
      };
    }
    function search(levelValue, query) {
      chooseLevel(levelValue);
      const field = document.querySelector("#programmeSearch");
      field.value = query;
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return [...document.querySelectorAll(".programme-option strong")].map(item => item.textContent);
    }
    const levels = {
      Diploma: chooseLevel("Diploma"),
      Degree: chooseLevel("Degree"),
      Master: chooseLevel("Master"),
      PhD: chooseLevel("PhD")
    };
    const diploma = search("Diploma", "DER");
    const degree = search("Degree", "BERR");
    const master = search("Master", "MENA");
    const phd = search("PhD", "Doctor of Philosophy");

    chooseLevel("Degree");
    const faculty = document.querySelector("#programmeFaculty");
    faculty.selectedIndex = 1;
    const chosenFaculty = faculty.value;
    faculty.dispatchEvent(new Event("change", { bubbles: true }));
    const facultyOptions = [...document.querySelectorAll(".programme-option")];
    const facultyFilter = {
      chosenFaculty,
      count: facultyOptions.length,
      allMatch: facultyOptions.every(option => option.dataset.programmeFaculty === chosenFaculty)
    };

    chooseLevel("Degree");
    const degreeResults = document.querySelector("#programmeResults");
    degreeResults.scrollTop = 100;
    const scrollBeforeLevelChange = degreeResults.scrollTop;
    document.querySelector(".programme-option").click();
    const level = document.querySelector("#profileStudyLevel");
    level.value = "Master";
    level.dispatchEvent(new Event("change", { bubbles: true }));
    const reset = {
      faculty: document.querySelector("#programmeFaculty").value,
      search: document.querySelector("#programmeSearch").value,
      selectedHidden: document.querySelector("#selectedProgramme").hidden,
      hadScrollOffset: scrollBeforeLevelChange > 0,
      scrollTop: document.querySelector("#programmeResults").scrollTop,
      count: document.querySelectorAll(".programme-option").length
    };

    const noMatch = search("Degree", "definitely-not-a-programme");
    const noMatchMessage = document.querySelector(".programme-empty").textContent;
    level.value = "Other";
    level.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      levels, diploma, degree, master, phd, facultyFilter, reset, noMatch, noMatchMessage,
      otherManualVisible: !document.querySelector("#programmeManualGroup").hidden,
      otherSearchHidden: document.querySelector("#programmeSearchGroup").hidden,
      placeholderVisible: document.body.innerText.includes("DIP-SAMPLE") || document.body.innerText.includes("Replace With Verified Official Data")
    };
  })()`);

  await window.webContents.executeJavaScript(`(() => {
    function value(selector, text) {
      const field = document.querySelector(selector);
      field.value = text;
      field.dispatchEvent(new Event("input", { bubbles: true }));
    }
    value("#profileStudentName", '<script>window.profileInjected=true</script>');
    value("#profileMatricNumber", "B0123456");
    const level = document.querySelector("#profileStudyLevel");
    level.value = "Other";
    level.dispatchEvent(new Event("change", { bubbles: true }));
    value("#programmeManual", "Manual Test Programme");
    document.querySelector("#profileForm button[type=submit]").click();
  })()`);
  await pause();

  const created = await window.webContents.executeJavaScript(`({
    profileVisible: !document.querySelector("#profileCard").hidden,
    calculatorVisible: !document.querySelector("#calculatorApp").hidden,
    profileName: document.querySelector("#profileCardName").textContent,
    injectedNodes: document.querySelectorAll("#profileCard script, #profileCard img").length
  })`);

  // Add, switch between, and delete a second profile. Confirmation is replaced
  // only inside this smoke-test page; the production app still uses the native prompt.
  await window.webContents.executeJavaScript(`(() => document.querySelector('[data-action="add-profile"]').click())()`);
  await window.webContents.executeJavaScript(`(() => {
    function value(selector, text) { const field = document.querySelector(selector); field.value = text; field.dispatchEvent(new Event("input", { bubbles: true })); }
    value("#profileStudentName", "Second Student");
    value("#profileMatricNumber", "B0999999");
    const level = document.querySelector("#profileStudyLevel"); level.value = "Degree"; level.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelector('[data-action="choose-programme"]').click();
    document.querySelector("#profileForm button[type=submit]").click();
  })()`);
  await pause();
  await window.webContents.executeJavaScript(`(() => {
    document.querySelector('[data-action="switch-profile"]').click();
    const switcher = document.querySelector("#profileSwitcher"); switcher.selectedIndex = 0;
    document.querySelector('[data-action="activate-profile"]').click();
  })()`);
  await pause();
  const switched = await window.webContents.executeJavaScript(`({
    activeName: document.querySelector("#profileCardName").textContent,
    profileCount: document.querySelector("#profileSwitcher").options.length
  })`);
  await window.webContents.executeJavaScript(`(() => {
    document.querySelector('[data-action="switch-profile"]').click();
    const switcher = document.querySelector("#profileSwitcher"); switcher.selectedIndex = 1;
    document.querySelector('[data-action="activate-profile"]').click();
  })()`);
  await pause();
  await window.webContents.executeJavaScript(`(() => { window.confirm = () => true; document.querySelector('[data-action="delete-profile"]').click(); })()`);
  await pause();
  const deleted = await window.webContents.executeJavaScript(`({
    activeName: document.querySelector("#profileCardName").textContent,
    profileCount: document.querySelector("#profileSwitcher").options.length
  })`);
  return { firstLaunch, catalogue, created, switched, deleted };
}

// Enter one subject in each of two semesters through the actual page controls.
async function enterWeightedExample(window, label) {
  try {
    return await window.webContents.executeJavaScript(`
    (() => {
      function input(element, value) {
        element.value = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const firstSemester = document.querySelector("[data-semester]");
      input(firstSemester.querySelector('[data-field="name"]'), '<img src=x onerror="window.injected=true">');
      input(firstSemester.querySelector('[data-field="credit"]'), "3");
      input(document.querySelector("[data-semester]").querySelector('[data-field="grade"]'), "B");

      document.querySelector("#addSemester").click();
      const semesters = document.querySelectorAll("[data-semester]");
      const secondSemester = semesters[semesters.length - 1];
      input(secondSemester.querySelector('[data-field="credit"]'), "1");
      input(document.querySelectorAll("[data-semester]")[1].querySelector('[data-field="grade"]'), "A");

      return {
        cgpa: document.querySelector("#cgpa").textContent,
        credits: document.querySelector("#totalCredits").textContent,
        points: document.querySelector("#totalPoints").textContent,
        semesters: document.querySelector("#semesterCount").textContent,
        subjectName: document.querySelector('[data-field="name"]').value,
        injectedElements: document.querySelectorAll(".semester img, .semester script").length,
        invalidOutput: ["NaN", "undefined", "null", "#DIV/0!", "#VALUE!"]
          .some(value => document.body.innerText.includes(value))
      };
    })()
    `);
  } catch (error) {
    throw new Error(`${label} interaction failed: ${error.message}`);
  }
}

async function checkPhoneLayout(window) {
  window.setSize(390, 844);
  await new Promise(resolve => setTimeout(resolve, 100));
  return window.webContents.executeJavaScript(`({
    viewport: window.innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    subjectLayout: getComputedStyle(document.querySelector(".subjects tr")).display
  })`);
}

async function inspectLogo(window) {
  return window.webContents.executeJavaScript(`(() => {
    const logo = document.querySelector(".brand-logo");
    const header = document.querySelector(".brand-header");
    const hero = document.querySelector(".hero");
    const logoBox = logo.getBoundingClientRect();
    const headerBox = header.getBoundingClientRect();
    return {
      loaded: logo.complete && logo.naturalWidth > 0,
      visible: !logo.hidden && logoBox.width > 0 && logoBox.height > 0,
      insideHeader: logoBox.top >= headerBox.top - 1 && logoBox.bottom <= headerBox.bottom + 1,
      aboveHero: logoBox.bottom <= hero.getBoundingClientRect().top + 1,
      undistorted: Math.abs((logoBox.width / logoBox.height) - (logo.naturalWidth / logo.naturalHeight)) < 0.02,
      position: getComputedStyle(logo).position,
      headerOverflow: getComputedStyle(header).overflow
    };
  })()`);
}

async function checkEmptyReport(window) {
  return window.webContents.executeJavaScript(`(() => {
    document.querySelector('[data-action="preview-report"]').click();
    return {
      hidden: document.querySelector("#reportPanel").hidden,
      message: document.querySelector("#status").textContent
    };
  })()`);
}

async function checkOnlineProgrammeReport(window) {
  return window.webContents.executeJavaScript(`(() => {
    const level = document.querySelector("#onlineStudyLevel");
    const faculty = document.querySelector("#onlineFaculty");
    const programme = document.querySelector("#onlineProgramme");
    level.value = "Degree";
    level.dispatchEvent(new Event("change", { bubbles: true }));
    const allProgrammeCount = [...programme.options]
      .filter(option => option.value && option.textContent !== "My programme is not listed").length;
    const defaultFaculty = faculty.value;
    const targetFaculty = "Fakulti Teknologi Dan Kejuruteraan Elektronik Dan Komputer";
    faculty.value = targetFaculty;
    faculty.dispatchEvent(new Event("change", { bubbles: true }));
    const filteredProgrammeCount = [...programme.options]
      .filter(option => option.value && option.textContent !== "My programme is not listed").length;
    const berg = [...programme.options]
      .find(option => option.textContent === "BERG - Bachelor of Electronic Engineering with Honours");
    programme.value = berg.value;
    programme.dispatchEvent(new Event("change", { bubbles: true }));
    const selectedSummary = document.querySelector("#onlineProgrammeSummary").textContent;

    programme.value = "__manual_programme__";
    programme.dispatchEvent(new Event("change", { bubbles: true }));
    const manualFallbackVisible = !document.querySelector("#onlineManualProgrammeGroup").hidden;
    document.querySelector("#onlineManualProgramme").value = "Custom Session Programme";
    document.querySelector('[data-action="preview-report"]').click();
    const manualProgrammeName = [...document.querySelectorAll(".report-info-grid div")]
      .find(item => item.querySelector("dt").textContent === "Programme name")?.querySelector("dd").textContent;
    document.querySelector('#reportPanel [data-action="close-report"]').click();
    programme.value = berg.value;
    programme.dispatchEvent(new Event("change", { bubbles: true }));

    document.querySelector('[data-action="preview-report"]').click();
    const information = Object.fromEntries([...document.querySelectorAll(".report-info-grid div")]
      .map(item => [item.querySelector("dt").textContent, item.querySelector("dd").textContent]));
    document.querySelector('#reportPanel [data-action="close-report"]').click();
    return {
      allProgrammeCount,
      defaultFaculty,
      facultyCount: faculty.options.length - 1,
      filteredProgrammeCount,
      selectedLabel: berg.textContent,
      selectedSummary,
      manualFallbackVisible,
      manualProgrammeName,
      information
    };
  })()`);
}

async function checkReportPreview(window, studentValue, enterStudentValue = true) {
  return window.webContents.executeJavaScript(`(() => {
    const student = document.querySelector('[data-student-field="studentName"]');
    if (${enterStudentValue} && student) student.value = ${JSON.stringify(studentValue)};
    document.querySelector('[data-action="preview-report"]').click();
    const panel = document.querySelector("#reportPanel");
    const result = {
      visible: !panel.hidden,
      title: panel.querySelector(".report-heading h1").textContent,
      studentText: panel.querySelector(".report-info-grid dd").textContent,
      subjectRows: panel.querySelectorAll(".report-table tbody tr").length,
      scriptNodes: panel.querySelectorAll("script").length,
      privacy: panel.querySelector(".report-privacy").textContent,
      notesTitle: panel.querySelector(".report-notes h2").textContent,
      generated: panel.querySelector(".report-footer span").textContent
    };
    panel.querySelector('[data-action="close-report"]').click();
    result.closed = panel.hidden;
    return result;
  })()`);
}

async function checkOfflinePrintAction(window) {
  await window.webContents.executeJavaScript(`(() => {
    document.querySelector('#reportPanel [data-action="close-report"]')?.click();
    document.querySelector('#calculatorApp [data-action="print-report"]').click();
  })()`);
  await pause();
  return window.webContents.executeJavaScript(`(() => ({
    previewVisible: !document.querySelector("#reportPanel").hidden,
    printCalls: window.calculator.smokeState().printCalls,
    reportError: document.querySelector("[data-report-feedback]").textContent
  }))()`);
}

function assertLogo(result, label) {
  assert.equal(result.loaded, true, `${label} logo did not load`);
  assert.equal(result.visible, true, `${label} logo is not visible`);
  assert.equal(result.insideHeader, true, `${label} logo is clipped by its header`);
  assert.equal(result.aboveHero, true, `${label} logo overlaps the hero`);
  assert.equal(result.undistorted, true, `${label} logo aspect ratio changed`);
  assert.equal(result.position, "static", `${label} logo should stay in normal document flow`);
  assert.equal(result.headerOverflow, "visible", `${label} header should not clip its contents`);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "smoke-preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  window.webContents.on("console-message", (_event, _level, message) => {
    console.error(`Renderer console: ${message}`);
  });

  let failed = false;
  try {
    await window.loadFile(path.join(__dirname, "..", "src", "renderer", "index.html"));
    assertLogo(await inspectLogo(window), "Offline laptop");
    const profiles = await checkOfflineProfileFlow(window);
    assert.deepEqual(profiles.firstLaunch, { setupVisible: true, calculatorHidden: true });
    assert.deepEqual(Object.fromEntries(Object.entries(profiles.catalogue.levels).map(([level, details]) => [level, details.count])), {
      Diploma: 6, Degree: 50, Master: 41, PhD: 12
    });
    for (const details of Object.values(profiles.catalogue.levels)) {
      assert.equal(details.uniqueKeys, details.count);
      assert.equal(details.faculty, "");
      assert.equal(details.firstFacultyOption, "All faculties");
    }
    assert.equal(profiles.catalogue.levels.Degree.scrollable, true);
    assert.ok(profiles.catalogue.diploma.some(label => label.startsWith("DER - ")));
    assert.ok(profiles.catalogue.degree.some(label => label.startsWith("BERR - ")));
    assert.ok(profiles.catalogue.master.some(label => label.startsWith("MENA - ")));
    assert.ok(profiles.catalogue.phd.some(label => label.startsWith("PENA - ")));
    assert.ok(profiles.catalogue.facultyFilter.chosenFaculty);
    assert.ok(profiles.catalogue.facultyFilter.count > 0 && profiles.catalogue.facultyFilter.count < 50);
    assert.equal(profiles.catalogue.facultyFilter.allMatch, true);
    assert.deepEqual(profiles.catalogue.reset, { faculty: "", search: "", selectedHidden: true, hadScrollOffset: true, scrollTop: 0, count: 41 });
    assert.deepEqual(profiles.catalogue.noMatch, []);
    assert.equal(profiles.catalogue.noMatchMessage, "No matching programme found. Use manual entry.");
    assert.equal(profiles.catalogue.otherManualVisible, true);
    assert.equal(profiles.catalogue.otherSearchHidden, true);
    assert.equal(profiles.catalogue.placeholderVisible, false);
    assert.deepEqual(profiles.created, {
      profileVisible: true, calculatorVisible: true,
      profileName: '<script>window.profileInjected=true</script>', injectedNodes: 0
    });
    assert.deepEqual(profiles.switched, { activeName: '<script>window.profileInjected=true</script>', profileCount: 2 });
    assert.deepEqual(profiles.deleted, { activeName: '<script>window.profileInjected=true</script>', profileCount: 1 });
    const offlineReloaded = new Promise(resolve => window.webContents.once("did-finish-load", resolve));
    window.webContents.reload();
    await offlineReloaded;
    await pause();
    const restoredOffline = await window.webContents.executeJavaScript(`({
      profileVisible: !document.querySelector("#profileCard").hidden,
      activeName: document.querySelector("#profileCardName").textContent,
      profileCount: document.querySelector("#profileSwitcher").options.length
    })`);
    assert.deepEqual(restoredOffline, {
      profileVisible: true,
      activeName: '<script>window.profileInjected=true</script>',
      profileCount: 1
    });
    const emptyOffline = await checkEmptyReport(window);
    assert.equal(emptyOffline.hidden, true);
    assert.match(emptyOffline.message, /Add at least one subject/);
    const offline = await enterWeightedExample(window, "Offline page");
    assert.deepEqual(offline, { cgpa: "3.25", credits: "4", points: "13.00", semesters: "2", subjectName: '<img src=x onerror="window.injected=true">', injectedElements: 0, invalidOutput: false });
    const offlinePhone = await checkPhoneLayout(window);
    assert.ok(offlinePhone.pageWidth <= offlinePhone.viewport);
    assert.equal(offlinePhone.subjectLayout, "grid");
    assertLogo(await inspectLogo(window), "Offline phone");
    const offlineReport = await checkReportPreview(window, '<script>window.profileInjected=true</script>', false);
    assert.deepEqual(offlineReport, {
      visible: true,
      title: "Unofficial UTeM GPA/CGPA Calculator",
      studentText: '<script>window.profileInjected=true</script>',
      subjectRows: 2,
      scriptNodes: 0,
      privacy: "This report is generated locally on the user’s device. No data is uploaded or stored online.",
      notesTitle: "Notes for Academic Consultation",
      generated: offlineReport.generated,
      closed: true
    });
    assert.match(offlineReport.generated, /^Generated: /);
    assert.deepEqual(await checkOfflinePrintAction(window), {
      previewVisible: true,
      printCalls: 1,
      reportError: ""
    });

    window.setSize(1200, 800);
    await window.loadURL(onlineUrl);
    assertLogo(await inspectLogo(window), "Online laptop");
    const emptyOnline = await checkEmptyReport(window);
    assert.equal(emptyOnline.hidden, true);
    assert.match(emptyOnline.message, /Add at least one subject/);
    const online = await enterWeightedExample(window, "Online page");
    assert.deepEqual(online, { cgpa: "3.25", credits: "4", points: "13.00", semesters: "2", subjectName: '<img src=x onerror="window.injected=true">', injectedElements: 0, invalidOutput: false });
    const onlineProgramme = await checkOnlineProgrammeReport(window);
    assert.equal(onlineProgramme.allProgrammeCount, 50);
    assert.equal(onlineProgramme.defaultFaculty, "");
    assert.ok(onlineProgramme.facultyCount > 1);
    assert.ok(onlineProgramme.filteredProgrammeCount > 0 && onlineProgramme.filteredProgrammeCount < 50);
    assert.equal(onlineProgramme.selectedLabel, "BERG - Bachelor of Electronic Engineering with Honours");
    assert.match(onlineProgramme.selectedSummary, /Fakulti Teknologi Dan Kejuruteraan Elektronik Dan Komputer/);
    assert.match(onlineProgramme.selectedSummary, /Full-time/);
    assert.equal(onlineProgramme.manualFallbackVisible, true);
    assert.equal(onlineProgramme.manualProgrammeName, "Custom Session Programme");
    assert.deepEqual(onlineProgramme.information, {
      "Study level": "Degree",
      "Programme code": "BERG",
      "Programme name": "Bachelor of Electronic Engineering with Honours",
      "Faculty": "Fakulti Teknologi Dan Kejuruteraan Elektronik Dan Komputer",
      "Mode": "Full-time"
    });
    const onlinePhone = await checkPhoneLayout(window);
    assert.ok(onlinePhone.pageWidth <= onlinePhone.viewport);
    assert.equal(onlinePhone.subjectLayout, "grid");
    assertLogo(await inspectLogo(window), "Online phone");
    const onlineReport = await checkReportPreview(window, '<script>window.reportInjected=true</script>', true);
    assert.equal(onlineReport.visible, true);
    assert.equal(onlineReport.title, "Unofficial UTeM GPA/CGPA Calculator");
    assert.equal(onlineReport.studentText, '<script>window.reportInjected=true</script>');
    assert.equal(onlineReport.subjectRows, 2);
    assert.equal(onlineReport.scriptNodes, 0);
    assert.equal(onlineReport.closed, true);

    // reload() starts navigation but does not itself wait for the new page.
    const reloaded = new Promise(resolve => window.webContents.once("did-finish-load", resolve));
    window.webContents.reload();
    await reloaded;
    const refreshed = await window.webContents.executeJavaScript(`({
      cgpa: document.querySelector("#cgpa").textContent,
      semesters: document.querySelector("#semesterCount").textContent,
      studyLevel: document.querySelector("#onlineStudyLevel").value,
      programmeDisabled: document.querySelector("#onlineProgramme").disabled
    })`);
    assert.deepEqual(refreshed, { cgpa: "0.00", semesters: "1", studyLevel: "", programmeDisabled: true });

    console.log("Offline and online interface smoke tests passed.");
  } catch (error) {
    console.error(error);
    failed = true;
  } finally {
    window.destroy();
    app.exit(failed ? 1 : 0);
  }
});
