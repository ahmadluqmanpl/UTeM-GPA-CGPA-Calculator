const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeIdentityText, uppercaseIdentityInput } = require("./identityText");

test("normalizes identity fields only at save/report boundaries", () => {
  assert.equal(normalizeIdentityText("  student   example  "), "STUDENT EXAMPLE");
  assert.equal(normalizeIdentityText(" b032410123 "), "B032410123");
  assert.equal(normalizeIdentityText("   "), "");
});

test("uppercases while typing without trimming spaces and preserves the cursor", () => {
  const input = {
    value: "ab  cd",
    selectionStart: 4,
    selectionEnd: 4,
    selectionDirection: "none",
    setSelectionRange(start, end, direction) {
      this.selectionStart = start;
      this.selectionEnd = end;
      this.selectionDirection = direction;
    }
  };

  assert.equal(uppercaseIdentityInput(input), "AB  CD");
  assert.equal(input.value, "AB  CD");
  assert.equal(input.selectionStart, 4);
  assert.equal(input.selectionEnd, 4);
});

test("preserves the logical cursor position when uppercase expands Unicode text", () => {
  const input = {
    value: "aßb",
    selectionStart: 2,
    selectionEnd: 2,
    selectionDirection: "none",
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    }
  };

  uppercaseIdentityInput(input);
  assert.equal(input.value, "ASSB");
  assert.equal(input.selectionStart, 3);
  assert.equal(input.selectionEnd, 3);
});
