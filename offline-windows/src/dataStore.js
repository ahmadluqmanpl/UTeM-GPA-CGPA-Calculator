const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * Create the tiny local JSON store used by Electron.
 * Keeping file operations here makes them easy to test without opening a window.
 */
function createDataStore(filePath) {
  return {
    async save(data) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      const temporaryPath = `${filePath}.tmp`;
      await fs.writeFile(temporaryPath, JSON.stringify(data, null, 2), "utf8");
      await fs.rename(temporaryPath, filePath);
    },

    async load() {
      try {
        return JSON.parse(await fs.readFile(filePath, "utf8"));
      } catch (error) {
        if (error.code === "ENOENT") return null;
        throw error;
      }
    },

    async clear() {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  };
}

module.exports = { createDataStore };
