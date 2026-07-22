/**
 * Local-only Android profile store built on the Capacitor Filesystem plugin.
 *
 * SECURITY BOUNDARY
 * - The calculator profile is stored only inside the app's private
 *   Directory.Data sandbox on the device. No network calls, remote servers,
 *   or third-party backends are involved.
 * - This module never uses innerHTML, outerHTML, HTML parsing, eval(), or
 *   new Function(). Data moves strictly as JSON strings and plain objects.
 * - Callers must validate data with shared/dataValidation.js before saving
 *   and after loading, so only schema-conforming values are persisted.
 *
 * The page CSP is script-src 'self', so this classic script registers the
 * Filesystem plugin from the bundled local filesystem-plugin.js UMD (which
 * exposes window.capacitorFilesystemPluginCapacitor and self-registers the
 * native proxy on the Capacitor bridge). When no native plugin is present
 * (a plain desktop browser during smoke testing), it falls back to a volatile
 * in-memory object — never localStorage/sessionStorage/IndexedDB — so the
 * offline privacy guarantee (no permanent browser storage) stays intact.
 */
const PROFILE_FILE = "calculator-data.json";
const capacitor = globalThis.Capacitor;

// Directory.Data and Encoding.UTF8 are the fixed string enums Capacitor maps
// to the native Android sandbox paths and UTF-8 file encoding.
const DATA_DIRECTORY = "DATA";
const UTF8 = "utf8";

// Volatile in-memory fallback used only when the native Filesystem plugin is
// unavailable (e.g. opening the page in a desktop browser for smoke testing).
// Nothing is persisted to disk, localStorage, sessionStorage, cookies, or
// IndexedDB; data disappears when the page reloads, matching the privacy model.
const memoryStore = new Map();

function memoryStoreAdapter() {
  return {
    writeFile: ({ path, data }) => { memoryStore.set(path, String(data)); return Promise.resolve(); },
    readFile: ({ path }) => {
      if (!memoryStore.has(path)) return Promise.reject(new Error(`File does not exist: ${path}`));
      return Promise.resolve({ data: memoryStore.get(path) });
    },
    deleteFile: ({ path }) => { memoryStore.delete(path); return Promise.resolve(); }
  };
}

// The bundled UMD registers the native Filesystem proxy on Capacitor.Plugins.
// Prefer that on Android; otherwise use the in-memory adapter so the store
// still resolves in a desktop browser without touching permanent storage.
const pluginGlobal = globalThis.capacitorFilesystemPluginCapacitor;
const Filesystem = (pluginGlobal && pluginGlobal.Filesystem)
  || (capacitor && capacitor.Plugins && capacitor.Plugins.Filesystem)
  || memoryStoreAdapter();

/** Write the validated calculator profile as JSON to the private data directory. */
async function saveProfile(data) {
  await Filesystem.writeFile({
    path: PROFILE_FILE,
    data: JSON.stringify(data, null, 2),
    directory: DATA_DIRECTORY,
    encoding: UTF8,
    recursive: true
  });
}

/**
 * Read the stored calculator profile.
 * Returns the parsed object, or null when no profile has been saved yet.
 * Parse errors are re-thrown so callers can reject corrupted local data.
 */
async function loadProfile() {
  try {
    const result = await Filesystem.readFile({
      path: PROFILE_FILE,
      directory: DATA_DIRECTORY,
      encoding: UTF8
    });
    const text = typeof result.data === "string" ? result.data : await result.data.text();
    return JSON.parse(text);
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

/** Delete the stored calculator profile, ignoring a missing file. */
async function clearProfile() {
  try {
    await Filesystem.deleteFile({
      path: PROFILE_FILE,
      directory: DATA_DIRECTORY
    });
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }
}

/**
 * Capacitor rejects with an Error whose message names the missing file when
 * a path does not exist; there is no stable error code like ENOENT on web.
 */
function isNotFoundError(error) {
  const message = String(error && error.message ? error.message : error).toLowerCase();
  return message.includes("does not exist") || message.includes("not found");
}

// Classic-script surface used by renderer.js under the script-src 'self' CSP.
globalThis.AndroidStore = Object.freeze({ saveProfile, loadProfile, clearProfile });
