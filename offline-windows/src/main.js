const { app, BrowserWindow, dialog, ipcMain, session } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createDataStore } = require("./dataStore");
const { LIMITS } = require("./shared/dataValidation");
const {
  validateOfflineData,
  validateImportedData,
  validateProgrammeList
} = require("./shared/offlineProfiles");
const localProgrammes = require("./shared/utemPrograms.json");

const DATA_FILE = "calculator-data.json";
const RENDERER_PATH = path.join(__dirname, "renderer", "index.html");
const RENDERER_URL = pathToFileURL(RENDERER_PATH).href;
const WINDOW_ICON_PATH = path.join(__dirname, "..", "build", "icon.ico");
const dataPath = () => path.join(app.getPath("userData"), DATA_FILE);

// IPC requests are accepted only from this app's local calculator page.
function assertTrustedSender(event) {
  if (event.senderFrame?.url !== RENDERER_URL) throw new Error("Untrusted IPC sender.");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1240, height: 860, minWidth: 760, minHeight: 620,
    backgroundColor: "#f4f7f5",
    // Use the same bundled ICO as the installer and shortcuts so Windows uses
    // the project icon for the live app window and taskbar button as well.
    icon: WINDOW_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false
    }
  });
  win.loadFile(RENDERER_PATH);
  // Keep this offline-only window from navigating to or opening remote pages.
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", event => event.preventDefault());
  win.webContents.on("will-attach-webview", event => event.preventDefault());
}

// Files are saved in Electron's per-user app-data folder, never in source code.
ipcMain.handle("data:save", async (event, data) => {
  try {
    assertTrustedSender(event);
    await createDataStore(dataPath()).save(validateOfflineData(data));
    return { ok: true, path: dataPath() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("data:load", async (event) => {
  try {
    assertTrustedSender(event);
    const data = await createDataStore(dataPath()).load();
    return { ok: true, imported: data ? validateImportedData(data) : null };
  }
  catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("data:clear", async (event) => {
  try {
    assertTrustedSender(event);
    await createDataStore(dataPath()).clear();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("data:export", async (event, data) => {
  try {
    assertTrustedSender(event);
    const validated = validateOfflineData(data);
    const result = await dialog.showSaveDialog({
      title: "Export all local profiles", defaultPath: "utem-gpa-profiles.json",
      filters: [{ name: "JSON file", extensions: ["json"] }]
    });
    if (result.canceled) return { ok: false, canceled: true };
    await fs.writeFile(result.filePath, JSON.stringify(validated, null, 2), "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("data:import", async (event) => {
  try { assertTrustedSender(event); }
  catch { return { ok: false, error: "Import request was rejected." }; }
  const result = await dialog.showOpenDialog({
    title: "Import calculator data", properties: ["openFile"],
    filters: [{ name: "JSON file", extensions: ["json"] }]
  });
  if (result.canceled) return { ok: false, canceled: true };
  try {
    const filePath = result.filePaths[0];
    const information = await fs.stat(filePath);
    if (information.size > LIMITS.maxImportBytes) throw new Error("The file is too large.");
    const parsed = JSON.parse(await fs.readFile(filePath, "utf8"));
    return { ok: true, imported: validateImportedData(parsed) };
  } catch (error) {
    return { ok: false, error: `Invalid calculator file: ${error.message}` };
  }
});

ipcMain.handle("programmes:list", async (event) => {
  try {
    assertTrustedSender(event);
    // Programme choices are bundled with the app and validated before they
    // cross the preload boundary. No runtime download or network request occurs.
    return { ok: true, programmes: validateProgrammeList(localProgrammes) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle("report:print", async (event) => {
  try { assertTrustedSender(event); }
  catch { return { ok: false, error: "Print request was rejected." }; }
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { ok: false, error: "The calculator window is unavailable." };
  return new Promise((resolve) => win.webContents.print({ printBackground: true },
    (success, failureReason) => resolve({ ok: success, error: failureReason })));
});

app.whenReady().then(() => {
  // This calculator needs no camera, location, notifications, USB, or other
  // privileged browser capabilities, so every permission request is denied.
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  createWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
