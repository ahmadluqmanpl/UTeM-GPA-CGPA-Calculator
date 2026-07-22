/**
 * Shared display and filtering helpers for the verified UTeM programme data.
 * The catalogue itself remains in shared/utemPrograms.json as the only source
 * that maintainers edit; both apps receive generated deployment copies.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.UTeMProgrammeCatalog = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function normalisedField(value) {
    return typeof value === "string" ? value.trim().toLocaleLowerCase("en") : "";
  }

  function programmeName(programme) {
    return programme.programNameBI || programme.programNameBM || "";
  }

  function programmeLabel(programme) {
    const name = programmeName(programme);
    return programme.programCode ? `${programme.programCode} - ${name}` : name;
  }

  // Programme codes can repeat across study modes, faculties, or records.
  function programmeKey(programme) {
    return [
      programme.level,
      programme.programCode,
      programme.mode,
      programme.faculty,
      programme.accreditationCode,
      programme.programNameBM
    ].map(value => typeof value === "string" ? value.trim() : "").join("::");
  }

  function compareProgrammes(left, right) {
    for (const field of ["level", "faculty", "programCode", "mode", "programNameBM"]) {
      const comparison = String(left[field] ?? "").localeCompare(String(right[field] ?? ""), "en", {
        sensitivity: "base",
        numeric: true
      });
      if (comparison) return comparison;
    }
    return programmeKey(left).localeCompare(programmeKey(right), "en", { sensitivity: "base", numeric: true });
  }

  function programmeFaculties(programmes, level) {
    return [...new Set(programmes
      .filter(programme => programme.level === level)
      .map(programme => typeof programme.faculty === "string" ? programme.faculty.trim() : "")
      .filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, "en", { sensitivity: "base", numeric: true }));
  }

  // There is deliberately no result limit. Each interface provides scrolling
  // and must expose every programme under the selected level and faculty.
  function filterProgrammes(programmes, level, query = "", faculty = "") {
    const search = normalisedField(query);
    const selectedFaculty = normalisedField(faculty);
    return programmes.filter(programme => {
      if (programme.level !== level) return false;
      if (selectedFaculty && normalisedField(programme.faculty) !== selectedFaculty) return false;
      if (!search) return true;
      return [
        programme.level,
        programme.faculty,
        programme.programCode,
        programme.programNameBM,
        programme.programNameBI,
        programme.accreditationCode,
        programme.mode
      ].some(value => normalisedField(value).includes(search));
    }).sort(compareProgrammes);
  }

  return { programmeName, programmeLabel, programmeKey, programmeFaculties, filterProgrammes };
});
