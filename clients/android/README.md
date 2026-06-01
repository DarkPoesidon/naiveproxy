# Naive Breeze Android Setup

Naive Breeze Android is a beginner-facing setup companion. It converts the
server's `naive+https://...` link into a local sing-box JSON profile and opens
that profile in the maintained official
[sing-box for Android](https://sing-box.sagernet.org/clients/android/) VPN
client.

## Why The Android App Uses sing-box

Android VPN routing requires a `VpnService`, TUN handling, notifications, and
platform-specific lifecycle behavior. The official sing-box for Android client
already provides that maintained implementation. Since sing-box `1.13.0`, its
[Naive outbound](https://sing-box.sagernet.org/configuration/outbound/naive/)
is supported on Android.

## Beginner Workflow

1. Open Naive Breeze Android.
2. Select **Open official install page** and install sing-box for Android.
3. On the server, run `sudo naive-server client`.
4. Paste the printed `naive+https://...` link.
5. Select **Prepare and open VPN profile**.
6. Confirm the local profile import in sing-box for Android and start it there.

## Development

Build the debug APK on Windows:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
```

The generated APK is written to:

```text
app/build/outputs/apk/debug/app-debug.apk
```
