# Naive Breeze Desktop

Cross-platform NaiveProxy desktop GUI for Windows and macOS.

The first packaged release is a Windows portable app. The shared interface,
official Intel and Apple Silicon engine extraction, and macOS system-proxy
adapter are included. A distributable macOS build still needs to be produced
and signed on a Mac.

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

## macOS Build

Run this command on macOS:

```bash
npm run package:mac
```

The app downloads the matching official Intel or Apple Silicon engine archive
on first connection and restores the previous macOS web-proxy settings after a
normal disconnect. Apple signing and notarization are still required before
publishing the DMG to end users.
