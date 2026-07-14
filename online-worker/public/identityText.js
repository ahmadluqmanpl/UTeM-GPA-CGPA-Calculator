/**
 * Shared identity-field normalization for offline profiles and local reports.
 * Typing changes case only; storage/report boundaries also trim and collapse
 * whitespace so the user's cursor is never moved by formatting spaces.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.IdentityText = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function uppercaseIdentityText(value) {
    return typeof value === "string" ? value.toUpperCase() : "";
  }

  function normalizeIdentityText(value) {
    return uppercaseIdentityText(value).trim().replace(/\s+/g, " ");
  }

  function uppercaseIdentityInput(inputElement) {
    const original = typeof inputElement?.value === "string" ? inputElement.value : "";
    const uppercased = uppercaseIdentityText(original);
    if (uppercased === original) return uppercased;

    const start = inputElement.selectionStart;
    const end = inputElement.selectionEnd;
    const direction = inputElement.selectionDirection;
    inputElement.value = uppercased;

    if (Number.isInteger(start) && Number.isInteger(end) && typeof inputElement.setSelectionRange === "function") {
      // Unicode uppercase can expand a character, so map both offsets through
      // the same conversion instead of assuming the text length is unchanged.
      const mappedStart = uppercaseIdentityText(original.slice(0, start)).length;
      const mappedEnd = uppercaseIdentityText(original.slice(0, end)).length;
      inputElement.setSelectionRange(mappedStart, mappedEnd, direction || "none");
    }
    return uppercased;
  }

  return { normalizeIdentityText, uppercaseIdentityInput, uppercaseIdentityText };
});
