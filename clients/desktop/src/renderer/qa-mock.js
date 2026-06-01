if (new URLSearchParams(window.location.search).has("qa")) {
  window.naiveBreeze = {
    loadProfile: async () => ({ domain: "", username: "", password: "", protocol: "https", useSystemProxy: true }),
    saveProfile: async (profile) => profile,
    parseImportLink: async () => ({
      domain: "notes.example.com",
      username: "alex",
      password: "sample-password",
      protocol: "https",
      useSystemProxy: true
    }),
    getEngineStatus: async () => ({ installed: false, version: "" }),
    updateEngine: async () => ({ installed: true, version: "QA preview" }),
    getConnectionStatus: async () => ({ state: "disconnected", systemProxyEnabled: false }),
    connect: async () => ({ state: "connected" }),
    disconnect: async () => ({ state: "disconnected" }),
    runDiagnostics: async () => [
      { name: "Decoy website", ok: true, detail: "HTTPS response received" },
      { name: "NaiveProxy engine", ok: true, detail: "Official engine ready" },
      { name: "Local proxy", ok: true, detail: "127.0.0.1:8080 reachable" }
    ],
    getLogs: async () => [],
    onConnectionState: () => {},
    onEngineProgress: () => {},
    onLog: () => {},
    openExternal: async () => true
  };
}
