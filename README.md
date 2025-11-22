# 🔌 Willi-Mako Client SDK

<div align="center">

[![npm version](https://img.shields.io/npm/v/willi-mako-client)](https://www.npmjs.com/package/willi-mako-client)
[![CI](https://github.com/energychain/willi-mako-client/actions/workflows/ci.yml/badge.svg)](https://github.com/energychain/willi-mako-client/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/energychain/willi-mako-client/branch/main/graph/badge.svg)](https://codecov.io/gh/energychain/willi-mako-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/energychain/willi-mako-client)
[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/energychain/willi-mako-client)
[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/energychain/willi-mako-client)

[![All Contributors](https://img.shields.io/github/all-contributors/energychain/willi-mako-client?color=ee8449)](#contributors)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/energychain?logo=github&color=pink)](https://github.com/sponsors/energychain)
[![Community](https://img.shields.io/badge/Community-Join%20Us-blue)](./COMMUNITY.md)

**Offizielles TypeScript SDK & CLI für die AI-Plattform [Willi-Mako](https://stromhaltig.de) von STROMDAO GmbH.**

[📚 Documentation](./docs/) • [🎯 Use Cases](./docs/USE_CASE_GALLERY.md) • [🤝 Community](./COMMUNITY.md) • [💚 Sponsor](./docs/SPONSORSHIP.md) • [🏆 Certification](./docs/CERTIFICATION.md)

</div>

> **Kurzüberblick (DE):** Willi-Mako ist die KI-gestützte Wissensplattform für die deutsche Energiewirtschaft. Das SDK vereint Marktkommunikation (EDIFACT, UTILMD, MSCONS), Regulierung (BNetzA, EnWG, §14a EnWG), Netzbetrieb (TAB, SAIDI/SAIFI) und wissenschaftliche Studien für ganzheitliche ETL-Pipelines, Compliance-Automatisierung und KI-gestützte Workflows.

---

## 📚 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
  - [Local SDK Quickstart](#local-sdk-quickstart)
  - [Docker Quickstart](#docker-quickstart)
  - [MCP Server Quickstart](#mcp-server-quickstart)
  - [Lightweight Web UI Quickstart](#lightweight-web-ui-quickstart)
  - [☁️ Cloud IDE Quickstarts](#️-cloud-ide-quickstarts)
    - [GitHub Codespaces](#github-codespaces-recommended)
    - [Gitpod](#gitpod)
    - [StackBlitz](#stackblitz-web-dashboard-only)
- [Core Use Cases](#-core-use-cases)
- [API Overview](#-api-overview)
- [CLI Usage](#-cli-usage)
- [Examples](#-examples)
- [Documentation](#-documentation)
- [Community](#-community)
- [Development](#-development)
  - [CI/CD Pipeline](#cicd-pipeline)
- [Integrations (Docker, Power BI, n8n)](#-integrations-docker-power-bi-n8n)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

---

## 🌍 About the Project

**Willi-Mako** ist die Wissens- und Automatisierungsplattform für Marktkommunikation (*MaKo*) und ganzheitliche Energiewirtschafts-Expertise. Ab Version 0.8.0 erweitert die Plattform ihre Positionierung von reiner Marktkommunikation zu umfassender Energiewirtschafts-Kompetenz, die neben EDIFACT-Standards nun auch wissenschaftliche Studien, regulatorische Veröffentlichungen (BNetzA, BDEW, VKU) und Asset Management für Netzbetreiber abdeckt.

Sie unterstützt Marktrollen wie **Lieferanten**, **Netzbetreiber** und **Messstellenbetreiber** bei Aufgaben rund um:

- 📊 **Marktkommunikation**: edi@energy-Standards (UTILMD, MSCONS, ORDERS, PRICAT, INVOIC), GPKE, WiM, GeLi Gas
- ⚖️ **Regulierung**: EnWG, StromNEV, ARegV, §14a EnWG, BNetzA-Festlegungen und Monitoringberichte
- 🔌 **Netzbetrieb**: TAB (Technische Anschlussbedingungen), VDE-FNN, SAIDI/SAIFI, Asset Management (ISO 55000)
- 📚 **Wissenschaft**: Studien, Tagungsbände und Veröffentlichungen zu Energiewirtschaftsthemen

Mit dem SDK erhalten Sie:

- ⚡ Einen typisierten TypeScript-Client für das produktive API v2 (`https://stromhaltig.de/api/v2`).
- 🖥️ Ein CLI (`willi-mako`) für Ad-hoc-Tests, Automatisierung und CI/CD.
- 📦 Eine gebündelte OpenAPI-Spezifikation für Code-Generatoren und Dritttools.
- 📘 Dokumentation, Beispiele und Integrationsanleitungen (Docker, MCP, GitPod, Power BI, n8n).

![Willi-Mako Architekturüberblick](./docs/media/willi-mako-architecture.svg)

---

## ✨ Key Features

- 🚀 **Zero-config defaults** – sofort produktiv mit `https://stromhaltig.de/api/v2`.
- 🔐 **Flexible Auth** – Login-Helper mit optionaler Tokenpersistenz oder direkte Verwendung von Service Tokens.
- 🧱 **Session Lifecycle APIs** – Sessions anlegen, inspizieren, bereinigen und dabei Präferenzen/Kontexte steuern.
- 🧠 **Conversational Stack** – Chat, semantische Suche, Reasoning, Kontextauflösung und Klarstellungsanalyse aus einer Hand.
- 📚 **Erweiterte Wissensabdeckung (v0.8.0)** – Combined-Search und willi-netz Collection umfassen nun wissenschaftliche Studien, BNetzA-Regulierung, BDEW-, VKU- und andere Veröffentlichungen für ganzheitliche Energiewirtschafts-Expertise.
- 🛠️ **Tooling Sandbox** – sichere Node.js-Ausführung für ETL, Validierung, KI-Skripte.
- 🗂️ **Artifact Storage** – persistente Protokolle, Audit-Trails und EDIFACT-Snapshots.
- 📄 **Document Management** – Hochladen, Verwalten und Durchsuchen von PDFs, DOCX, TXT und MD-Dateien in der Knowledge Base mit automatischer Textextraktion und AI-Kontext-Steuerung.
- 📦 **OpenAPI Bundle** – `schemas/openapi.json` für offline Analysen.
- 🖥️ **CLI & MCP** – vollständige Befehlsgruppen (`auth`, `sessions`, `chat`, `retrieval`, `edifact`, `market-partners`, …) plus MCP-Server für KI-Agenten.
- 🔍 **EDIFACT Message Analyzer** – Analyse, Validierung, Erklärung, Modifikation und Chat für EDIFACT-Nachrichten (UTILMD, MSCONS, ORDERS, etc.).
- 🔎 **Market Partners Search (v0.9.1)** – Öffentliche Suche nach Marktpartnern über BDEW/EIC-Codes, Firmennamen oder Städten mit Marktrollenfilter (VNB, LF, MSB), CSV-Export und bis zu 2000 Ergebnissen. Exportiere alle 913+ Verteilnetzbetreiber Deutschlands mit einem Befehl!
- 🧪 **Vitest Testsuite** – Vertrauen in Stabilität und Regressionen.
- 🛡️ **Compliance Fokus** – automatisierbare Prüfungen für UTILMD, MSCONS, ORDERS, PRICAT, INVOIC.

---

## 📦 Installation

```bash
npm install willi-mako-client
# oder
pnpm add willi-mako-client
# oder
yarn add willi-mako-client
```

> Voraussetzung: **Node.js 18+** (inkl. nativer `fetch`) sowie optional **TypeScript 5+** für Projekte mit Typprüfung.

---

## 🚀 Quick Start

### Local SDK Quickstart

1. **Token setzen** (über das Willi-Mako-Dashboard erhältlich):
   ```bash
   export WILLI_MAKO_TOKEN="<dein-token>"
   ```

2. **Client initialisieren und API prüfen**:
   ```typescript
   import { WilliMakoClient } from 'willi-mako-client';

   const client = new WilliMakoClient();
   const schema = await client.getRemoteOpenApiDocument();

   console.log('Verbunden mit:', (schema as any)?.info?.title);
   ```

3. **Sandbox-Job starten** (UTILMD-Dekodierung als Beispiel):
   ```typescript
   const job = await client.createNodeScriptJob({
     sessionId: 'session-utilmd-demo',
     source: `
       const message = 'UNH+1+UTILMD:D:04B:UN:2.3e';
       const segments = message.split('+');
       console.log(JSON.stringify({ type: segments[1], segments }));
     `,
     timeoutMs: 5000,
     metadata: { format: 'UTILMD', purpose: 'parsing-demo' }
   });

   console.log('Job-ID:', job.data.job.id, 'Status:', job.data.job.status);
   ```

4. **Artefakt speichern** (Audit-Report oder ETL-Ergebnis):
   ```typescript
   await client.createArtifact({
     sessionId: 'session-utilmd-demo',
     type: 'compliance-report',
     name: 'utilmd-audit.json',
     mimeType: 'application/json',
     encoding: 'utf8',
     content: JSON.stringify({ valid: true, issues: [] }),
     tags: ['utilmd', 'audit', 'demo']
   });
   ```

### Docker Quickstart

Führen Sie den Client isoliert in einem Container aus. Im Ordner [`examples/docker/`](./examples/docker) finden Sie eine referenzierte `Dockerfile`.

1. **Image bauen**:
   ```bash
   docker build -t willi-mako-cli ./examples/docker
   ```

2. **CLI im Container ausführen**:
   ```bash
   docker run --rm \
     -e WILLI_MAKO_TOKEN="$WILLI_MAKO_TOKEN" \
     willi-mako-cli openapi
   ```

3. **Eigenes Skript mounten** (z. B. `scripts/job.ts`):
   ```bash
   docker run --rm \
     -e WILLI_MAKO_TOKEN="$WILLI_MAKO_TOKEN" \
     -v "$(pwd)/scripts:/workspace/scripts:ro" \
     --entrypoint node \
     willi-mako-cli --loader ts-node/esm /workspace/scripts/job.ts
   ```

Der Container installiert das SDK global und setzt `willi-mako` als EntryPoint. Weitere Hinweise siehe [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md#docker-tooling-workspaces).

### MCP Server Quickstart

Expose die Plattform als **Model Context Protocol (MCP)**-Server, damit interne LLMs geprüfte Marktkommunikationsprozesse anstoßen können. Die CLI kapselt das komplette Setup, eigene Anpassungen können weiterhin auf [`examples/mcp-server.ts`](./examples/mcp-server.ts) aufbauen.

1. **Server starten** – Standardmäßig lauscht der Transport auf `http://localhost:7337/mcp`:
   ```bash
   willi-mako mcp --port 7337
   ```

   Authentifizierungsmöglichkeiten:
   - **Bearer**: Sende einen `Authorization: Bearer <token>`-Header oder setze `WILLI_MAKO_TOKEN`. Die CLI akzeptiert weiterhin `--token`.
   - **Basic**: Alternativ können Clients `Authorization: Basic base64(email:password)` schicken. Der Server tauscht die Credentials automatisch gegen einen JWT und cached ihn.
   - **URL-Bearer**: Optional den JWT als erstes Pfadsegment übergeben (`/{token}/mcp`). Der Server interpretiert das Segment als Bearer-Token, entfernt es aus der weitergeleiteten URL und protokolliert nur den bereinigten Pfad.
   - **Tool-Login**: Ohne Header lässt sich `willi-mako-login` nutzen; das Token wird pro MCP-Session gespeichert.
   - **Ad-hoc Sessions**: Wenn Tools ohne `sessionId` aufgerufen werden, erstellt der Server automatisch eine Session und gibt die ID im Response-Body zurück.

   👉 Für Schritt-für-Schritt-Anleitungen zu VS Code, Claude, ChatGPT, anythingLLM und n8n siehe [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md#schritt-für-schritt-mcp-integrationen-in-gängigen-umgebungen).

   📚 Eine ausführliche Service-Dokumentation (Architektur, Deployment, Public Endpoint `https://mcp.stromhaltig.de/`) findest du in [docs/MCP_SERVICE.md](./docs/MCP_SERVICE.md).

2. **Bereitgestellte Tools & Ressourcen**
   - `willi-mako-login`, `willi-mako-create-session`, `willi-mako-get-session`, `willi-mako-delete-session`
   - `willi-mako-chat`, `willi-mako-semantic-search`, `willi-mako-reasoning-generate`
   - `willi-mako-resolve-context`, `willi-mako-clarification-analyze`
   - `willi-mako-create-node-script`, `willi-mako-get-tool-job`, `willi-mako-create-artifact`
   - **Document Management**: `willi-mako-upload-document`, `willi-mako-upload-multiple-documents`, `willi-mako-list-documents`, `willi-mako-get-document`, `willi-mako-update-document`, `willi-mako-delete-document`, `willi-mako-reprocess-document`, `willi-mako-toggle-ai-context`
   - Ressource `willi-mako://openapi` – liefert die aktuelle OpenAPI-Spezifikation

   💡 **Document Upload via MCP:** Die Upload-Tools unterstützen zwei Methoden:
   - **URL-Download**: Dokumente von öffentlich zugänglichen URLs herunterladen und hochladen
   - **Base64-Encoding**: Dokumente als Base64-kodierte Strings übergeben (ideal für AI-Agents)

   Beispiel-Aufruf in AI-Chat:
   ```
   Lade das PDF von https://example.com/compliance.pdf hoch
   mit dem Titel "GPKE Compliance Guide 2024"
   ```

   Der Agent verwendet dann:
   ```json
   {
     "source": "url",
     "url": "https://example.com/compliance.pdf",
     "filename": "compliance.pdf",
     "title": "GPKE Compliance Guide 2024",
     "tags": ["gpke", "compliance"]
   }
   ```

   💡 **Domänenwissen an Bord:** Chat & Reasoning decken tiefgehende Prozesse der Energiewirtschaft ab (GPKE, WiM, GeLi Gas, Mehr-/Mindermengen, Lieferantenwechsel), berücksichtigen Regularien wie EnWG, StromNZV, StromNEV, EEG sowie MessEG/MessEV und kennen die Spezifika der EDIFACT/edi@energy-Formate (BDEW MaKo, UTILMD, MSCONS, ORDERS, PRICAT, INVOIC). Für wiederkehrende Prüf-Checklisten können Sie zusätzliche MCP-Tools definieren, die das Chat-Tool mit vordefinierten Prompts aufrufen, statt eigene Skripte zu pflegen.

3. **VS Code / GitHub Copilot verbinden**:
   ```bash
   code --add-mcp '{"name":"willi-mako","type":"http","url":"http://localhost:7337/mcp"}'
   ```

   Danach lassen sich die Tools direkt in Copilot-Chat verwenden (z. B. `@willi-mako-semantic-search`).

4. **Weitere Clients**: Claude Desktop, Cursor, LangChain, Semantic Kernel etc. sprechen ebenfalls den Streamable-HTTP-Transport an. Details siehe [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md#mcp-server-und-ki-entwicklungsumgebungen).

### Lightweight Web UI Quickstart

Für MaKo-Fachbereiche ohne lokale Node.js-Installation liefert die CLI ein gebündeltes Dashboard (Basis: [`src/demos/web-dashboard.ts`](./src/demos/web-dashboard.ts)).

1. **Abhängigkeiten installieren** (CLI & Dashboard werden gemeinsam ausgeliefert):
   ```bash
   npm install
   ```

2. **Server starten**:
   ```bash
   willi-mako --token "$WILLI_MAKO_TOKEN" serv --port 4173
   ```

   Ohne `--token` startet der Server ebenfalls und ermöglicht den Login über das Formular.

3. **Im Browser öffnen**: `http://localhost:4173`

4. **Formular verwenden** – EDIFACT-Message einfügen, Preview starten. Der Server erstellt intern Sandbox-Jobs, pollt Ergebnisse und zeigt Output sowie Artefakt-Vorschläge an. Eigene Anpassungen können auf [`examples/web-dashboard.ts`](./examples/web-dashboard.ts) aufsetzen.

![Web Dashboard Vorschau](./docs/media/web-dashboard-screenshot.svg)

Weitere Anpassungen (Authentifizierung, Mehrbenutzer, Branding) sind in [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md#lightweight-web-interface) beschrieben.

---

## ☁️ Cloud IDE Quickstarts

**Für Einsteiger ohne lokale Installation** – Teste das SDK direkt im Browser mit vollständiger Entwicklungsumgebung!

Wähle deine bevorzugte Cloud-IDE:

### GitHub Codespaces (⭐ Empfohlen)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/energychain/willi-mako-client)

**Beste Wahl für:** Vollständige SDK-Features, CLI-Tools, nahtlose GitHub-Integration

**Vorteile:**
- ✅ **60 Stunden/Monat kostenlos** (mehr als Gitpod!)
- ✅ Läuft im Browser ODER in VS Code Desktop
- ✅ Nahtlose GitHub-Integration (Projekt liegt schon hier!)
- ✅ Sehr schnelle Start-Zeiten (~15-30 Sekunden)
- ✅ Secrets Management für API-Tokens
- ✅ Perfekt für TypeScript/Node.js/CLI

**Schnellstart:**

1. **Codespace erstellen**: Klicke auf Button oben oder öffne:
   ```
   https://codespaces.new/energychain/willi-mako-client
   ```

2. **Registrieren**: Kostenloser Account bei [stromhaltig.de/app/](https://stromhaltig.de/app/)

3. **Credentials setzen**:
   ```bash
   export WILLI_MAKO_EMAIL='deine@email.de'
   export WILLI_MAKO_PASSWORD='dein-passwort'
   ```

   💎 **Pro-Tipp:** Speichere Credentials als [Codespaces Secrets](https://github.com/settings/codespaces) für automatisches Laden!

4. **Use Cases testen**:
   ```bash
   # Marktpartner suchen (kein Login!)
   willi-mako market-partners search -q "Netze BW"

   # Alle Verteilnetzbetreiber als CSV exportieren
   willi-mako market-partners search -q "Stadtwerke" --role VNB --csv > vnb-liste.csv

   # EDIFACT analysieren
   npm run example:edifact-analyze

   # Lieferantenwechsel validieren
   npm run example:utilmd
   ```

**📖 Vollständige Anleitung:** [`docs/CODESPACES_QUICKSTART.md`](./docs/CODESPACES_QUICKSTART.md) – 7 Use Cases mit fachlichen + technischen Erklärungen!

---

### Gitpod

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/energychain/willi-mako-client)

**Beste Wahl für:** Alternative zu Codespaces, Multi-Git-Provider (GitHub, GitLab, Bitbucket)

**Vorteile:**
- ✅ 50 Stunden/Monat kostenlos
- ✅ Unterstützt GitHub, GitLab, Bitbucket
- ✅ Schneller Start (~30 Sekunden)
- ✅ Vollständige SDK-Features

**Schnellstart:**

1. **Workspace öffnen**:
   ```
   https://gitpod.io/#https://github.com/energychain/willi-mako-client
   ```

2. **Credentials setzen**:
   ```bash
   export WILLI_MAKO_EMAIL='deine@email.de'
   export WILLI_MAKO_PASSWORD='dein-passwort'
   ```

3. **Testen**:
   ```bash
   # Marktpartner suchen (kein Login!)
   willi-mako market-partners search -q "Netze BW"

   # Alle Verteilnetzbetreiber als CSV
   willi-mako market-partners search -q "Stadtwerke" --role VNB --csv > vnb.csv

   npm run example:utilmd
   ```

**📖 Vollständige Anleitung:** [`docs/GITPOD_QUICKSTART.md`](./docs/GITPOD_QUICKSTART.md) – speziell für Einsteiger!

---

### StackBlitz (Web-Dashboard only)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/energychain/willi-mako-client)

**Beste Wahl für:** Schnelle Web-Dashboard-Demo ohne Setup

**Vorteile:**
- ✅ **Instant-Start** (läuft komplett im Browser!)
- ✅ Keine Registrierung erforderlich
- ✅ Perfekt für Web-UI-Prototyping
- ✅ Kostenlos unbegrenzt

**Einschränkungen:**
- ⚠️ Nur Web-Dashboard (`examples/web-dashboard.ts`)
- ⚠️ CLI-Tools nicht verfügbar
- ⚠️ Sandbox-Jobs eingeschränkt

**Schnellstart:**
```
https://stackblitz.com/github/energychain/willi-mako-client
```

**📖 Details:** [`docs/STACKBLITZ.md`](./docs/STACKBLITZ.md)

---

### 🆚 Vergleich Cloud-IDEs

| Feature | Codespaces ⭐ | Gitpod | StackBlitz |
|---------|--------------|--------|------------|
| **Kostenlos/Monat** | 60h | 50h | ∞ |
| **CLI-Tools** | ✅ | ✅ | ❌ |
| **SDK vollständig** | ✅ | ✅ | ⚠️ |
| **Web-Dashboard** | ✅ | ✅ | ✅ |
| **Start-Zeit** | ~15s | ~30s | ~5s |
| **VS Code Desktop** | ✅ | ✅ | ❌ |
| **Secrets Management** | ✅ | ⚠️ | ❌ |

**💡 Empfehlung:**
- **Vollständiges SDK**: GitHub Codespaces oder Gitpod
- **Nur Web-Demo**: StackBlitz

---

## 🧩 Core Use Cases

- **Compliance & Audit** – Prüfen von UTILMD/PRICAT/INVOIC vor Rechnungsstellung, revisionssichere Reports ablegen.
- **Klärfallanalyse** – MSCONS/ORDERS-Flows reproduzieren, Abweichungen in Messwerten oder Stammdaten identifizieren.
- **ETL Automation** – Transformationsjobs & Validierungsskripte über die Sandbox orchestrieren.
- **Rollen-spezifisch** – Lieferanten, Netzbetreiber, MSBs automatisieren Stammdatenabgleiche, Lieferantenwechsel, Clearing.

---

## 🧭 API Overview

| Methode | Zweck | Typische Formate | Hinweise |
|---------|-------|------------------|----------|
| `login()` | JWT-Token aus E-Mail/Passwort erzeugen | – | Optional automatische Token-Persistenz |
| `createSession()` | Session mit Präferenzen/Kontext anlegen | UTILMD, MSCONS, ORDERS, PRICAT, INVOIC | TTL & Preferences steuerbar |
| `getSession()` / `deleteSession()` | Session inspizieren oder entfernen | – | Liefert Policy-Flags & Workspace-Kontext |
| `chat()` | Konversation mit dem Assistenten führen | Freitext | Unterstützt Timeline & Kontext-Overrides |
| `semanticSearch()` | Wissensgraph durchsuchen | Dokumente, Artikel | Hybrid Retrieval mit konfigurierbarem Limit |
| `generateReasoning()` | Multi-Step-Reasoning ausführen | Incident-Analysen, Auswertungen | Pipeline & Intent-Analyse steuerbar |
| `resolveContext()` | Kontextentscheidungen ableiten | Routing, Intent, Ressourcen | Nutzt Conversation History |
| `analyzeClarification()` | Klärungsbedarf erkennen | Kundenanfragen | Liefert Klarstellungsfragen & Enhanced Query |
| `createNodeScriptJob()` | Sandbox-Job starten | UTILMD, MSCONS, ORDERS, PRICAT, INVOIC | Rückgabe: Job-ID & Status |
| `getToolJob(jobId)` | Job-Status + Ergebnisse | – | Polling bis `succeeded` oder `failed` |
| `createArtifact()` | Artefakt speichern | Reports, EDIFACT, Compliance | Unterstützt Metadaten & Tags |
| `uploadDocument()` | Dokument in Knowledge Base hochladen | PDF, DOCX, TXT, MD | Max. 50MB, automatische Textextraktion |
| `listDocuments()` | Dokumente mit Pagination auflisten | – | Unterstützt Suche & Filter |
| `getDocument()` | Dokument-Details abrufen | – | Inkl. Verarbeitungsstatus & extrahiertem Text |
| `updateDocument()` | Dokument-Metadaten aktualisieren | – | Title, Description, Tags, AI-Kontext |
| `deleteDocument()` | Dokument löschen | – | Permanent, inkl. Vektoren |
| `downloadDocument()` | Original-Datei herunterladen | PDF, DOCX, TXT, MD | Als ArrayBuffer |
| `reprocessDocument()` | Dokument neu verarbeiten | – | Textextraktion & Embedding wiederholen |
| `toggleAiContext()` | AI-Kontext aktivieren/deaktivieren | – | Steuert Verfügbarkeit für Chat/Reasoning |
| `analyzeEdifactMessage()` | EDIFACT-Nachricht strukturell analysieren | UTILMD, MSCONS, ORDERS, PRICAT, INVOIC | v0.7.0: Code-Resolution & Segmentierung |
| `validateEdifactMessage()` | EDIFACT-Nachricht validieren | UTILMD, MSCONS, ORDERS, PRICAT, INVOIC | v0.7.0: Strukturelle & semantische Prüfung |
| `explainEdifactMessage()` | EDIFACT-Nachricht erklären | UTILMD, MSCONS, ORDERS, PRICAT, INVOIC | v0.7.0: KI-generierte Erklärung |
| `modifyEdifactMessage()` | EDIFACT-Nachricht modifizieren | UTILMD, MSCONS, ORDERS, PRICAT, INVOIC | v0.7.0: Natürlichsprachliche Anweisungen |
| `chatAboutEdifactMessage()` | Chat über EDIFACT-Nachricht | UTILMD, MSCONS, ORDERS, PRICAT, INVOIC | v0.7.0: Kontextbewusste Fragen & Antworten |
| `getRemoteOpenApiDocument()` | Aktuelle OpenAPI laden | – | Für Schema-Diffs & Code-Gen |

Fehler führen zu `WilliMakoError` mit `status` und `body`. Vollständige Typen siehe [`src/types.ts`](./src/types.ts) und [`docs/API.md`](./docs/API.md).

---

## 🖥️ CLI Usage

```bash
npx willi-mako-client --help
```

**Typische Befehle (Auszug):**

```bash
# Login mit optionaler Token-Persistenz (JSON-Ausgabe)
willi-mako auth login --email user@example.com --password secret --persist

# Token direkt als Umgebungsvariable übernehmen (POSIX)
eval "$(willi-mako auth login --email user@example.com --password secret --export-env --no-json)"

# Session anlegen und Umgebungsvariable exportieren (WILLI_MAKO_SESSION_ID)
eval "$(willi-mako sessions create --ttl 30 --export-env --no-json)"

# Session anlegen und verwalten
willi-mako sessions create --ttl 30 --preferences '{"companiesOfInterest":["DE0001"]}'
willi-mako sessions get <session-id>
willi-mako sessions delete <session-id>

# Chat & Retrieval
willi-mako chat send --session <session-id> --message "Welche MSCONS-Anomalien liegen vor?"
willi-mako retrieval semantic-search --session <session-id> --query "Flexibilitätsverordnung"

# Reasoning & Kontext
willi-mako reasoning generate --session <session-id> --query "Erstelle einen Maßnahmenplan"
willi-mako context resolve --session <session-id> --query "Welche Datenpunkte fehlen?"
willi-mako clarification analyze --session <session-id> --query "Bitte bereite den Lieferantenwechsel vor"

# Tooling & Artefakte
willi-mako tools run-node-script --session <session-id> --source 'console.log("ok")'
willi-mako tools job <job-id>
cat compliance.json | willi-mako artifacts create --session <session-id> --type compliance-report --mime application/json

# Document Management
willi-mako documents upload ./compliance-guide.pdf --title "Compliance Guide" --ai-context
willi-mako documents list --search "compliance" --processed
willi-mako documents get <document-id>
willi-mako documents update <document-id> --title "Updated Title" --ai-context true
willi-mako documents download <document-id> ./downloaded.pdf
willi-mako documents reprocess <document-id>
willi-mako documents delete <document-id> --confirm
```

### Beispiel: Komplettes CLI-Skript

Das folgende Bash-Skript zeigt einen End-to-End-Flow – Login, Session anlegen und eine Frage an die Chat-API stellen. Die Antworten werden mit `jq` extrahiert, um nur die relevanten Teile weiterzugeben:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Zugangsdaten aus der Umgebung beziehen
: "${WILLI_MAKO_EMAIL:?Bitte WILLI_MAKO_EMAIL setzen}"
: "${WILLI_MAKO_PASSWORD:?Bitte WILLI_MAKO_PASSWORD setzen}"

# 1) Login durchführen und Token als Umgebungsvariable exportieren
eval "$(willi-mako auth login \
   --email "$WILLI_MAKO_EMAIL" \
   --password "$WILLI_MAKO_PASSWORD" \
   --export-env \
   --no-json)"

# 2) Session erstellen, Rückgabe merken und Session-ID exportieren
SESSION_PAYLOAD="$(willi-mako sessions create \
   --ttl 60 \
   --export-env)"

# Optional: Session-ID aus dem JSON ziehen
SESSION_ID="$(echo "$SESSION_PAYLOAD" | jq -r '.data.sessionId')"
echo "Session angelegt: $SESSION_ID"

# 3) Frage an die Plattform stellen
CHAT_RESPONSE="$(willi-mako chat send \
   --session "$SESSION_ID" \
   --message "Beschreibe die Nutzung einer MSCONS")"

# Mit jq die eigentliche Antwort extrahieren
ANSWER="$(echo "$CHAT_RESPONSE" | jq -r '.data.response // .data')"

echo
echo "Antwort der Willi-Mako Plattform:"
echo "$ANSWER"
```

> 💡 Tipps
> - `--no-json` sorgt dafür, dass beim Login nur der Export-Befehl ausgegeben wird – ideal für `eval`.
> - Für andere Shells lässt sich über `--shell` die passende Export-Syntax erzeugen (z. B. `--shell powershell`).
> - Beim Aufräumen (`willi-mako sessions delete …`) wird `WILLI_MAKO_SESSION_ID` automatisch aus der Umgebung entfernt.

#### Reasoning-Beispiel mit gleicher Session

Nachdem die Session aktiv ist, kann das Reasoning-API direkt genutzt werden. Auch hier lässt sich die Antwort mit `jq` herausfiltern:

```bash
REASONING_RESPONSE="$(willi-mako reasoning generate \
   --session "$SESSION_ID" \
   --query "Was ist eine MSCONS?")"

REASONING_ANSWER="$(echo "$REASONING_RESPONSE" | jq -r '.data.response // .data')"

echo
echo "Reasoning-Ausgabe:"
echo "$REASONING_ANSWER"
```

##### PowerShell-Workflow

```powershell
$ErrorActionPreference = 'Stop'

# Zugangsdaten aus der Umgebung lesen
if (-not $env:WILLI_MAKO_EMAIL -or -not $env:WILLI_MAKO_PASSWORD) {
   throw 'Bitte WILLI_MAKO_EMAIL und WILLI_MAKO_PASSWORD setzen.'
}

# Login: Export-Befehl generieren und direkt ausführen
Invoke-Expression (willi-mako auth login \
   --email $env:WILLI_MAKO_EMAIL \
   --password $env:WILLI_MAKO_PASSWORD \
   --export-env \
   --shell powershell \
   --no-json)

# Session erstellen und Session-ID speichern
$sessionJson = willi-mako sessions create --ttl 60 | ConvertFrom-Json
$env:WILLI_MAKO_SESSION_ID = $sessionJson.data.sessionId
Write-Host "Session angelegt: $($env:WILLI_MAKO_SESSION_ID)"

# Chat-Frage stellen
$chat = willi-mako chat send \
   --session $env:WILLI_MAKO_SESSION_ID \
   --message "Beschreibe die Nutzung einer MSCONS"
$chatAnswer = ($chat | ConvertFrom-Json).data.response
Write-Host "Antwort:"; Write-Host $chatAnswer

# Reasoning anstoßen
$reasoning = willi-mako reasoning generate \
   --session $env:WILLI_MAKO_SESSION_ID \
   --query "Was ist eine MSCONS?"
$reasoningAnswer = ($reasoning | ConvertFrom-Json).data.response
Write-Host "Reasoning-Ausgabe:"; Write-Host $reasoningAnswer
```

##### CMD-Workflow (Windows Command Prompt)

```bat
@echo off
setlocal enabledelayedexpansion

if "%WILLI_MAKO_EMAIL%"=="" (
   echo Bitte WILLI_MAKO_EMAIL setzen
   exit /b 1
)

if "%WILLI_MAKO_PASSWORD%"=="" (
   echo Bitte WILLI_MAKO_PASSWORD setzen
   exit /b 1
)

rem Login-Export ausführen
for /f "usebackq delims=" %%E in (`willi-mako auth login --email %WILLI_MAKO_EMAIL% --password %WILLI_MAKO_PASSWORD% --export-env --shell cmd --no-json`) do %%E

rem Session erstellen und Export übernehmen
for /f "usebackq delims=" %%E in (`willi-mako sessions create --ttl 60 --export-env --shell cmd --no-json`) do %%E
echo Session angelegt: %WILLI_MAKO_SESSION_ID%

rem Chat ausführen und Antwort mit jq.exe extrahieren
willi-mako chat send --session %WILLI_MAKO_SESSION_ID% --message "Beschreibe die Nutzung einer MSCONS" ^
   | jq.exe -r ".data.response // .data"

rem Reasoning-Query stellen
willi-mako reasoning generate --session %WILLI_MAKO_SESSION_ID% --query "Was ist eine MSCONS?" ^
   | jq.exe -r ".data.response // .data"

endlocal
```

> ℹ️ Für den CMD-Workflow wird `jq.exe` im `PATH` erwartet. Alternativ kann die JSON-Verarbeitung mit Bordmitteln oder PowerShell erfolgen (`powershell -Command ...`).

### Tooling-Assistent: Skript-Generierung auf Zuruf

Mit `willi-mako tools generate-script` sprichst du den deterministischen Skriptgenerator der API an. Die CLI stößt einen asynchronen Job an, pollt den Fortschritt (`collecting-context`, `prompting`, `drafting`, …) und streamt Status-Updates sofort ins Terminal. Sessions werden bei Bedarf automatisch erzeugt; das Ergebnis kann direkt auf der Konsole erscheinen, in eine Datei geschrieben oder als Artefakt gespeichert werden. Nach Abschluss blendet die CLI erneut zusammengefasste Job-Informationen und etwaige Validierungswarnungen ein.

```bash
# Skript generieren und lokal als Datei ablegen
willi-mako tools generate-script \
   --query "Erstelle mir ein Tool, das MSCONS-Nachrichten in CSV konvertiert" \
   --output mscons-to-csv.js

# Optional: Artefakt in Willi-Mako persistieren
willi-mako tools generate-script \
   --query "Generiere ein Prüftool für UTILMD und liefere JSON-Ausgabe" \
   --artifact --artifact-name utilmd-validator.js

# Zusätzliche Referenzen einbinden (max. 4 Anhänge, <= 60k Zeichen je Datei)
willi-mako tools generate-script \
   --query "Erstelle ein Abrechnungstool für MSCONS mit ausführlichen Plausibilitätschecks" \
   --attachment "./docs/mscons-checkliste.md|text/markdown|MSCONS Prüfhinweise" \
   --attachment '{"path":"./samples/mscons-probe.csv","mimeType":"text/csv","description":"Realdaten Q1 2024","weight":0.4}'
```


> 📎 Mit `--attachment` (mehrfach wiederholbar) fütterst du den Generator mit zusätzlichen Textdateien – beispielsweise bestehender ETL-Logik, Mapping-Tabellen oder Prozessbeschreibungen. Akzeptiert werden Dateipfade (`path|mimeType|Beschreibung|Gewicht`) oder JSON-Objekte (`{"path":"...","description":"...","weight":0.5}`). Pro Job sind max. vier Anhänge mit jeweils ≤ 60 000 Zeichen (kombiniert ≤ 160 000 Zeichen) erlaubt. Gewichte zwischen 0 und 1 priorisieren besonders relevante Quellen.
> 💡 Über `--input-mode` (`file`, `stdin`, `environment`) und `--output-format` (`csv`, `json`, `text`) steuerst du, wie die generierten Skripte Ein- und Ausgabe handhaben sollen. Mit `--json` erhältst du die Antwort inklusive Skript als strukturiertes JSON.
> 🤖 Sobald die Umgebungsvariable `GEMINI_API_KEY` gesetzt ist, verfeinert die CLI die Nutzeranforderung automatisch mit dem Modell `gemini-2.5-pro`, ergänzt eine Validierungs-Checkliste und protokolliert das Ergebnis (sowie mögliche Fehler) im Terminal. Das Verhalten lässt sich ohne zusätzliche Flags nutzen und greift auch in der SDK-Hilfsfunktion `generateToolScript`.

> ℹ️  JSON-Antworten enthalten neben dem beschriebenen Skript jetzt auch das vollständige Job-Objekt (`data.job`) inklusive `status`, `progress`, `attempts` und `warnings`. Beispiel:
> ```json
> {
>   "data": {
>     "code": "...",
>     "suggestedFileName": "mscons-to-csv.js",
>     "job": {
>       "id": "job_123",
>       "status": "succeeded",
>       "progress": { "stage": "prompting", "message": "Verarbeite Kontext" },
>       "attempts": 1,
>       "warnings": []
>     }
>   }
> }
> ```

### Lokale Tests wie nach einem Publish

Um die npm-Veröffentlichung lokal zu simulieren, kannst du das Repository paketieren und global installieren:

```bash
./scripts/local-pack-install.sh
```

Das Skript führt Tests und Build aus, erstellt per `npm pack` das Release-Tarball und installiert es anschließend mit `npm install -g`. So bekommst du exakt das Artefakt, das später über `npm publish` ausgeliefert würde – ganz ohne manuelles Packen oder Linken.

### Tooling-Beispiel: MSCONS → CSV Converter

Mit `willi-mako tools run-node-script` lassen sich maßgeschneiderte Tools als Sandbox-Jobs ausführen. Das folgende Beispiel erstellt einen Konverter, der eine MSCONS-Nachricht in CSV transformiert und die Messlokation (MeLo) als Dateinamen verwendet.

```bash
# 1) Node.js-Skript definieren (Multi-Line-String)
MSCONS2CSV_SCRIPT=$(cat <<'EOF'
const mscons = `UNH+1+MSCONS:D:96A:UN:1.2'
BGM+E01+20240315-4711'
DTM+137:202403150000:203'
IDE+24+DE0123456789012345678901234567890'
LOC+172+DE1234567890'
MEA+AAE+KWH::60E223:15.78'
MEA+AAE+KWH::60E224:16.12'
UNT+7+1'`;

const segments = mscons
   .split("'")
   .map((segment) => segment.trim())
   .filter(Boolean);

const melo = segments
   .find((segment) => segment.startsWith('LOC+172+'))
   ?.split('+')[2]
   ?.replace(/[^A-Z0-9_-]/gi, '')
   ?? 'mscons';

const measurements = segments
   .filter((segment) => segment.startsWith('MEA+'))
   .map((segment) => {
      const [, , qualifier, value] = segment.split('+');
      const [quantity, unit] = (qualifier ?? '').split('::');
      const numeric = value?.split(':')[2] ?? '';
      return { quantity: quantity ?? 'KWH', value: numeric ?? '0', unit: unit ?? '' };
   });

const csv = ['quantity;value;unit', ...measurements.map((row) => `${row.quantity};${row.value};${row.unit}`)].join('\n');

console.log(
   JSON.stringify(
      {
         fileName: `${melo}-readings.csv`,
         rows: measurements.length,
         csv
      },
      null,
      2
   )
);
EOF
)

# 2) Job in der Sandbox anlegen (aktive Session vorausgesetzt)
JOB_INFO=$(willi-mako tools run-node-script \
   --session "$SESSION_ID" \
   --source "$MSCONS2CSV_SCRIPT" \
   --timeout 5000 \
   --metadata '{"toolName":"MSCONS2CSV"}')

JOB_ID=$(echo "$JOB_INFO" | jq -r '.data.job.id')
echo "Tool-Job gestartet: $JOB_ID"

# 3) Ergebnis abfragen und CSV speichern
JOB_RESULT=$(willi-mako tools job "$JOB_ID" | jq -r '.data.job.result.stdout')
CSV_FILE=$(echo "$JOB_RESULT" | jq -r '.fileName')

echo "$JOB_RESULT" | jq -r '.csv' > "$CSV_FILE"

echo "CSV-Datei erzeugt: $CSV_FILE"
```

> 🧰 Hinweise
> - Das Skript schreibt ein JSON-Objekt auf `stdout`, das sich mit `jq` weiterverarbeiten lässt (z. B. zum Speichern der CSV oder für Artefakt-Uploads).
> - Über `--metadata` können Tool-spezifische Informationen mitgegeben werden, die bei `willi-mako tools job` erneut auftauchen.
> - Für reale Szenarien lässt sich die MSCONS-Payload dynamisch befüllen, etwa aus Artefakten oder vorherigen API-Schritten.

#### PowerShell-Variante

```powershell
$ErrorActionPreference = 'Stop'

if (-not $env:WILLI_MAKO_SESSION_ID) {
   throw 'Bitte zuerst eine Session erstellen (siehe Login/Session-Beispiele oben).'
}

$script = @'
const mscons = `UNH+1+MSCONS:D:96A:UN:1.2'
BGM+E01+20240315-4711'
DTM+137:202403150000:203'
IDE+24+DE0123456789012345678901234567890'
LOC+172+DE1234567890'
MEA+AAE+KWH::60E223:15.78'
MEA+AAE+KWH::60E224:16.12'
UNT+7+1'`;

const segments = mscons
   .split("'")
   .map((segment) => segment.trim())
   .filter(Boolean);

const melo = segments
   .find((segment) => segment.startsWith('LOC+172+'))
   ?.split('+')[2]
   ?.replace(/[^A-Z0-9_-]/gi, '')
   ?? 'mscons';

const measurements = segments
   .filter((segment) => segment.startsWith('MEA+'))
   .map((segment) => {
      const [, , qualifier, value] = segment.split('+');
      const [quantity, unit] = (qualifier ?? '').split('::');
      const numeric = value?.split(':')[2] ?? '';
      return { quantity: quantity ?? 'KWH', value: numeric ?? '0', unit: unit ?? '' };
   });

const csv = ['quantity;value;unit', ...measurements.map((row) => `${row.quantity};${row.value};${row.unit}`)].join('\n');

console.log(
   JSON.stringify(
      {
         fileName: `${melo}-readings.csv`,
         rows: measurements.length,
         csv
      },
      null,
      2
   )
);
'@

$job = willi-mako tools run-node-script `
   --session $env:WILLI_MAKO_SESSION_ID `
   --source $script `
   --timeout 5000 `
   --metadata '{"toolName":"MSCONS2CSV"}' | ConvertFrom-Json

$jobId = $job.data.job.id
Write-Host "Tool-Job gestartet: $jobId"

$result = willi-mako tools job $jobId | ConvertFrom-Json
$payload = $result.data.job.result.stdout | ConvertFrom-Json

$payload.csv | Out-File -FilePath $payload.fileName -Encoding utf8
Write-Host "CSV-Datei erzeugt:" $payload.fileName
```

#### CMD-Variante

```bat
@echo off
setlocal enabledelayedexpansion

if "%WILLI_MAKO_SESSION_ID%"=="" (
   echo Bitte zuerst eine Session erstellen (siehe oben)
   exit /b 1
)

set "MSCONS_SCRIPT=const mscons = `UNH+1+MSCONS:D:96A:UN:1.2'
BGM+E01+20240315-4711'
DTM+137:202403150000:203'
IDE+24+DE0123456789012345678901234567890'
LOC+172+DE1234567890'
MEA+AAE+KWH::60E223:15.78'
MEA+AAE+KWH::60E224:16.12'
UNT+7+1'`;

const segments = mscons
   .split("'")
   .map((segment) => segment.trim())
   .filter(Boolean);

const melo = segments
   .find((segment) => segment.startsWith('LOC+172+'))
   ?.split('+')[2]
   ?.replace(/[^A-Z0-9_-]/gi, '')
   ?? 'mscons';

const measurements = segments
   .filter((segment) => segment.startsWith('MEA+'))
   .map((segment) => {
      const [, , qualifier, value] = segment.split('+');
      const [quantity, unit] = (qualifier ?? '').split('::');
      const numeric = value?.split(':')[2] ?? '';
      return { quantity: quantity ?? 'KWH', value: numeric ?? '0', unit: unit ?? '' };
   });

const csv = ['quantity;value;unit', ...measurements.map((row) => `${row.quantity};${row.value};${row.unit}`)].join('\n');

console.log(
   JSON.stringify(
      {
         fileName: `${melo}-readings.csv`,
         rows: measurements.length,
         csv
      },
      null,
      2
   )
);"

for /f "usebackq delims=" %%E in (`willi-mako tools run-node-script --session %WILLI_MAKO_SESSION_ID% --source "%MSCONS_SCRIPT%" --timeout 5000 --metadata "{\"toolName\":\"MSCONS2CSV\"}"`) do set "JOB_JSON=%%E"

for /f "tokens=*" %%J in ('echo %JOB_JSON% ^| jq.exe -r ".data.job.id"') do set "JOB_ID=%%J"
echo Tool-Job gestartet: %JOB_ID%

for /f "usebackq delims=" %%R in (`willi-mako tools job %JOB_ID% ^| jq.exe -r ".data.job.result.stdout"`) do set "JOB_RESULT=%%R"

for /f "tokens=*" %%F in ('echo %JOB_RESULT% ^| jq.exe -r ".fileName"') do set "CSV_FILE=%%F"
echo %JOB_RESULT% ^| jq.exe -r ".csv" > "%CSV_FILE%"

echo CSV-Datei erzeugt: %CSV_FILE%

endlocal
```

> ℹ️ Für Windows empfiehlt sich `jq.exe` im `PATH`. Alternativ kann die JSON-Weiterverarbeitung auch über `powershell -Command` erfolgen.

### Artefakte erstellen & abrufen

Artefakte sind strukturierte Dateien (z. B. Reports, CSVs, EDIFACT-Audits), die einer Session zugeordnet werden. Die CLI unterstützt das Anlegen und Abfragen direkt.

```bash
# Beispiel-Report erzeugen
cat <<'EOF' > audit-report.json
{
   "type": "MSCONS",
   "status": "ok",
   "checkedAt": "$(date --iso-8601=seconds)",
   "remarks": ["Alle Werte im Toleranzbereich", "Kein Erneuerungsbedarf"]
}
EOF

# Artefakt erstellen (Inline-Upload)
ARTIFACT_RESPONSE=$(willi-mako artifacts create \
   --session "$SESSION_ID" \
   --type mscons-audit \
   --name "audit-report.json" \
   --mime application/json \
   --encoding utf8 \
   --description "MSCONS Audit Report" \
   --tags "mscons,audit" \
   --metadata '{"source":"cli-example"}' \
   --content "$(cat audit-report.json)")

ARTIFACT_ID=$(echo "$ARTIFACT_RESPONSE" | jq -r '.data.artifact.id')
echo "Artefakt angelegt: $ARTIFACT_ID"

# Inhalte abrufen (inline payload)
willi-mako artifacts get --session "$SESSION_ID" --artifact "$ARTIFACT_ID" \
   | jq -r '.data.artifact.storage.content' > downloaded-report.json

echo "Report gespeichert unter downloaded-report.json"
```

> 📂 Standardmäßig werden Artefakte inline abgelegt. Für größere Dateien lassen sich Upload-URLs nutzen (siehe API-Dokumentation).

#### PowerShell-Variante

```powershell
$report = @'
{
   "type": "MSCONS",
   "status": "ok",
   "checkedAt": "{0}",
   "remarks": ["Alle Werte im Toleranzbereich", "Kein Erneuerungsbedarf"]
}
'@ -f (Get-Date -Format o)

$artifact = willi-mako artifacts create `
   --session $env:WILLI_MAKO_SESSION_ID `
   --type mscons-audit `
   --name audit-report.json `
   --mime application/json `
   --encoding utf8 `
   --description "MSCONS Audit Report" `
   --tags "mscons,audit" `
   --metadata '{"source":"cli-example"}' `
   --content $report | ConvertFrom-Json

$artifactId = $artifact.data.artifact.id
Write-Host "Artefakt angelegt:" $artifactId

$download = willi-mako artifacts get `
   --session $env:WILLI_MAKO_SESSION_ID `
   --artifact $artifactId | ConvertFrom-Json

$download.data.artifact.storage.content | Out-File -FilePath downloaded-report.json -Encoding utf8
Write-Host "Report gespeichert: downloaded-report.json"
```

#### CMD-Variante

```bat
@echo off
setlocal enabledelayedexpansion

set "REPORT={"type":"MSCONS","status":"ok","checkedAt":"%date% %time%","remarks":["Alle Werte im Toleranzbereich","Kein Erneuerungsbedarf"]}"

for /f "usebackq delims=" %%R in (`willi-mako artifacts create --session %WILLI_MAKO_SESSION_ID% --type mscons-audit --name audit-report.json --mime application/json --encoding utf8 --description "MSCONS Audit Report" --tags "mscons,audit" --metadata "{\"source\":\"cli-example\"}" --content "%REPORT%"`) do set "ARTIFACT_JSON=%%R"

for /f "tokens=*" %%A in ('echo %ARTIFACT_JSON% ^| jq.exe -r ".data.artifact.id"') do set "ARTIFACT_ID=%%A"
echo Artefakt angelegt: %ARTIFACT_ID%

willi-mako artifacts get --session %WILLI_MAKO_SESSION_ID% --artifact %ARTIFACT_ID% ^
   | jq.exe -r ".data.artifact.storage.content" > downloaded-report.json

echo Report gespeichert: downloaded-report.json

endlocal
```

> ℹ️ Für produktive Szenarien empfiehlt sich, Artefakte nach dem Download zu verifizieren und ggf. via `artifacts delete` wieder zu entfernen.

Über `--base-url` und `--token` lassen sich Zielsystem bzw. Credentials überschreiben.

---

## 🧪 Examples

Im Ordner [`examples/`](./examples) befinden sich ausführbare Szenarien:

- `utilmd-audit.ts` – Stammdaten-Validierung.
- `mscons-clearing.ts` – Plausibilitätsprüfung von Zählwerten.
- `orders-incident-report.ts` – Klärfallanalyse.
- `pricat-price-sync.ts` – Preislistenabgleich.
- `invoic-archive.ts` – Rechnungsarchivierung mit Metadaten.
- `web-dashboard.ts` – Low-code Webfrontend (dieses README).

Starten Sie Beispiele mit:

```bash
node --loader ts-node/esm examples/utilmd-audit.ts
```

---

## 📖 Documentation

- [`docs/API.md`](./docs/API.md) – Endpunkte & Typen.
- [`docs/EXAMPLES.md`](./docs/EXAMPLES.md) – Vertiefende Workflows.
- [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) – Fehlersuche.
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) – Geplante Erweiterungen.
- [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md) – Docker, Web UI, Power BI, n8n.

---

## 🛠️ Development

```bash
git clone https://github.com/energychain/willi-mako-client.git
cd willi-mako-client
npm install

npm run build   # TypeScript → dist/
npm run lint    # Typprüfung
npm test        # Vitest Suite
```

Projektstruktur:

```
willi-mako-client/
├── src/              # TypeScript-Quellcode
├── schemas/          # Gebündelte OpenAPI-Dokumente
├── examples/         # Beispielskripte & Demos
├── docs/             # Zusatzdokumentation
├── tests/            # Vitest Tests
├── .github/          # GitHub Actions Workflows
│   ├── workflows/    # CI/CD Pipelines
│   └── dependabot.yml
└── dist/             # Build-Ausgabe (gitignored)
```

> Siehe [`CONTRIBUTING.md`](./CONTRIBUTING.md) für Coding-Guidelines, Branch-Strategie und Review-Checklisten.

### CI/CD Pipeline

Das Projekt nutzt eine vollautomatische CI/CD-Pipeline mit GitHub Actions:

✅ **Automatische Tests** auf Node.js 18, 20, 22
✅ **Code Coverage** Reports (Codecov)
✅ **Security Scanning** (npm audit, CodeQL, Snyk)
✅ **Dependency Updates** (Dependabot mit Auto-Merge)
✅ **Automatisches npm Publishing** bei Git-Tags
✅ **Cloud IDE Prebuilds** (Codespaces, Gitpod)

**Workflows:**
- `ci.yml` – Linting, Tests, Coverage, Security
- `release.yml` – npm Publishing bei Git-Tags
- `codeql.yml` – Security Scanning
- `prebuilds.yml` – Cloud IDE Optimierung
- `auto-merge-dependabot.yml` – Automatische Dependency Updates
- `stale.yml` – Issue/PR Management

📖 **Vollständige Dokumentation:** [`docs/CI_CD.md`](./docs/CI_CD.md)

**Quick Start für Contributors:**
```bash
# Feature Branch erstellen
git checkout -b feature/neue-funktion

# Entwickeln & Commiten
git commit -m "feat: neue Funktion"

# PR erstellen (CI läuft automatisch)
gh pr create --base develop

# Nach Merge: Automatisches Testing & Deployment
```

---

## 🔌 Integrations (Docker, Power BI, n8n)

Der neue Leitfaden [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md) beschreibt Schritt für Schritt:

- Docker-Workspaces & Compose-Setups für isoliertes CLI- oder Skript-Hosting.
- Aufbau des Lightweight Web Dashboards (Proxy, Auth, Branding).
- Direct Queries aus **Microsoft Power BI** (REST-Connector, Parameter, Token-Verwaltung).
- **n8n Workflows** (HTTP Request Node, Credentials, Node-Scripting mit Willi-Mako).

---

## 🌍 Community

**Join the Willi-Mako Community!** We're building the standard for energy market communication in Germany—together.

### 💬 Get Involved

- **[Discussions](https://github.com/energychain/willi-mako-client/discussions)** – Ask questions, share use cases, get help
- **[Use Case Gallery](./docs/USE_CASE_GALLERY.md)** – See real-world implementations
- **[Certification Program](./docs/CERTIFICATION.md)** – Get officially certified
- **[Sponsorship](./docs/SPONSORSHIP.md)** – Support the project & influence roadmap

### 🏆 Recognition

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

**Contribute and get recognized!** See [COMMUNITY.md](./COMMUNITY.md) for details.

### 💚 Become a Sponsor

**Support open energy infrastructure:**

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-pink?logo=github)](https://github.com/sponsors/energychain)

- 🥉 **Bronze** (€500/month) – Logo on README
- 🥈 **Silver** (€2,000/month) – Roadmap influence
- 🥇 **Gold** (€5,000/month) – Strategic partnership
- 💎 **Platinum** (€10,000+/month) – Steering committee

[Learn more →](./docs/SPONSORSHIP.md)

---

## 🤝 Contributing

Wir freuen uns über Beiträge aus der Energie-Community!

**Quick Links:**
- 👋 [Good First Issues](https://github.com/energychain/willi-mako-client/issues?q=is%3Aissue+is%3Aopen+label%3A%22good-first-issue%22)
- 📖 [Contributing Guide](./CONTRIBUTING.md)
- 💬 [Community Guidelines](./COMMUNITY.md)
- 📜 [Code of Conduct](./CODE_OF_CONDUCT.md)

**How to contribute:**

1. **Report bugs** – [Create an issue](https://github.com/energychain/willi-mako-client/issues/new?template=bug_report.md)
2. **Request features** – [Start a discussion](https://github.com/energychain/willi-mako-client/discussions/new?category=ideas)
3. **Improve docs** – [Documentation issues](https://github.com/energychain/willi-mako-client/issues?q=is%3Aissue+is%3Aopen+label%3Adocumentation)
4. **Submit code** – Fork, branch, code, test, PR!
5. **Share use cases** – [Submit your story](https://github.com/energychain/willi-mako-client/discussions/new?category=use-cases)

**Contribution types recognized:**
- 💻 Code
- 📖 Documentation
- 🐛 Bug reports
- 🤔 Ideas & Planning
- 🔌 Integration examples
- 🎯 Use cases
- ⚖️ Compliance expertise
- ⚡ Energy sector knowledge

---

## 💬 Support

**Need help?**

- � **[GitHub Discussions](https://github.com/energychain/willi-mako-client/discussions)** – Community support
- 🐛 **[Bug Reports](https://github.com/energychain/willi-mako-client/issues/new?template=bug_report.md)** – Report issues
- 💡 **[Feature Requests](https://github.com/energychain/willi-mako-client/discussions/new?category=ideas)** – Suggest improvements
- � **[Integration Help](https://github.com/energychain/willi-mako-client/discussions/new?category=integration-help)** – Technical questions
- ⚖️ **[Compliance Questions](https://github.com/energychain/willi-mako-client/discussions/new?category=compliance)** – Regulatory guidance

**Commercial support:**

- � **Email**: [dev@stromdao.com](mailto:dev@stromdao.com)
- 🏢 **Partnership**: [Submit inquiry](https://github.com/energychain/willi-mako-client/issues/new?template=partnership.md)
- 🌐 **Website**: [stromhaltig.de](https://stromhaltig.de)

**When reporting issues, include:**
- SDK version: `npm ls willi-mako-client`
- Node version: `node -v`
- Relevant logs or error messages

---

## 📄 License

Dieses Projekt steht unter der [MIT License](./LICENSE).

```
Copyright (c) 2025 STROMDAO GmbH
```

Frei nutzbar in Open-Source- und kommerziellen Projekten. Beiträge werden, sofern nicht anders angegeben, ebenfalls unter MIT veröffentlicht.

---

<div align="center">

**Made with 💚 by [STROMDAO](https://stromdao.de) and the [Willi-Mako Community](./COMMUNITY.md)**

[⭐ Star us on GitHub](https://github.com/energychain/willi-mako-client) • [💚 Become a Sponsor](https://github.com/sponsors/energychain) • [🤝 Join the Community](./COMMUNITY.md)

</div>

---

<div align="center">

Maintained with ⚡ by the STROMDAO community.

</div>
