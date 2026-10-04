# Physeerlia - Seer Jellyfin Plugin

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Target: Jellyfin 10.9+](https://img.shields.io/badge/Jellyfin-10.9%2B-5271ff.svg)](https://jellyfin.org/)

**Physeerlia** is a native, zero-residue **Overseerr** and **Jellyseerr** ("Seer") integration plugin for [Jellyfin](https://jellyfin.org/). 

Browse trending media, discover new movies and TV shows, and request content directly inside the Jellyfin web client with full support for season/episode breakdown, per-user delegated permissions, rotating fanart backdrops, and an optional **Abyss-style frosted glass UI**.

---

## 🌟 Key Features

* **Native Client Experience**: Dedicated Seer entry in both the top toolbar and responsive hamburger drawer navigation on mobile and portrait views, automatically matching the active Jellyfin theme.
* **Dynamic In-Memory Web Injection**: Automatically serves the Seer web bundle into the Jellyfin web client using an ASP.NET Core `IStartupFilter`. Never modifies `index.html` on disk, works on read-only Docker containers, and survives Jellyfin updates.
* **Firewall & LAN Isolation (Zero WAN Exposure)**: Jellyfin acts as the reverse proxy to your internal Seer server (e.g. `http://localhost:5055` or `http://192.168.1.100:5055`). The Seer server does not need to be exposed to the internet.
* **Secure SSO & Per-User Permission Delegation**: 
  - Rejects unauthenticated traffic (HTTP 401).
  - Automatically identifies the logged-in Jellyfin user and resolves their Seer account.
  - Proxies requests using `X-API-User: <SeerUserId>`, strictly enforcing each user's individual Overseerr permissions, request limits, and quotas.
  - Non-admin users never gain admin rights in Seer.
* **Dynamic Fanart Backdrops**: Synchronizes rotating full-screen backdrop art with Jellyfin's native presentation style.
* **Frosted Glass UI (Abyss Style)**: Built-in toggle to adapt menus, cards, and modal dialogs with smooth translucent blurs matching the popular Abyss Jellyfin theme.
* **Full Mobile & Portrait Support**: Responsive layouts, touch-friendly modals, and drawer links that cleanly integrate with Android/iOS apps and mobile browsers.
* **Infinite Scroll Discovery**: Lightweight, memory-optimized lazy loading for trending and popular media catalogs.
* **Zero Residue**: Cleanly installed and uninstalled. Never modifies Jellyfin's database tables or internal library data. Automatically deletes its own configuration XML file on plugin uninstall.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│ PUBLIC / CLIENT ACCESS                                 │
│ Only Jellyfin Port 443 / 8096 Exposed                  │
└───────────────────────────┬────────────────────────────┘
                            │ (Authenticated Session)
┌───────────────────────────▼────────────────────────────┐
│ JELLYFIN SERVER (with Jellyfin.Plugin.Seer)            │
│ ├── In-Memory Web Injector (SeerIndexHtmlInjectionFilter)│
│ ├── Embedded Web Bundle (seer.bundle.js & css)         │
│ ├── Admin Configuration (Dashboard → Plugins → Seer)   │
│ └── Secured Proxy Controller (SeerProxyController)     │
│     ├── [Authorize] session validation                 │
│     ├── Jellyfin User -> Seer User Account Mapping     │
│     └── X-API-User header delegation                   │
└───────────────────────────┬────────────────────────────┘
                            │ (Internal Private LAN)
┌───────────────────────────▼────────────────────────────┐
│ OVERSEERR / JELLYSEERR (Internal IP: http://localhost:5055) │
│ [Port 5055 blocked by firewall from outside]           │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
jellyfin-plugin-seer/
├── src/
│   └── Jellyfin.Plugin.Seer/       # C# .NET Server Plugin
│       ├── Configuration/
│       │   ├── PluginConfiguration.cs # Settings model
│       │   └── configPage.html     # Dashboard settings UI
│       ├── Controllers/
│       │   └── SeerProxyController.cs # Authenticated reverse proxy with user mapping
│       ├── Middleware/
│       │   └── SeerIndexHtmlInjectionFilter.cs # In-memory web script injector
│       ├── Web/                    # Embedded web assets (seer.bundle.js/css)
│       ├── Plugin.cs               # Base plugin entry point & uninstall hook
│       └── PluginServiceRegistrator.cs # Dependency injection setup
├── web/                            # Standalone React + TypeScript frontend
│   ├── src/
│   │   ├── components/             # UI views (Discovery, Modals, Cards, etc.)
│   │   ├── services/               # seerApi.ts & permission bitmasks
│   │   ├── styles/                 # seer.scss (Abyss frosted glass & themes)
│   │   ├── types/                  # Data contracts
│   │   └── index.ts                # Route listener & DOM mounting
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts              # Bundles frontend into standalone IIFE library
├── build.sh                        # Automated build and packaging script
├── manifest.json                   # Jellyfin plugin repository manifest
├── meta.json                       # Plugin package metadata
├── LICENSE
└── README.md
```

---

## 🚀 Installation & Setup

### Option 1: Jellyfin Plugin Repository (Recommended)
1. Add the plugin repository URL to Jellyfin: **Dashboard → Plugins → Repositories → Add**.
2. Install **Seer Integration** from the **Catalog**.
3. Restart your Jellyfin server.

### Option 2: Manual Installation
1. Download `jellyfin-plugin-seer.zip` from releases or build locally.
2. Extract `Jellyfin.Plugin.Seer.dll` and `meta.json` into your Jellyfin `plugins/` directory:
   * **Linux**: `/var/lib/jellyfin/plugins/Seer/`
   * **Docker**: `<config_path>/plugins/Seer/`
   * **Windows**: `C:\ProgramData\Jellyfin\Server\plugins\Seer\`
3. Restart your Jellyfin server.

### Configuration
1. Log in to Jellyfin as an Administrator.
2. Navigate to **Dashboard → Plugins → Seer Integration**.
3. Configure the internal network address of your Overseerr/Jellyseerr instance (e.g. `http://localhost:5055` or `http://192.168.1.100:5055`) and your **Seer Admin API Key**.
4. Click **Save Configuration**.

---

## 🛠️ Building from Source

### Prerequisites
* **Node.js**: v20 or newer
* **.NET SDK**: v8.0 or newer

### Build Command
```bash
./build.sh
```
The build script automatically compiles the web bundle, compiles the C# plugin assembly, generates `jellyfin-plugin-seer.zip`, and updates the MD5 checksum in `manifest.json`.

---

## 📄 License & Attribution
 
This project is licensed under the **GNU General Public License v3.0** (GPL-3.0) - see the [LICENSE](LICENSE) file for details.
 
* **Free to Fork & Modify**: You are free to fork, modify, redistribute, and build upon this project.
* **Attribution Required**: Any distribution or derivative work (commercial or non-commercial) must preserve original author copyright notices, credit, and license statements.
* **Copyleft (Reciprocal Freedom)**: If you distribute modifications or derivative works (including as part of a commercial offering), your source code must also be made available under the same GPL-3.0 license. This ensures the project remains free and open for everyone.
