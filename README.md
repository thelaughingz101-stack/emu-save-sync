<p align="center">
  <img src="docs/screenshots/Banner.png" alt="Emu-Save-Sync" width="100%" />
</p>

<h1 align="center">Emu-Save-Sync</h1>

<p align="center">
  Cross-platform emulator save file sync — powered by Syncthing.
</p>

<p align="center">
  <a href="https://github.com/thelaughingz101-stack/emu-save-sync/releases/latest">
    <img alt="Download" src="https://img.shields.io/github/v/release/thelaughingz101-stack/emu-save-sync?label=download&style=flat-square" />
  </a>
  <img alt="License" src="https://img.shields.io/github/license/thelaughingz101-stack/emu-save-sync?style=flat-square" />
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blueviolet?style=flat-square" />
</p>

---

Emu-Save-Sync is a desktop app that automatically syncs your emulator save files across devices. It wraps [Syncthing](https://syncthing.net) — a proven peer-to-peer sync engine — so your saves move directly between your machines without touching any cloud server. Toggle sync on or off per emulator, pair a recipient device with a single ID, and let it run in the background while you play.

![Emu-Save-Sync UI](docs/screenshots/app-main.png)

---

## Prerequisites

**Syncthing must be installed and running before you open Emu-Save-Sync.** The app communicates with Syncthing's local API at `http://localhost:8384` — if Syncthing isn't running, the app will show a banner and offer to launch it for you, but Syncthing itself must already be installed.

Download Syncthing: https://syncthing.net/downloads/

---

## Supported Emulators

| Emulator | Save Sync | Status |
|----------|-----------|--------|
| PCSX2 | Saves + Memory Cards | v1.0 |

---

## Install

### Windows

1. Download `emu-save-sync-1.0.0-setup.exe` from the [latest release](https://github.com/thelaughingz101-stack/emu-save-sync/releases/latest)
2. Run the installer
3. Launch **Emu-Save-Sync** from the desktop shortcut or Start menu

### Linux

1. Download `emu-save-sync-1.0.0.AppImage` from the [latest release](https://github.com/thelaughingz101-stack/emu-save-sync/releases/latest)
2. Make it executable and run it:

```bash
chmod +x emu-save-sync-1.0.0.AppImage
./emu-save-sync-1.0.0.AppImage
```

---

## How It Works

Emu-Save-Sync talks to a locally running Syncthing instance through its REST API. When you toggle sync on for an emulator, the app registers that emulator's save folder with Syncthing and shares it with any paired devices. Syncthing handles the actual file transfer directly between your machines over your local network or the internet — no intermediary server involved. Sync pauses automatically while the emulator is running to prevent conflicts.

---

## Credits

See [CREDITS.md](CREDITS.md) for third-party attributions.