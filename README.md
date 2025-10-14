# 🔌 Willi-Mako Client SDK

<div align="center">

[![npm version](https://img.shields.io/npm/v/willi-mako-client)](https://www.npmjs.com/package/willi-mako-client)
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

**Willi-Mako** ist die Wissens- und Automatisierungsplattform für Marktkommunikation (*MaKo*) der deutschen Energiewirtschaft. Sie unterstützt Marktrollen wie **Lieferanten**, **Netzbetreiber** und **Messstellenbetreiber** bei Aufgaben rund um edi@energy-Standards, regulatorische Prüfungen und KI-gestützte Workflows.

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
- 🛠️ **Tooling Sandbox** – sichere Node.js-Ausführung für ETL, Validierung, KI-Skripte.
- 🗂️ **Artifact Storage** – persistente Protokolle, Audit-Trails und EDIFACT-Snapshots.
- 📦 **OpenAPI Bundle** – `schemas/openapi.json` für offline Analysen.
- 🖥️ **CLI & MCP** – vollständige Befehlsgruppen (`auth`, `sessions`, `chat`, `retrieval`, …) plus MCP-Server für KI-Agenten.
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
   - **Tool-Login**: Ohne Header lässt sich `willi-mako.login` nutzen; das Token wird pro MCP-Session gespeichert.
   - **Ad-hoc Sessions**: Wenn Tools ohne `sessionId` aufgerufen werden, erstellt der Server automatisch eine Session und gibt die ID im Response-Body zurück.

   👉 Für Schritt-für-Schritt-Anleitungen zu VS Code, Claude, ChatGPT, anythingLLM und n8n siehe [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md#schritt-für-schritt-mcp-integrationen-in-gängigen-umgebungen).

2. **Bereitgestellte Tools & Ressourcen**
   - `willi-mako.login`, `willi-mako.create-session`, `willi-mako.get-session`, `willi-mako.delete-session`
   - `willi-mako.chat`, `willi-mako.semantic-search`, `willi-mako.reasoning-generate`
   - `willi-mako.resolve-context`, `willi-mako.clarification-analyze`
   - `willi-mako.generate-tool` – erstellt auf Zuruf lauffähige Node.js-Skripte für MaKo-Workflows
   - `willi-mako.create-node-script`, `willi-mako.get-tool-job`, `willi-mako.create-artifact`
   - Ressource `willi-mako://openapi` – liefert die aktuelle OpenAPI-Spezifikation

3. **VS Code / GitHub Copilot verbinden**:
   ```bash
   code --add-mcp '{"name":"willi-mako","type":"http","url":"http://localhost:7337/mcp"}'
   ```

   Danach lassen sich die Tools direkt in Copilot-Chat verwenden (z. B. `@willi-mako.semantic-search`).

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

Mit `willi-mako tools generate-script` lässt sich der Reasoning-Stack bitten, ein lauffähiges Node.js-Tool zu erstellen. Sessions werden bei Bedarf automatisch erzeugt; das Ergebnis kann direkt auf der Konsole erscheinen, in eine Datei geschrieben oder als Artefakt gespeichert werden.

```bash
# Skript generieren und lokal als Datei ablegen
willi-mako tools generate-script \
   --query "Erstelle mir ein Tool, das MSCONS-Nachrichten in CSV konvertiert" \
   --output mscons-to-csv.mjs

# Optional: Artefakt in Willi-Mako persistieren
willi-mako tools generate-script \
   --query "Generiere ein Prüftool für UTILMD und liefere JSON-Ausgabe" \
   --artifact --artifact-name utilmd-validator.mjs
```

> 💡 Über `--input-mode` (`file`, `stdin`, `environment`) und `--output-format` (`csv`, `json`, `text`) steuerst du, wie die generierten Skripte Ein- und Ausgabe handhaben sollen. Mit `--json` erhältst du die Antwort inklusive Skript als strukturiertes JSON.

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

- SDK-Version (`npm ls willi-mako-client`)
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
