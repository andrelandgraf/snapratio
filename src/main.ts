import {
  app,
  BrowserWindow,
  screen,
  ipcMain,
  Notification,
  systemPreferences,
  dialog,
  shell,
} from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

app.setName("SnapRatio");

function distPath(...parts: string[]) {
  return path.join(app.getAppPath(), "dist", ...parts);
}

let mainWindow: BrowserWindow | null = null;
let currentDisplayIndex = 0;

function getDisplays() {
  return screen.getAllDisplays().sort((a, b) => {
    if (a.bounds.x !== b.bounds.x) return a.bounds.x - b.bounds.x;
    return a.bounds.y - b.bounds.y;
  });
}

function moveToDisplay(index: number) {
  const displays = getDisplays();
  currentDisplayIndex =
    ((index % displays.length) + displays.length) % displays.length;
  const display = displays[currentDisplayIndex];

  if (!mainWindow) return;

  mainWindow.setBounds({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
  });
}

function createWindow() {
  const displays = getDisplays();
  const cursorPoint = screen.getCursorScreenPoint();
  const cursorDisplay = screen.getDisplayNearestPoint(cursorPoint);
  currentDisplayIndex = displays.findIndex((d) => d.id === cursorDisplay.id);
  if (currentDisplayIndex === -1) currentDisplayIndex = 0;

  const display = displays[currentDisplayIndex];

  mainWindow = new BrowserWindow({
    title: "SnapRatio",
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreenable: false,
    webPreferences: {
      preload: distPath("preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(true, "screen-saver");

  mainWindow.loadFile(distPath("renderer", "index.html"));
}

async function checkScreenPermission(): Promise<boolean> {
  const status = systemPreferences.getMediaAccessStatus("screen");
  if (status === "granted") return true;

  const { response } = await dialog.showMessageBox({
    type: "warning",
    title: "SnapRatio needs Screen Recording",
    message: "Screen Recording permission may not be granted yet.",
    detail:
      "If you already enabled it, click Continue. Otherwise, open Settings to grant access, then relaunch.",
    buttons: ["Continue Anyway", "Open Settings", "Quit"],
    defaultId: 0,
  });

  if (response === 1) {
    shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
    );
    app.quit();
    return false;
  }

  if (response === 2) {
    app.quit();
    return false;
  }

  return true;
}

app.whenReady().then(async () => {
  const hasPermission = await checkScreenPermission();
  if (hasPermission) createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.handle("get-display-info", () => {
  const displays = getDisplays();
  return {
    displayCount: displays.length,
    currentIndex: currentDisplayIndex,
    scaleFactor: displays[currentDisplayIndex].scaleFactor,
  };
});

ipcMain.handle("switch-display", () => {
  const displays = getDisplays();
  if (displays.length <= 1) return { switched: false, displayCount: 1 };
  moveToDisplay(currentDisplayIndex + 1);
  return {
    switched: true,
    displayCount: displays.length,
    currentIndex: currentDisplayIndex,
    scaleFactor: displays[currentDisplayIndex].scaleFactor,
  };
});

ipcMain.handle(
  "capture",
  async (
    _event,
    {
      x,
      y,
      width,
      height,
    }: { x: number; y: number; width: number; height: number }
  ) => {
    if (!mainWindow) return { success: false, error: "No window" };

    const winBounds = mainWindow.getBounds();
    const screenX = Math.round(winBounds.x + x);
    const screenY = Math.round(winBounds.y + y);
    const w = Math.round(width);
    const h = Math.round(height);

    mainWindow.hide();
    await new Promise((resolve) => setTimeout(resolve, 400));

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `snapratio-${timestamp}.png`;
    const filepath = path.join(os.homedir(), "Desktop", filename);

    try {
      const { stderr } = await execAsync(
        `/usr/sbin/screencapture -x -R${screenX},${screenY},${w},${h} "${filepath}"`
      );

      if (stderr && stderr.trim().length > 0) {
        mainWindow.show();
        mainWindow.focus();
        return { success: false, error: stderr.trim() };
      }

      new Notification({
        title: "SnapRatio",
        body: `Saved to Desktop/${filename}`,
      }).show();

      setTimeout(() => app.quit(), 600);

      return { success: true, filepath };
    } catch (err) {
      mainWindow.show();
      mainWindow.focus();
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }
);

ipcMain.handle("quit", () => {
  app.quit();
});
