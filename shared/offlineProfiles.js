/**
 * Validation for the Electron-only profile store.
 * The online calculator deliberately does not load or use this module.
 */
(function (root, factory) {
  const calculatorValidation = typeof module === "object" && module.exports
    ? require("./dataValidation")
    : root.CalculatorValidation;
  const programmeCatalog = typeof module === "object" && module.exports
    ? require("./programmeCatalog")
    : root.UTeMProgrammeCatalog;
  const api = factory(calculatorValidation, programmeCatalog);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OfflineProfiles = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (calculatorValidation, programmeCatalog) {
  "use strict";

  const STUDY_LEVELS = Object.freeze(["Diploma", "Degree", "Master", "PhD", "Other"]);
  const PROGRAMME_MODES = Object.freeze(["Full-time", "Part-time"]);
  const PROFILE_LIMITS = Object.freeze({
    maxProfiles: 20,
    maxIdLength: 64,
    maxStudentNameLength: 100,
    maxMatricNumberLength: 30,
    maxProgrammeLength: 160,
    maxProgrammeCodeLength: 20,
    maxFacultyLength: 160,
    maxAdvisorNameLength: 100,
    maxProgrammeEntries: 500
  });

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function text(value, field, maximum, required = false) {
    if (typeof value !== "string") throw new Error(`${field} must be text.`);
    const cleaned = value.trim();
    if (required && !cleaned) throw new Error(`${field} is required.`);
    if (cleaned.length > maximum) throw new Error(`${field} is too long (maximum ${maximum} characters).`);
    return cleaned;
  }

  function validateId(value, field = "Profile ID") {
    const id = text(value, field, PROFILE_LIMITS.maxIdLength, true);
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error(`${field} contains unsupported characters.`);
    return id;
  }

  function validateProfile(value) {
    if (!isPlainObject(value)) throw new Error("Every profile must be an object.");
    const studyLevel = text(value.studyLevel, "Study level", 20, true);
    if (!STUDY_LEVELS.includes(studyLevel)) throw new Error("Study level is not approved.");
    const calculator = calculatorValidation.validateCalculatorData({ semesters: value.semesters });
    return {
      id: validateId(value.id),
      studentName: text(value.studentName, "Student name", PROFILE_LIMITS.maxStudentNameLength, true),
      matricNumber: text(value.matricNumber, "Matric number", PROFILE_LIMITS.maxMatricNumberLength, true),
      studyLevel,
      programme: text(value.programme, "Programme", PROFILE_LIMITS.maxProgrammeLength, true),
      programmeCode: text(value.programmeCode ?? "", "Programme code", PROFILE_LIMITS.maxProgrammeCodeLength),
      programmeFaculty: text(value.programmeFaculty ?? "", "Faculty", PROFILE_LIMITS.maxFacultyLength),
      advisorName: text(value.advisorName ?? "", "Academic advisor name", PROFILE_LIMITS.maxAdvisorNameLength),
      semesters: calculator.semesters
    };
  }

  function validateOfflineData(data) {
    if (!isPlainObject(data) || !Array.isArray(data.profiles)) {
      throw new Error("Offline data must contain a profiles list.");
    }
    if (data.profiles.length < 1 || data.profiles.length > PROFILE_LIMITS.maxProfiles) {
      throw new Error(`Offline data must contain 1 to ${PROFILE_LIMITS.maxProfiles} profiles.`);
    }
    const profiles = data.profiles.map(validateProfile);
    const identifiers = new Set(profiles.map(profile => profile.id));
    if (identifiers.size !== profiles.length) throw new Error("Profile IDs must be unique.");
    const activeProfileId = validateId(data.activeProfileId, "Active profile ID");
    if (!identifiers.has(activeProfileId)) throw new Error("The active profile does not exist.");
    return { version: 2, activeProfileId, profiles };
  }

  // Version 1 backups contained only semesters. They remain importable into
  // the current profile, while version 2 backups restore the full profile set.
  function validateImportedData(data) {
    if (isPlainObject(data) && Array.isArray(data.profiles)) {
      return { kind: "profiles", data: validateOfflineData(data) };
    }
    return { kind: "legacy-calculator", data: calculatorValidation.validateCalculatorData(data) };
  }

  function validateProgrammeList(data) {
    if (!Array.isArray(data) || data.length > PROFILE_LIMITS.maxProgrammeEntries) {
      throw new Error("The local programme catalogue is invalid.");
    }
    return data.map(item => {
      if (!isPlainObject(item)) throw new Error("Every programme must be an object.");
      const level = text(item.level, "Programme level", 20, true);
      if (!STUDY_LEVELS.includes(level)) throw new Error("Programme level is not approved.");
      const programNameBM = text(item.programNameBM ?? "", "Programme BM name", PROFILE_LIMITS.maxProgrammeLength);
      const programNameBI = text(item.programNameBI ?? "", "Programme BI name", PROFILE_LIMITS.maxProgrammeLength);
      if (!programNameBM && !programNameBI) throw new Error("A programme must have a BM or BI name.");
      const mode = text(item.mode, "Programme mode", 20, true);
      if (!PROGRAMME_MODES.includes(mode)) throw new Error("Programme mode is not approved.");
      return {
        level,
        faculty: text(item.faculty ?? "", "Programme faculty", PROFILE_LIMITS.maxFacultyLength),
        programCode: text(item.programCode ?? "", "Programme code", PROFILE_LIMITS.maxProgrammeCodeLength),
        programNameBM,
        programNameBI,
        accreditationCode: text(item.accreditationCode ?? "", "Accreditation code", 40),
        accreditationPeriod: text(item.accreditationPeriod ?? "", "Accreditation period", 100),
        accreditationBody: text(item.accreditationBody ?? "", "Accreditation body", 40),
        mode,
        source: text(item.source, "Programme source", 200, true),
        lastVerified: text(item.lastVerified, "Programme verification date", 20, true)
      };
    });
  }

  const { programmeName, programmeLabel, programmeKey, programmeFaculties, filterProgrammes } = programmeCatalog;

  return {
    STUDY_LEVELS,
    PROGRAMME_MODES,
    PROFILE_LIMITS,
    validateOfflineData,
    validateImportedData,
    validateProgrammeList,
    programmeName,
    programmeLabel,
    programmeKey,
    programmeFaculties,
    filterProgrammes
  };
});
