# Naive Breeze Desktop

Cross-platform NaiveProxy desktop GUI for Windows and macOS.

The first release is a Windows portable app. The shared interface and macOS
system-proxy adapter are already present, but macOS packaging is not ready for
users yet.

## Beginner Workflow

1. On your server, run `sudo naive-server client`.
2. Copy the printed `naive+https://...` link.
3. Open Naive Breeze and select **Import connection link**.
4. Paste the link and select **Import securely**.
5. Select **Connect securely**.

The password is stored locally using Electron secure storage. When desktop
routing is enabled, Naive Breeze restores the previous Windows proxy settings
after a normal disconnect.

## Development

```bash
npm install
npm run check
npm start
```

## Windows Portable Build

```bash
npm run package:win
```

The app downloads the current official Windows NaiveProxy engine from
`klzgrad/naiveproxy` on first connection. It starts local SOCKS5 port `1080` and
HTTP proxy port `8080`. When desktop routing is enabled, Windows system proxy
settings point compatible applications to the local HTTP proxy.

The generated portable executable is written to:

```text
dist/Naive-Breeze-0.1.0-Windows-Portable.exe
```

## macOS Status

The shared interface and system-proxy abstraction are included. A signed macOS
package still needs the macOS engine extraction path and Apple signing workflow
before release.
