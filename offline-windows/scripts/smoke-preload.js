const { contextBridge, ipcRenderer } = require("electron");

// The smoke test needs the same safe renderer boundary without touching real data.
let printCalls = 0;
contextBridge.exposeInMainWorld("calculator", {
  save: data => ipcRenderer.invoke("smoke:save", data),
  load: () => ipcRenderer.invoke("smoke:load"),
  clear: () => ipcRenderer.invoke("smoke:clear"),
  exportJson: async () => ({ ok: false, canceled: true }),
  importJson: async () => ({ ok: false, canceled: true }),
  listPrograms: () => ipcRenderer.invoke("smoke:programmes"),
  print: async () => { printCalls += 1; return { ok: true }; },
  smokeState: () => ({ printCalls })
});
