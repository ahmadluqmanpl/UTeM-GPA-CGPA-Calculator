const { contextBridge, ipcRenderer } = require("electron");

// Expose only the operations the renderer needs. No filesystem or Node.js
// object is passed into the unprivileged page.
contextBridge.exposeInMainWorld("calculator", Object.freeze({
  save: (data) => ipcRenderer.invoke("data:save", data),
  load: () => ipcRenderer.invoke("data:load"),
  clear: () => ipcRenderer.invoke("data:clear"),
  exportJson: (data) => ipcRenderer.invoke("data:export", data),
  importJson: () => ipcRenderer.invoke("data:import"),
  listPrograms: () => ipcRenderer.invoke("programmes:list"),
  print: () => ipcRenderer.invoke("report:print")
}));
