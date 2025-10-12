# 🔌 Willi-Mako Client SDK

<div align="center">

[![npm version](https://img.shields.io/npm/v/@stromhaltig/willi-mako-client)](https://www.npmjs.com/package/@stromhaltig/willi-mako-client)
[![CI](https://github.com/energychain/willi-mako-client/actions/workflows/ci.yml/badge.svg)](https://github.com/energychain/willi-mako-client/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/energychain/willi-mako-client/branch/main/graph/badge.svg)](https://codecov.io/gh/energychain/willi-mako-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

**Offizielles TypeScript SDK & CLI für die AI-Plattform [Willi-Mako](https://stromhaltig.de) von STROMDAO GmbH.**

</div>

> **Kurzüberblick (DE):** Willi-Mako digitalisiert die Marktkommunikation der Energiewirtschaft. Das SDK stellt geprüfte Prozesse rund um UTILMD, MSCONS, ORDERS, PRICAT, INVOIC und weitere Formate für ETL-Pipelines, Compliance-Automatisierung und KI-gestützte Workflows bereit.

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
  - [GitPod Quickstart](#gitpod-quickstart)
- [Core Use Cases](#-core-use-cases)
- [API Overview](#-api-overview)
- [CLI Usage](#-cli-usage)
- [Examples](#-examples)
- [Documentation](#-documentation)
- [Development](#-development)
- [Integrations (Docker, Power BI, n8n)](#-integrations-docker-power-bi-n8n)
- [Contributing](#-contributing)
- [Support](#-support)
- [License](#-license)

---

## 🌍 About the Project

**Willi-Mako** ist die Wissens- und Automatisierungsplattform für Marktkommunikation (*Marktkommunikation*) der deutschen Energiewirtschaft. Sie unterstützt Marktrollen wie **Lieferanten**, **Netzbetreiber** und **Messstellenbetreiber** bei Aufgaben rund um edi@energy-Standards, regulatorische Prüfungen und KI-gestützte Workflows.

Mit dem SDK erhalten Sie:

- ⚡ Einen typisierten TypeScript-Client für das produktive API v2 (`https://stromhaltig.de/api/v2`).
- 🖥️ Ein CLI (`willi-mako`) für Ad-hoc-Tests, Automatisierung und CI/CD.
- 📦 Eine gebündelte OpenAPI-Spezifikation für Code-Generatoren und Dritttools.
- 📘 Dokumentation, Beispiele und Integrationsanleitungen (Docker, MCP, GitPod, Power BI, n8n).

![Willi-Mako Architekturüberblick](./docs/media/willi-mako-architecture.svg)

---

## ✨ Key Features

- 🚀 **Zero-config defaults** – sofort produktiv mit `https://stromhaltig.de/api/v2`.
- 🔐 **Flexible Auth** – via `WILLI_MAKO_TOKEN`, expliziten Token oder Secrets-Manager.
- 🧠 **Tooling Sandbox** – sichere Node.js-Ausführung für ETL, Validierung, KI-Skripte.
- 🗂️ **Artifact Storage** – persistente Protokolle, Audit-Trails und EDIFACT-Snapshots.
- 📦 **OpenAPI Bundle** – `schemas/openapi.json` für offline Analysen.
- 🖥️ **CLI** – `willi-mako openapi`, `willi-mako tools run-node-script`, u. v. m.
- 🧪 **Vitest Testsuite** – Vertrauen in Stabilität und Regressionen.
- 🛡️ **Compliance Fokus** – automatisierbare Prüfungen für UTILMD, MSCONS, ORDERS, PRICAT, INVOIC.

---

## 📦 Installation

```bash
npm install @stromhaltig/willi-mako-client
# oder
pnpm add @stromhaltig/willi-mako-client
# oder
yarn add @stromhaltig/willi-mako-client
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
   import { WilliMakoClient } from '@stromhaltig/willi-mako-client';

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

Expose die Plattform als **Model Context Protocol (MCP)**-Server, damit interne LLMs geprüfte Marktkommunikationsprozesse anstoßen können. Ein komplettes Beispiel liegt unter [`examples/mcp-server.ts`](./examples/mcp-server.ts).

1. **Server starten** (setzt `WILLI_MAKO_TOKEN` voraus):
   ```bash
   node --loader ts-node/esm examples/mcp-server.ts
   ```

   Optionale Variablen:
   ```bash
   export PORT=7337
   export WILLI_MAKO_BASE_URL="https://stromhaltig.de/api/v2"
   ```

2. **Bereitgestellte Tools & Ressourcen**
   - `willi-mako.create-node-script` – führt Sandbox-Jobs aus
   - `willi-mako.get-tool-job` – liefert Status, stdout, stderr
   - `willi-mako.create-artifact` – speichert Artefakte im Audit Store
   - Ressource `willi-mako://openapi` – liefert die aktuelle OpenAPI-Spezifikation

3. **VS Code / GitHub Copilot verbinden**:
   ```bash
   code --add-mcp '{"name":"willi-mako","type":"http","url":"http://localhost:7337/mcp"}'
   ```

   Danach lassen sich die Tools direkt in Copilot-Chat verwenden (z. B. `@willi-mako.create-node-script`).

4. **Weitere Clients**: Claude Desktop, Cursor, LangChain, Semantic Kernel etc. sprechen ebenfalls den Streamable-HTTP-Transport an. Details siehe [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md#mcp-server-und-ki-entwicklungsumgebungen).

### Lightweight Web UI Quickstart

Für MaKo-Fachbereiche ohne lokale Node.js-Installation liegt unter [`examples/web-dashboard.ts`](./examples/web-dashboard.ts) ein leichtgewichtiger HTTP-Server.

1. **Abhängigkeiten installieren** (nutzt nur Kernmodule, kein zusätzliches npm-Paket nötig):
   ```bash
   npm install
   ```

2. **Server starten**:
   ```bash
   node --loader ts-node/esm examples/web-dashboard.ts
   ```

3. **Im Browser öffnen**: `http://localhost:4173`

4. **Formular verwenden** – EDIFACT-Message einfügen, Preview starten. Der Server erstellt intern Sandbox-Jobs, pollt Ergebnisse und zeigt Output sowie Artefakt-Vorschläge an.

![Web Dashboard Vorschau](./docs/media/web-dashboard-screenshot.svg)

Weitere Anpassungen (Authentifizierung, Mehrbenutzer, Branding) sind in [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md#lightweight-web-interface) beschrieben.

### GitPod Quickstart

1. **Öffnen**:
   ```
   https://gitpod.io/#https://github.com/energychain/willi-mako-client
   ```

2. **Workspace initialisiert**: `npm install`, `npm run build`, `npm test`.

3. **Secrets setzen**:
   ```bash
   gp env WILLI_MAKO_TOKEN="<dein-token>"
   ```

4. **CLI nutzen** oder Beispiele ausführen (`willi-mako openapi`, `node --loader ts-node/esm examples/utilmd-audit.ts`).

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
| `getRemoteOpenApiDocument()` | Aktuelle OpenAPI laden | – | Für Schema-Diffs & Code-Gen |
| `createNodeScriptJob()` | Sandbox-Job starten | UTILMD, MSCONS, ORDERS, PRICAT, INVOIC | Rückgabe: Job-ID & Status |
| `getToolJob(jobId)` | Job-Status + Ergebnisse | – | Polling bis `succeeded` oder `failed` |
| `createArtifact()` | Artefakt speichern | Reports, EDIFACT, Compliance | Unterstützt Metadaten & Tags |

Fehler führen zu `WilliMakoError` mit `status` und `body`. Vollständige Typen siehe [`src/types.ts`](./src/types.ts) und [`docs/API.md`](./docs/API.md).

---

## 🖥️ CLI Usage

```bash
npx @stromhaltig/willi-mako-client --help
```

**Typische Befehle:**

```bash
# OpenAPI anzeigen (remote)
willi-mako openapi

# Sandbox-Job ausführen
willi-mako tools run-node-script \
  --session "session-uuid" \
  --source 'console.log("Hello ETL world")' \
  --timeout 5000

# Job-Status prüfen
willi-mako tools job <job-id>

# Artefakt aus Datei erstellen
cat compliance.json | willi-mako artifacts create \
  --session "session-uuid" \
  --name "compliance.json" \
  --type "compliance-report" \
  --mime "application/json"
```

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
└── dist/             # Build-Ausgabe (gitignored)
```

> Siehe [`CONTRIBUTING.md`](./CONTRIBUTING.md) für Coding-Guidelines, Branch-Strategie und Review-Checklisten.

---

## 🔌 Integrations (Docker, Power BI, n8n)

Der neue Leitfaden [`docs/INTEGRATIONS.md`](./docs/INTEGRATIONS.md) beschreibt Schritt für Schritt:

- Docker-Workspaces & Compose-Setups für isoliertes CLI- oder Skript-Hosting.
- Aufbau des Lightweight Web Dashboards (Proxy, Auth, Branding).
- Direct Queries aus **Microsoft Power BI** (REST-Connector, Parameter, Token-Verwaltung).
- **n8n Workflows** (HTTP Request Node, Credentials, Node-Scripting mit Willi-Mako).

---

## 🤝 Contributing

Wir freuen uns über Beiträge aus der Energie-Community!

1. [Code of Conduct](./CODE_OF_CONDUCT.md) lesen.
2. [CONTRIBUTING.md](./CONTRIBUTING.md) beachten.
3. Offene [Issues](https://github.com/energychain/willi-mako-client/issues) prüfen oder neue Diskussion starten.

Bitte bei Pull Requests:

- Tests und Dokumentation aktualisieren.
- Aussagekräftige Commit-Messages (`feat:`, `fix:`, `docs:` …).
- Use-Case oder Problemstellung beschreiben.

---

## 💬 Support

- 📩 **Mail**: [dev@stromdao.com](mailto:dev@stromdao.com)
- 🌐 **Website**: [stromhaltig.de](https://stromhaltig.de)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/energychain/willi-mako-client/issues)
- 💡 **Feature-Ideen**: [GitHub Discussions](https://github.com/energychain/willi-mako-client/discussions)

Bitte angeben:

- SDK-Version (`npm ls @stromhaltig/willi-mako-client`)
- Node-Version (`node -v`)
- Relevante Logs oder Artefakt-Metadaten

---

## 📄 License

Dieses Projekt steht unter der [MIT License](./LICENSE).

```
Copyright (c) 2025 STROMDAO GmbH
```

Frei nutzbar in Open-Source- und kommerziellen Projekten. Beiträge werden, sofern nicht anders angegeben, ebenfalls unter MIT veröffentlicht.

---

<div align="center">

Maintained with ⚡ by the STROMDAO community.

</div>
