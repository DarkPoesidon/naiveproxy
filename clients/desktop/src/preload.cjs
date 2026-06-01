const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("naiveBreeze", {
  loadProfile: () => ipcRenderer.invoke("profile:load"),
  saveProfile: (profile) => ipcRenderer.invoke("profile:save", profile),
  parseImportLink: (link) => ipcRenderer.invoke("profile:parse", link),
  getEngineStatus: () => ipcRenderer.invoke("engine:status"),
  updateEngine: () => ipcRenderer.invoke("engine:update"),
  connect: (profile) => ipcRenderer.invoke("connection:start", profile),
  disconnect: () => ipcRenderer.invoke("connection:stop"),
  getConnectionStatus: () => ipcRenderer.invoke("connection:status"),
  runDiagnostics: (profile) => ipcRenderer.invoke("diagnostics:run", profile),
  getLogs: () => ipcRenderer.invoke("logs:get"),
  openExternal: (url) => ipcRenderer.invoke("external:open", url),
  onConnectionState: (callback) => ipcRenderer.on("connection:state", (_event, payload) => callback(payload)),
  onEngineProgress: (callback) => ipcRenderer.on("engine:progress", (_event, payload) => callback(payload)),
  onLog: (callback) => ipcRenderer.on("runtime:log", (_event, payload) => callback(payload))
});
