import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("snapratio", {
  capture: (rect: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke("capture", rect),
  getDisplayInfo: () => ipcRenderer.invoke("get-display-info"),
  switchDisplay: () => ipcRenderer.invoke("switch-display"),
  quit: () => ipcRenderer.invoke("quit"),
});
