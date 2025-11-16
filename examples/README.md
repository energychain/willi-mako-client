# 🧪 Beispiele für Willi-Mako Client SDK

Dieses Verzeichnis enthält vollständige, ausführbare Beispiele für typische Anwendungsfälle in der Energiewirtschaft.

## 📋 Verfügbare Beispiele

### 1. Marktpartner-Suche (`market-partner-search.ts`)

**Fachlich:** Finde Netzbetreiber, Lieferanten oder Messstellenbetreiber über BDEW/EIC-Codes, Namen oder Städte.

**Technisch:** Zeigt die Nutzung der öffentlichen Market Partners API (kein Login erforderlich).

```bash
npm run example:market-search
# oder direkt:
node --loader ts-node/esm examples/market-partner-search.ts
```

---

### 2. EDIFACT-Nachricht analysieren (`edifact-analyzer-demo.ts`)

**Fachlich:** Analysiere, validiere und erkläre EDIFACT-Nachrichten (UTILMD, MSCONS, ORDERS, etc.).

**Technisch:** Demonstriert alle EDIFACT-Tools: Analyse, Validierung, Erklärung, Modifikation und Chat.

```bash
npm run example:edifact-analyze
```

**Voraussetzung:** Login-Credentials via ENV-Variablen oder `.env`-Datei.

---

### 3. Lieferantenwechsel validieren (`utilmd-audit.ts`)

**Fachlich:** Prüfe UTILMD-Nachrichten (Format Z01 = Anmeldung) auf Korrektheit und speichere Audit-Trails.

**Technisch:** Session-Management, Sandbox-Jobs und Artifact-Storage.

```bash
npm run example:utilmd
```

---

### 4. Zählerstandsdaten prüfen (`mscons-clearing.ts`)

**Fachlich:** Erkenne Anomalien in MSCONS-Daten (negative Werte, fehlende Zeitstempel, Ausreißer).

**Technisch:** ETL-Pipeline mit Sandbox-Jobs zur Datenvalidierung.

```bash
npm run example:mscons
```

---

### 5. Bestellprozess nachvollziehen (`orders-incident-report.ts`)

**Fachlich:** Analysiere fehlgeschlagene ORDERS-Nachrichten und erstelle Incident-Reports.

**Technisch:** Parsing, Extraktion und strukturierte Speicherung von Geschäftsvorfällen.

```bash
npm run example:orders
```

---

### 6. Preislistenabgleich (`pricat-price-sync.ts`)

**Fachlich:** Synchronisiere PRICAT-Daten (Netzentgelte, Preiszonen) mit internen Systemen.

**Technisch:** Automatische Preisverarbeitung via Sandbox-Jobs.

```bash
npm run example:pricat
```

---

### 7. Rechnungsprüfung (`invoic-archive.ts`)

**Fachlich:** Archiviere INVOIC-Nachrichten compliance-konform (10 Jahre Aufbewahrungspflicht).

**Technisch:** Langzeit-Sessions und revisionssichere Artifact-Speicherung.

```bash
npm run example:invoic
```

---

### 8. MCP Server (`mcp-server.ts`)

**Technisch:** Starte einen Model Context Protocol Server für AI-Agenten.

```bash
node --loader ts-node/esm examples/mcp-server.ts
```

Weitere Details: [`docs/MCP_SERVICE.md`](../docs/MCP_SERVICE.md)

---

### 9. Web Dashboard (`web-dashboard.ts`)

**Technisch:** Lightweight Browser-UI für EDIFACT-Analyse ohne lokale Node.js-Installation.

```bash
node --loader ts-node/esm examples/web-dashboard.ts
```

Weitere Details: [`docs/INTEGRATIONS.md`](../docs/INTEGRATIONS.md#lightweight-web-interface)

---

## 🐳 Docker

Alle Beispiele können auch in Docker-Containern ausgeführt werden:

```bash
cd examples/docker
docker build -t willi-mako-examples .
docker run --rm -e WILLI_MAKO_TOKEN="$WILLI_MAKO_TOKEN" willi-mako-examples
```

Siehe: [`examples/docker/README.md`](./docker/README.md)

---

## 🔐 Authentifizierung

Die meisten Beispiele benötigen Login-Credentials. Zwei Optionen:

### Option A: Umgebungsvariablen

```bash
export WILLI_MAKO_EMAIL='deine@email.de'
export WILLI_MAKO_PASSWORD='dein-passwort'
```

### Option B: API-Token

```bash
export WILLI_MAKO_TOKEN='dein-token'
```

**Token generieren:** Melde dich bei [stromhaltig.de/app/](https://stromhaltig.de/app/) an → Einstellungen → API-Token

---

## 📖 Weiterführende Dokumentation

- 📘 [API-Dokumentation](../docs/API.md)
- 🧪 [Weitere Code-Beispiele](../docs/EXAMPLES.md)
- 🚀 [Gitpod Quickstart (für Einsteiger)](../docs/GITPOD_QUICKSTART.md)
- 🔌 [MCP-Server-Integration](../docs/MCP_SERVICE.md)
- 🐳 [Docker & Integrationen](../docs/INTEGRATIONS.md)

---

## 💡 Tipps

- **Gitpod verwenden**: Teste alle Beispiele direkt im Browser ohne lokale Installation!
  [![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/energychain/willi-mako-client)

- **Debugging**: Setze `DEBUG=willi-mako:*` für verbose Logging

- **Eigene Beispiele**: Die Beispiele sind als Vorlagen gedacht – passe sie an deine Use Cases an!

---

**Bei Fragen:** [GitHub Discussions](https://github.com/energychain/willi-mako-client/discussions) oder dev@stromdao.com
