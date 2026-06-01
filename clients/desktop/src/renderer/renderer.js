const api = window.naiveBreeze;
const $ = (id) => document.getElementById(id);
const fields = {
  domain: $("domainInput"),
  username: $("usernameInput"),
  password: $("passwordInput"),
  protocol: $("protocolInput"),
  useSystemProxy: $("systemProxyInput")
};
let connectionState = "disconnected";
let toastTimer;

function profileFromFields() {
  return Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.type === "checkbox" ? input.checked : input.value]));
}
function fillFields(profile) {
  for (const [key, input] of Object.entries(fields)) {
    if (input.type === "checkbox") input.checked = profile[key] !== false;
    else input.value = profile[key] || "";
  }
  updateProfilePreview();
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2800);
}
function showError(error) {
  toast(error?.message || String(error));
}
function updateProfilePreview() {
  $("serverValue").textContent = fields.domain.value || "Not configured";
  $("routingValue").textContent = fields.useSystemProxy.checked ? "System proxy" : "Local proxy only";
  $("proxyStat").textContent = fields.useSystemProxy.checked ? "Enabled" : "Manual";
}
function renderState(payload) {
  connectionState = payload.state;
  const connected = payload.state === "connected";
  const connecting = payload.state === "connecting";
  $("signalOrbit").className = `signal-orbit ${connected ? "connected" : connecting ? "connecting" : ""}`;
  $("connectButton").className = `connect-button ${connected ? "disconnect" : ""}`;
  $("connectButton").disabled = connecting;
  $("stateEyebrow").textContent = connected ? "Protected desktop route" : connecting ? "Starting secure route" : "Ready when you are";
  $("stateTitle").textContent = connected ? "Connected" : connecting ? "Connecting..." : "Disconnected";
  $("stateDescription").textContent = connected
    ? `Compatible desktop traffic is using your private HTTPS tunnel through ${payload.domain || fields.domain.value}.`
    : connecting ? "Preparing the official engine and applying your local desktop proxy settings."
      : "Your traffic is using its normal route. Connect when you want a private desktop tunnel.";
  $("connectLabel").textContent = connected ? "Disconnect safely" : connecting ? "Connecting..." : "Connect securely";
}
function openImport() {
  $("importError").textContent = "";
  $("importLink").value = "";
  $("importModal").classList.add("open");
  $("importLink").focus();
}
function switchView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === name));
  $(`view-${name}`).classList.add("active");
  $("viewTitle").textContent = name === "home" ? "Connection" : name[0].toUpperCase() + name.slice(1);
}
function renderDiagnostics(checks) {
  $("diagnosticList").innerHTML = checks.map((check) => `<div class="check-row"><span class="check-state ${check.ok ? "ok" : "bad"}">${check.ok ? "✓" : "!"}</span><b>${check.name}</b><small>${check.detail}</small></div>`).join("");
}
function appendLog(entry) {
  const log = $("runtimeLog");
  if (log.textContent === "No activity yet.") log.textContent = "";
  log.textContent += `[${new Date(entry.at).toLocaleTimeString()}] ${entry.level.toUpperCase()}  ${entry.message}\n`;
  log.scrollTop = log.scrollHeight;
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
Object.values(fields).forEach((input) => input.addEventListener("input", updateProfilePreview));
$("showImport").addEventListener("click", openImport);
$("profileImportButton").addEventListener("click", openImport);
$("closeImport").addEventListener("click", () => $("importModal").classList.remove("open"));
$("importModal").addEventListener("click", (event) => { if (event.target === $("importModal")) $("importModal").classList.remove("open"); });
$("togglePassword").addEventListener("click", () => {
  fields.password.type = fields.password.type === "password" ? "text" : "password";
  $("togglePassword").textContent = fields.password.type === "password" ? "Show" : "Hide";
});
$("importButton").addEventListener("click", async () => {
  try {
    const profile = await api.parseImportLink($("importLink").value);
    fillFields(profile);
    await api.saveProfile(profile);
    $("importModal").classList.remove("open");
    toast("Private connection imported.");
  } catch (error) {
    $("importError").textContent = error.message;
  }
});
$("saveProfile").addEventListener("click", async () => {
  try {
    await api.saveProfile(profileFromFields());
    $("profileMessage").textContent = "Saved securely";
    toast("Profile saved securely.");
    setTimeout(() => $("profileMessage").textContent = "", 2500);
  } catch (error) { showError(error); }
});
$("connectButton").addEventListener("click", async () => {
  try {
    if (connectionState === "connected") await api.disconnect();
    else await api.connect(profileFromFields());
  } catch (error) { showError(error); }
});
$("runDiagnostics").addEventListener("click", async () => {
  $("runDiagnostics").disabled = true;
  $("runDiagnostics").textContent = "Checking...";
  try { renderDiagnostics(await api.runDiagnostics(profileFromFields())); }
  catch (error) { showError(error); }
  finally { $("runDiagnostics").disabled = false; $("runDiagnostics").textContent = "Run checks"; }
});
$("openDocs").addEventListener("click", () => api.openExternal("https://github.com/DarkPoesidon/naiveproxy"));
api.onConnectionState(renderState);
api.onEngineProgress((progress) => {
  $("engineLabel").textContent = progress.active ? `${progress.label} · ${progress.percent}%` : progress.label;
});
api.onLog(appendLog);

(async () => {
  fillFields(await api.loadProfile());
  const engine = await api.getEngineStatus();
  $("engineLabel").textContent = engine.installed ? engine.version || "Installed" : "Downloads on first connect";
  $("engineDot").classList.toggle("ready", engine.installed);
  const status = await api.getConnectionStatus();
  renderState(status);
  for (const entry of await api.getLogs()) appendLog(entry);
})();
