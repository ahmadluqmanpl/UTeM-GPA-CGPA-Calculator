const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createDataStore } = require("./dataStore");

test("desktop data survives a save and load, then can be cleared", async (t) => {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "utem-gpa-test-"));
  t.after(() => fs.rm(folder, { recursive: true, force: true }));

  const store = createDataStore(path.join(folder, "calculator-data.json"));
  const original = {
    version: 2,
    activeProfileId: "profile-one",
    profiles: [{
      id: "profile-one", studentName: "Student", matricNumber: "B0123456",
      studyLevel: "Degree", programme: "Manual programme", programmeCode: "",
      programmeFaculty: "", advisorName: "",
      semesters: [{ name: "Semester 1", subjects: [] }]
    }]
  };

  assert.equal(await store.load(), null);
  await store.save(original);
  assert.deepEqual(await store.load(), original);
  const updated = structuredClone(original);
  updated.profiles[0].studentName = "Updated Student";
  await store.save(updated);
  assert.deepEqual(await store.load(), updated);
  await store.clear();
  assert.equal(await store.load(), null);
});
