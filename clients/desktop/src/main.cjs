const { app, BrowserWindow, ipcMain, safeStorage, shell } = require("electron");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const os = require("node:os");
const extract = require("extract-zip");

const execFileAsync = promisify(execFile);
const RELEASE_API = "https://api.github.com/repos/klzgrad/naiveproxy/releases/latest";
const LOCAL_HTTP_PORT = 8080;
const LOCAL_SOCKS_PORT = 1080;

let mainWindow;
let engineProcess;
let systemProxyEnabled = false;
let previousWindowsProxy;
let runtimeLog = [];

const userData = () => app.getPath("userData");
const profilePath = () => path.join(userData(), "profile.json");
const engineDir = () => path.join(userData(), "engine");
const runtimeConfigPath = () => path.join(userData(), "runtime-config.json");
const engineMetadataPath = () => path.join(engineDir(), "metadata.json");

function emit(channel, payload) {
  mainWindow?.webContents.send(channel, payload);
}

function addLog(message, level = "info") {
  const entry = { at: new Date().toISOString(), level, message };
  runtimeLog = [...runtimeLog.slice(-149), entry];
  emit("runtime:log", entry);
}

function serializeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function encrypt(value) {
  if (!value) return "";
  if (!safeStorage.isEncryptionAvailable()) return Buffer.from(value).toString("base64");
  return safeStorage.encryptString(value).toString("base64");
}

function decrypt(value) {
  if (!value) return "";
  const buffer = Buffer.from(value, "base64");
  if (!safeStorage.isEncryptionAvailable()) return buffer.toString();
  return safeStorage.decryptString(buffer);
}

function normalizeProfile(input) {
  const domain = String(input.domain || "").trim().toLowerCase();
  const username = String(input.username || "").trim();
  const password = String(input.password || "");
  const protocol = input.protocol === "quic" ? "quic" : "https";
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error("Enter a valid server domain.");
  if (!username) throw new Error("Enter your proxy username.");
  if (!password) throw new Error("Enter your proxy password.");
  return { domain, username, password, protocol, useSystemProxy: input.useSystemProxy !== false };
}

function parseImportLink(raw) {
  const value = String(raw || "").trim().replace(/^naive\+/, "");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Paste a valid naive+https:// connection link.");
  }
  if (!["https:", "quic:"].includes(parsed.protocol)) throw new Error("Only HTTPS and QUIC links are supported.");
  return normalizeProfile({
    domain: parsed.hostname,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    protocol: parsed.protocol.slice(0, -1),
    useSystemProxy: true
  });
}

async function saveProfile(input) {
  const profile = normalizeProfile(input);
  await fs.mkdir(userData(), { recursive: true });
  await fs.writeFile(profilePath(), JSON.stringify({
    domain: profile.domain,
    username: profile.username,
    encryptedPassword: encrypt(profile.password),
    protocol: profile.protocol,
    useSystemProxy: profile.useSystemProxy
  }, null, 2));
  return profile;
}

async function loadProfile() {
  try {
    const stored = JSON.parse(await fs.readFile(profilePath(), "utf8"));
    return {
      domain: stored.domain || "",
      username: stored.username || "",
      password: decrypt(stored.encryptedPassword || ""),
      protocol: stored.protocol || "https",
      useSystemProxy: stored.useSystemProxy !== false
    };
  } catch {
    return { domain: "", username: "", password: "", protocol: "https", useSystemProxy: true };
  }
}

function platformAssetPattern() {
  if (process.platform === "win32") return /-win-x64\.zip$/;
  if (process.platform === "darwin" && process.arch === "arm64") return /-mac-arm64-arm64\.tar\.xz$/;
  if (process.platform === "darwin") return /-mac-x64-x64\.tar\.xz$/;
  throw new Error("Desktop GUI currently supports Windows and macOS.");
}

function engineExecutablePath() {
  return path.join(engineDir(), process.platform === "win32" ? "naive.exe" : "naive");
}

async function getEngineMetadata() {
  try {
    return JSON.parse(await fs.readFile(engineMetadataPath(), "utf8"));
  } catch {
    return null;
  }
}

async function getEngineStatus() {
  const metadata = await getEngineMetadata();
  return {
    installed: fsSync.existsSync(engineExecutablePath()),
    version: metadata?.version || "",
    path: engineExecutablePath()
  };
}

async function downloadFile(url, outputPath, onProgress) {
  const response = await fetch(url, { headers: { "User-Agent": "Naive-Breeze" }, redirect: "follow" });
  if (!response.ok || !response.body) throw new Error(`Engine download failed: HTTP ${response.status}`);
  const total = Number(response.headers.get("content-length") || 0);
  let received = 0;
  const writer = fsSync.createWriteStream(outputPath);
  for await (const chunk of response.body) {
    writer.write(chunk);
    received += chunk.length;
    if (total) onProgress(Math.round((received / total) * 100));
  }
  await new Promise((resolve, reject) => {
    writer.end(resolve);
    writer.on("error", reject);
  });
}

async function ensureEngine(force = false) {
  const current = await getEngineStatus();
  if (current.installed && !force) return current;
  if (process.platform !== "win32") {
    throw new Error("macOS packaging support is scaffolded. Engine extraction is added with the signed macOS build.");
  }
  addLog("Checking the latest official NaiveProxy engine release.");
  emit("engine:progress", { active: true, percent: 3, label: "Checking official release" });
  const response = await fetch(RELEASE_API, { headers: { "User-Agent": "Naive-Breeze" } });
  if (!response.ok) throw new Error(`Could not check engine release: HTTP ${response.status}`);
  const release = await response.json();
  const asset = release.assets.find((item) => platformAssetPattern().test(item.name));
  if (!asset) throw new Error("No compatible official NaiveProxy engine was found for this computer.");

  await fs.mkdir(engineDir(), { recursive: true });
  const archivePath = path.join(engineDir(), asset.name);
  emit("engine:progress", { active: true, percent: 8, label: "Downloading secure engine" });
  await downloadFile(asset.browser_download_url, archivePath, (percent) => {
    emit("engine:progress", { active: true, percent: Math.max(8, percent), label: "Downloading secure engine" });
  });
  emit("engine:progress", { active: true, percent: 96, label: "Preparing engine" });
  await extract(archivePath, { dir: engineDir() });
  const extracted = await findFile(engineDir(), process.platform === "win32" ? "naive.exe" : "naive");
  if (!extracted) throw new Error("Downloaded archive did not contain the NaiveProxy engine.");
  if (extracted !== engineExecutablePath()) await fs.copyFile(extracted, engineExecutablePath());
  if (process.platform !== "win32") await fs.chmod(engineExecutablePath(), 0o755);
  await fs.writeFile(engineMetadataPath(), JSON.stringify({
    version: release.tag_name,
    downloadedAt: new Date().toISOString(),
    asset: asset.name
  }, null, 2));
  await fs.rm(archivePath, { force: true });
  emit("engine:progress", { active: false, percent: 100, label: "Engine ready" });
  addLog(`Official NaiveProxy engine ${release.tag_name} is ready.`);
  return getEngineStatus();
}

async function findFile(directory, fileName) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const result = await findFile(candidate, fileName);
      if (result) return result;
    } else if (entry.name.toLowerCase() === fileName.toLowerCase()) {
      return candidate;
    }
  }
  return null;
}

function encodeProxyUrl(profile) {
  return `${profile.protocol}://${encodeURIComponent(profile.username)}:${encodeURIComponent(profile.password)}@${profile.domain}`;
}

async function writeRuntimeConfig(profile) {
  const config = {
    listen: [`socks://127.0.0.1:${LOCAL_SOCKS_PORT}`, `http://127.0.0.1:${LOCAL_HTTP_PORT}`],
    proxy: encodeProxyUrl(profile)
  };
  await fs.writeFile(runtimeConfigPath(), JSON.stringify(config, null, 2));
}

function waitForPort(port, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const attempt = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port });
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() >= deadline) reject(new Error("Local proxy did not start in time."));
        else setTimeout(attempt, 250);
      });
    };
    attempt();
  });
}

async function configureSystemProxy(enable) {
  if (process.platform === "win32") {
    const key = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings";
    if (enable && !systemProxyEnabled) {
      previousWindowsProxy = {
        enabled: await readWindowsRegistryValue(key, "ProxyEnable"),
        server: await readWindowsRegistryValue(key, "ProxyServer")
      };
    }
    const args = enable
      ? [["add", key, "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", "1", "/f"],
         ["add", key, "/v", "ProxyServer", "/t", "REG_SZ", "/d", `127.0.0.1:${LOCAL_HTTP_PORT}`, "/f"]]
      : [["add", key, "/v", "ProxyEnable", "/t", "REG_DWORD", "/d", previousWindowsProxy?.enabled || "0", "/f"]];
    for (const command of args) await execFileAsync("reg.exe", command);
    if (!enable) {
      if (previousWindowsProxy?.server) {
        await execFileAsync("reg.exe", ["add", key, "/v", "ProxyServer", "/t", "REG_SZ", "/d", previousWindowsProxy.server, "/f"]);
      } else {
        await execFileAsync("reg.exe", ["delete", key, "/v", "ProxyServer", "/f"]).catch(() => {});
      }
      previousWindowsProxy = undefined;
    }
  } else if (process.platform === "darwin") {
    const { stdout } = await execFileAsync("networksetup", ["-listallnetworkservices"]);
    const services = stdout.split(/\r?\n/).filter((line) => line && !line.startsWith("*"));
    for (const service of services) {
      if (enable) {
        await execFileAsync("networksetup", ["-setwebproxy", service, "127.0.0.1", String(LOCAL_HTTP_PORT)]);
        await execFileAsync("networksetup", ["-setsecurewebproxy", service, "127.0.0.1", String(LOCAL_HTTP_PORT)]);
      } else {
        await execFileAsync("networksetup", ["-setwebproxystate", service, "off"]);
        await execFileAsync("networksetup", ["-setsecurewebproxystate", service, "off"]);
      }
    }
  }
  systemProxyEnabled = enable;
  addLog(enable ? "Desktop system proxy enabled." : "Desktop system proxy disabled.");
}

async function readWindowsRegistryValue(key, name) {
  try {
    const { stdout } = await execFileAsync("reg.exe", ["query", key, "/v", name]);
    const line = stdout.split(/\r?\n/).find((entry) => entry.includes(` ${name} `));
    const match = line?.match(/^\s+\S+\s+REG_\S+\s+(.*)$/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

async function stopEngine() {
  if (systemProxyEnabled) {
    try { await configureSystemProxy(false); } catch (error) { addLog(`Could not disable system proxy: ${serializeError(error)}`, "warning"); }
  }
  if (engineProcess && !engineProcess.killed) {
    engineProcess.kill();
    engineProcess = null;
    addLog("NaiveProxy engine stopped.");
  }
  emit("connection:state", { state: "disconnected" });
}

async function startEngine(profileInput) {
  if (engineProcess && !engineProcess.killed) return { state: "connected" };
  const profile = await saveProfile(profileInput);
  emit("connection:state", { state: "connecting" });
  addLog(`Connecting securely to ${profile.domain}.`);
  try {
    await ensureEngine();
    await writeRuntimeConfig(profile);
    engineProcess = spawn(engineExecutablePath(), [runtimeConfigPath()], {
      cwd: userData(),
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    engineProcess.stdout.on("data", (data) => addLog(data.toString().trim()));
    engineProcess.stderr.on("data", (data) => addLog(data.toString().trim(), "warning"));
    engineProcess.once("exit", (code) => {
      const expected = !engineProcess || engineProcess.killed;
      engineProcess = null;
      if (!expected) addLog(`NaiveProxy engine stopped unexpectedly with code ${code}.`, "error");
      emit("connection:state", { state: "disconnected" });
    });
    await waitForPort(LOCAL_HTTP_PORT);
    if (profile.useSystemProxy) await configureSystemProxy(true);
    emit("connection:state", { state: "connected", domain: profile.domain });
    addLog("Secure desktop connection is active.");
    return { state: "connected", domain: profile.domain };
  } catch (error) {
    await stopEngine();
    addLog(serializeError(error), "error");
    throw error;
  }
}

async function runDiagnostics(profileInput) {
  const profile = normalizeProfile(profileInput);
  const checks = [];
  const add = (name, ok, detail) => checks.push({ name, ok, detail });
  add("Profile", true, `${profile.protocol.toUpperCase()} connection to ${profile.domain}`);
  try {
    const result = await fetch(`https://${profile.domain}/`, { signal: AbortSignal.timeout(10000) });
    add("Decoy website", result.ok, result.ok ? "Normal HTTPS website is reachable" : `HTTP ${result.status}`);
  } catch (error) {
    add("Decoy website", false, serializeError(error));
  }
  const engine = await getEngineStatus();
  add("Desktop engine", engine.installed, engine.installed ? engine.version || "Installed" : "Download occurs on first connection");
  add("Local proxy", Boolean(engineProcess && !engineProcess.killed), engineProcess ? `HTTP 127.0.0.1:${LOCAL_HTTP_PORT}` : "Connect first to activate local routing");
  return checks;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 980,
    minHeight: 680,
    icon: path.join(__dirname, "..", "assets", "icon.png"),
    backgroundColor: "#07131d",
    titleBarStyle: "hidden",
    titleBarOverlay: { color: "#07131d", symbolColor: "#dce9f2", height: 40 },
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("profile:load", loadProfile);
  ipcMain.handle("profile:save", (_event, profile) => saveProfile(profile));
  ipcMain.handle("profile:parse", (_event, link) => parseImportLink(link));
  ipcMain.handle("engine:status", getEngineStatus);
  ipcMain.handle("engine:update", () => ensureEngine(true));
  ipcMain.handle("connection:start", (_event, profile) => startEngine(profile));
  ipcMain.handle("connection:stop", stopEngine);
  ipcMain.handle("connection:status", async () => ({ state: engineProcess ? "connected" : "disconnected", systemProxyEnabled }));
  ipcMain.handle("diagnostics:run", (_event, profile) => runDiagnostics(profile));
  ipcMain.handle("logs:get", async () => runtimeLog);
  ipcMain.handle("external:open", (_event, url) => shell.openExternal(url));
  createWindow();
});

app.on("window-all-closed", async () => {
  await stopEngine();
  app.quit();
});
