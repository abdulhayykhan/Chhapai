import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  safeStorage,
  shell,
  net,
} from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import {
  print as printPdfToPrinter,
  getPrinters as getSystemPrinters,
} from "pdf-to-printer";
import { serverManager } from "./serverManager";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Start embedded API and tunnel if not already running
    await serverManager.start();

    createWindow();
    createTray();
    setupIpcHandlers();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    title: "Chhapai (چھپائی) - Counter App",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
      backgroundThrottling: false,
    },
  });

  // Load renderer
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, "../renderer/index.html");
    mainWindow.loadFile(indexPath);
  }

  // Handle external links safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Minimize to tray on close
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createTray() {
  // Create simple 16x16 icon in memory if file not found
  const icon = nativeImage.createFromBuffer(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAA0SURBVDhPY/wPBAwUACYoTVsDGDFhGB2MGlAMkG0AOmbUACMGIAbQzQDG+v9gYMAwhv//AQBPjhkYjL2vCwAAAABJRU5ErkJggg==",
      "base64",
    ),
  );

  tray = new Tray(icon);
  tray.setToolTip("Chhapai Print Counter");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Chhapai Kholo (Show Window)",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: "separator" },
    {
      label: "Band Karein (Quit)",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// Secure local storage helper
function getConfigFilePath(): string {
  const userData = app.getPath("userData");
  if (!fs.existsSync(userData)) {
    fs.mkdirSync(userData, { recursive: true });
  }
  return path.join(userData, "chhapai-config.json");
}

function readStoredData(): Record<string, any> {
  try {
    const filePath = getConfigFilePath();
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function writeStoredData(data: Record<string, any>): void {
  try {
    const filePath = getConfigFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write stored data:", err);
  }
}

function setupIpcHandlers() {
  // 1. printers:list
  ipcMain.handle("printers:list", async () => {
    try {
      const printers = await getSystemPrinters();
      if (Array.isArray(printers) && printers.length > 0) {
        return printers.map((p: any) => (typeof p === "string" ? p : p.name));
      }
    } catch (err) {
      console.warn(
        "pdf-to-printer getPrinters failed, falling back to Electron webContents:",
        err,
      );
    }

    if (mainWindow) {
      try {
        const webPrinters = await mainWindow.webContents.getPrintersAsync();
        if (webPrinters.length > 0) {
          return webPrinters.map((p) => p.name);
        }
      } catch (err) {
        console.error("Failed to get webContents printers:", err);
      }
    }

    return ["Microsoft Print to PDF"];
  });

  // 2. print:pdf (Real pdf-to-printer / SumatraPDF integration)
  ipcMain.handle("print:pdf", async (_event, params) => {
    const tempDir = path.join(os.tmpdir(), "chhapai");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(
      tempDir,
      `print-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`,
    );

    try {
      if (!params.fileData || params.fileData.byteLength === 0) {
        throw new Error("Khali file data mila (Empty PDF data)");
      }

      const buffer = Buffer.from(params.fileData);
      fs.writeFileSync(tempFilePath, buffer);

      const printOptions: any = {
        silent: true,
        copies: params.copies || 1,
        monochrome: params.monochrome ?? true,
        side: params.duplex ? "duplexlong" : "simplex",
      };

      if (params.printer) {
        printOptions.printer = params.printer;
      }
      if (params.pages) {
        printOptions.pages = params.pages;
      }
      if (params.paperSize) {
        printOptions.paperSize = params.paperSize;
      }
      if (process.env.SUMATRAPDF_PATH && fs.existsSync(process.env.SUMATRAPDF_PATH)) {
        printOptions.sumatraPdfPath = process.env.SUMATRAPDF_PATH;
      }

      console.log("[PrintWorker Main] Printing via pdf-to-printer:", {
        printer: printOptions.printer,
        copies: printOptions.copies,
        pages: printOptions.pages,
        side: printOptions.side,
        monochrome: printOptions.monochrome,
        tempFile: tempFilePath,
      });

      await printPdfToPrinter(tempFilePath, printOptions);

      console.log(
        "[PrintWorker Main] Print command successfully delivered to Windows spooler.",
      );
      return { success: true };
    } catch (err: any) {
      console.error("[PrintWorker Main] pdf-to-printer execution error:", err);
      return {
        success: false,
        error:
          err?.message || "Print Windows spooler tak pohnchane me masla aya",
      };
    } finally {
      // Ensure temp PDF file is cleaned up from disk
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupErr) {
        console.warn(
          "[PrintWorker Main] Failed to clean up temp file:",
          cleanupErr,
        );
      }
    }
  });

  // 3. app:version
  ipcMain.handle("app:version", () => app.getVersion());

  // 4. autostart:set
  ipcMain.handle("autostart:set", (_event, enable: boolean) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enable,
        path: process.execPath,
      });
      return true;
    } catch {
      return false;
    }
  });

  // 5. window:flash
  ipcMain.on("window:flash", () => {
    if (mainWindow && !mainWindow.isFocused()) {
      mainWindow.flashFrame(true);
    }
  });

  // 6. Secure store:get
  ipcMain.handle("store:get", (_event, key: string) => {
    const store = readStoredData();
    const rawVal = store[key];
    if (rawVal === undefined || rawVal === null) return null;

    if (
      safeStorage.isEncryptionAvailable() &&
      typeof rawVal === "string" &&
      rawVal.startsWith("enc:")
    ) {
      try {
        const buffer = Buffer.from(rawVal.slice(4), "base64");
        return safeStorage.decryptString(buffer);
      } catch {
        return null;
      }
    }
    return rawVal;
  });

  // 7. Secure store:set
  ipcMain.handle("store:set", (_event, key: string, value: any) => {
    const store = readStoredData();
    if (
      typeof value === "string" &&
      safeStorage.isEncryptionAvailable() &&
      (key.includes("token") ||
        key.includes("password") ||
        key.includes("Secret"))
    ) {
      const encrypted = safeStorage.encryptString(value);
      store[key] = "enc:" + encrypted.toString("base64");
    } else {
      store[key] = value;
    }
    writeStoredData(store);
  });

  // 8. Secure store:delete
  ipcMain.handle("store:delete", (_event, key: string) => {
    const store = readStoredData();
    delete store[key];
    writeStoredData(store);
  });

  // 9. server:status
  ipcMain.handle("server:status", () => {
    return serverManager.getStatus();
  });

  // 10. app:openExternal
  ipcMain.handle("app:openExternal", (_event, url: string) => {
    if (typeof url === "string" && (url.startsWith("http:") || url.startsWith("https:"))) {
      return shell.openExternal(url);
    }
  });

  // 11. api:fetch (Main process native fetch - zero CORS/PNA restrictions)
  ipcMain.handle("api:fetch", async (_event, { url, options }) => {
    try {
      const fetchOpts: any = {
        method: options?.method || "GET",
        headers: options?.headers || {},
      };
      if (options?.body) {
        fetchOpts.body = options.body;
      }
      const res = await net.fetch(url, fetchOpts);
      const text = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      return {
        status: res.status,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries()),
        data,
        text,
      };
    } catch (err: any) {
      console.error("[Main net.fetch error]:", err);
      return {
        status: 0,
        ok: false,
        headers: {},
        data: null,
        text: err?.message || "Network request failed",
        error: err?.message || "Network request failed",
      };
    }
  });

  // 12. server:restart
  ipcMain.handle("server:restart", async () => {
    serverManager.stop();
    return await serverManager.start();
  });
}

app.on("before-quit", () => {
  isQuitting = true;
  serverManager.stop();
});
