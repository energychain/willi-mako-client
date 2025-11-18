# ⚡ StackBlitz Configuration

Diese Konfiguration ermöglicht das sofortige Öffnen des **Web-Dashboards** in StackBlitz – einer ultraschnellen Browser-IDE, die komplett client-seitig läuft.

## 🚀 Quick Start

**Option 1: Direkter Link**

```
https://stackblitz.com/github/energychain/willi-mako-client
```

**Option 2: Badge im README**

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/energychain/willi-mako-client)

## 🎯 Was funktioniert in StackBlitz?

### ✅ Vollständig unterstützt:
- **Web-Dashboard Demo** (`examples/web-dashboard.ts`)
- TypeScript/JavaScript Editing
- npm install & npm run dev
- Browser-Preview
- Hot Module Replacement

### ⚠️ Eingeschränkt:
- CLI-Befehle (kein echtes Terminal)
- Sandbox-Jobs (benötigen Backend)
- Größere npm-Pakete (Speicher-Limits)

### ❌ Nicht unterstützt:
- `willi-mako` CLI direkt
- MCP Server
- Docker

## 💡 Ideal für:

- **Schnelle Web-UI-Demos** ohne Setup
- **Proof-of-Concept** mit Web-Dashboard
- **Code-Sharing** mit Kollegen
- **Prototyping** neuer Features

## 🔧 Konfiguration

Die Datei `.stackblitzrc` konfiguriert:
- Automatische Dependency-Installation
- Start-Command (`npm run dev`)
- Umgebungsvariablen (WILLI_MAKO_TOKEN)

## 📖 Weiterführend

Für vollständige SDK-Features nutze:
- [GitHub Codespaces](./CODESPACES_QUICKSTART.md) ⭐ Empfohlen
- [Gitpod](./GITPOD_QUICKSTART.md)
- [Lokale Installation](../README.md#installation)

---

**Hinweis:** StackBlitz ist optimiert für Frontend-Entwicklung. Für CLI-Tools und Backend-Funktionen nutze besser Codespaces oder Gitpod.
