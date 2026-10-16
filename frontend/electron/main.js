/**
 * Electron Main Process — Qatar Visa Bot Desktop App
 *
 * Uses Electron's built-in protocol API to serve static Next.js files.
 * No external packages required.
 */

const { app, BrowserWindow, shell, dialog, protocol, net } = require("electron");
const { spawn, execSync } = require("child_process");
const { pathToFileURL } = require("url");
const path = require("path");
const http = require("http");
const fs = require("fs");

const BACKEND_PORT = 8000;

let mainWindow;
let backendProcess;

// ─── Register custom scheme BEFORE app is ready ───────────────────
// This makes app:// behave like https:// (secure, standard, supports fetch)
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { secure: true, standard: true, supportFetchAPI: true },
  },
]);

// ─── Static files location ────────────────────────────────────────
const outDir = path.join(__dirname, "..", "out");
const hasStaticBuild = fs.existsSync(outDir);

// ─── Resolve paths (packaged vs dev) ─────────────────────────────
function getPaths() {
  if (app.isPackaged) {
    return {
      backendDir:  path.join(process.resourcesPath, "backend"),
      pythonExe:   path.join(process.resourcesPath, "python-bundle", "python.exe"),
      browsersDir: path.join(process.resourcesPath, "playwright-browsers"),
    };
  }
  const frontendDir = path.join(__dirname, "..");
  const bundleExe   = path.join(frontendDir, "python-bundle", "python.exe");
  const browsersDir = path.join(frontendDir, "playwright-browsers");
  return {
    backendDir:  path.join(frontendDir, "..", "backend"),
    pythonExe:   fs.existsSync(bundleExe) ? bundleExe : findSystemPython(),
    browsersDir: fs.existsSync(browsersDir) ? browsersDir : null,
  };
}

// ─── Find system Python (dev fallback) ───────────────────────────
function findSystemPython() {
  const username = process.env.USERNAME || process.env.USER || "";
  const candidates = [
    "python",
    "python3",
    "C:\\Program Files\\Python312\\python.exe",
    "C:\\Program Files\\Python311\\python.exe",
    "C:\\Program Files\\Python310\\python.exe",
    `C:\\Users\\${username}\\AppData\\Local\\Programs\\Python\\Python312\\python.exe`,
    `C:\\Users\\${username}\\AppData\\Local\\Programs\\Python\\Python311\\python.exe`,
  ];
  for (const c of candidates) {
    try { execSync(`"${c}" --version`, { stdio: "pipe" }); return c; } catch {}
  }
  return null;
}

// ─── Wait for backend port ────────────────────────────────────────
function waitForPort(port, maxRetries = 90) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryConnect = () => {
      const req = http.request(
        { host: "127.0.0.1", port, path: "/", method: "GET" },
        (res) => { res.resume(); resolve(); }
      );
      req.on("error", () => {
        if (++attempts >= maxRetries) {
          reject(new Error(`Backend did not start within ${maxRetries} seconds.`));
          return;
        }
        setTimeout(tryConnect, 1000);
      });
      req.end();
    };
    tryConnect();
  });
}

// ─── Start Python backend ─────────────────────────────────────────
function startBackend(pythonExe, backendDir, browsersDir) {
  const env = { ...process.env };
  if (browsersDir) env.PLAYWRIGHT_BROWSERS_PATH = browsersDir;

  console.log(`[Backend] Python:   ${pythonExe}`);
  console.log(`[Backend] Dir:      ${backendDir}`);
  console.log(`[Backend] Browsers: ${browsersDir || "system default"}`);

  backendProcess = spawn(
    pythonExe,
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", String(BACKEND_PORT)],
    { cwd: backendDir, stdio: "pipe", env }
  );
  backendProcess.stdout.on("data", (d) => process.stdout.write("[Backend] " + d));
  backendProcess.stderr.on("data", (d) => process.stderr.write("[Backend] " + d));
  backendProcess.on("exit", (code) => console.log("[Backend] Exited:", code));
}

// ─── Register app:// protocol handler ────────────────────────────
function registerProtocol() {
  protocol.handle("app", (request) => {
    // Strip scheme and hostname: app://-/some/path → /some/path
    let filePath = request.url.slice("app://".length);
    filePath = filePath.replace(/^[^/]*/, "");         // remove hostname
    filePath = decodeURIComponent(filePath);
    filePath = filePath.split("?")[0];                 // strip query string
    filePath = filePath.split("#")[0];                 // strip hash

    // Map "/" → "/index.html"
    if (!filePath || filePath === "/") filePath = "/index.html";

    let absPath = path.join(outDir, filePath);

    // If it's a directory, serve its index.html
    try {
      if (fs.existsSync(absPath) && fs.statSync(absPath).isDirectory()) {
        absPath = path.join(absPath, "index.html");
      }
    } catch {}

    // Fallback: serve root index.html (SPA catch-all)
    if (!fs.existsSync(absPath)) {
      absPath = path.join(outDir, "index.html");
    }

    return net.fetch(pathToFileURL(absPath).toString());
  });
}

// ─── Create the desktop window ────────────────────────────────────
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "Qatar Visa Bot",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (hasStaticBuild) {
    mainWindow.loadURL("app://-/index.html");
  } else {
    // Dev fallback: no static build found, load Next.js dev server
    console.log("[Electron] No static build — loading localhost:3000");
    mainWindow.loadURL("http://localhost:3000");
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

// ─── Cleanup ──────────────────────────────────────────────────────
function killProcesses() {
  if (backendProcess) { backendProcess.kill(); backendProcess = null; }
}

// ─── App lifecycle ────────────────────────────────────────────────
app.whenReady().then(async () => {
  // Register file-serving protocol
  if (hasStaticBuild) registerProtocol();

  const { backendDir, pythonExe, browsersDir } = getPaths();

  if (!pythonExe) {
    dialog.showErrorBox(
      "Python Not Found",
      "Qatar Visa Bot could not find Python.\n\nPlease reinstall the application."
    );
    app.quit();
    return;
  }

  startBackend(pythonExe, backendDir, browsersDir);

  console.log("[Electron] Waiting for backend...");
  try {
    await waitForPort(BACKEND_PORT);
    console.log("[Electron] Backend ready — opening window.");
    await createWindow();
  } catch (err) {
    dialog.showErrorBox(
      "Qatar Visa Bot — Startup Error",
      `Failed to start the backend:\n\n${err.message}\n\nPlease reinstall the application.`
    );
    killProcesses();
    app.quit();
  }
});

app.on("window-all-closed", () => { killProcesses(); app.quit(); });
app.on("before-quit", () => { killProcesses(); });
