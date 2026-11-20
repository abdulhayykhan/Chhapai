import { contextBridge, ipcRenderer } from "electron";

export interface PrintParams {
  fileData: ArrayBuffer;
  copies: number;
  pages?: string;
  duplex: boolean;
  monochrome: boolean;
  paperSize?: string;
  printer?: string;
}

export interface ElectronAPI {
  getPrinters: () => Promise<string[]>;
  printPdf: (
    params: PrintParams,
  ) => Promise<{ success: boolean; error?: string }>;
  getVersion: () => Promise<string>;
  setAutostart: (enable: boolean) => Promise<boolean>;
  flashWindow: () => void;
  getStore: (key: string) => Promise<any>;
  setStore: (key: string, value: any) => Promise<void>;
  deleteStore: (key: string) => Promise<void>;
  getServerStatus: () => Promise<{
    isRunning: boolean;
    isEmbedded: boolean;
    port: number;
    tunnelUrl: string | null;
    error?: string;
  }>;
  openExternal: (url: string) => Promise<void>;
}

const electronAPI: ElectronAPI = {
  getPrinters: () => ipcRenderer.invoke("printers:list"),
  printPdf: (params: PrintParams) => ipcRenderer.invoke("print:pdf", params),
  getVersion: () => ipcRenderer.invoke("app:version"),
  setAutostart: (enable: boolean) =>
    ipcRenderer.invoke("autostart:set", enable),
  flashWindow: () => ipcRenderer.send("window:flash"),
  getStore: (key: string) => ipcRenderer.invoke("store:get", key),
  setStore: (key: string, value: any) =>
    ipcRenderer.invoke("store:set", key, value),
  deleteStore: (key: string) => ipcRenderer.invoke("store:delete", key),
  getServerStatus: () => ipcRenderer.invoke("server:status"),
  openExternal: (url: string) => ipcRenderer.invoke("app:openExternal", url),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
