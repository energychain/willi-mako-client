# Willi-Mako Client SDK – Example Playbook

This playbook illustrates how to combine the SDK, conversational endpoints and the CLI for comprehensive energy-market scenarios. Beyond EDIFACT message processing (UTILMD, MSCONS, ORDERS, PRICAT, INVOIC), you can leverage semantic search across regulatory documents (BNetzA, BDEW, VKU), query technical specifications (TAB, VDE-FNN), and integrate scientific studies for strategic analysis.

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. UTILMD Contract Change Validation](#1-utilmd-contract-change-validation)
- [2. MSCONS Meter Reading Clearing](#2-mscons-meter-reading-clearing)
- [3. ORDERS Incident Replay](#3-orders-incident-replay)
- [4. PRICAT Price Synchronisation](#4-pricat-price-synchronisation)
- [5. INVOIC Compliance Archiving](#5-invoic-compliance-archiving)
- [CLI Recipes](#cli-recipes)
- [Next Steps](#next-steps)

---

## Prerequisites

- Node.js 18+ with native `fetch`
- Valid Willi-Mako API token exported as `WILLI_MAKO_TOKEN`
- Familiarity with edi@energy processes and your organisation's Willi-Mako workspace structure

```bash
export WILLI_MAKO_TOKEN="your-api-token"
```

---

## 1. UTILMD Contract Change Validation

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();
const sessionId = 'lieferantenwechsel-2024-05';

const utilmd = `UNH+1+UTILMD:D:04B:UN:2.3e'
BGM+NIL:9+123456789'
DTM+137:202404221015:203'
...`;

// 1) Store raw message for audit
await client.createArtifact({
  sessionId,
  type: 'edifact-message',
  name: 'UTILMD_Lieferantenwechsel.edi',
  mimeType: 'text/plain',
  encoding: 'utf8',
  content: utilmd,
  tags: ['utilmd', 'lieferant', 'wechsel']
});

// 2) Run validation in sandbox
const validationJob = await client.createNodeScriptJob({
  sessionId,
  source: `
    const payload = ${JSON.stringify(utilmd)};
    const hasBGM = payload.includes("BGM+");
    console.log(JSON.stringify({ valid: hasBGM }));
  `,
  timeoutMs: 5000,
  metadata: { process: 'lieferantenwechsel', format: 'UTILMD' }
});

// 3) Persist validation result once job finishes
const jobId = validationJob.data.job.id;
let job = await client.getToolJob(jobId);
while (['queued', 'running'].includes(job.data.job.status)) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  job = await client.getToolJob(jobId);
}

await client.createArtifact({
  sessionId,
  type: 'validation-report',
  name: 'UTILMD_validation.json',
  mimeType: 'application/json',
  encoding: 'utf8',
  content: job.data.job.result?.stdout ?? '{}',
  tags: ['utilmd', 'validation', 'audit']
});
```

---

## 2. MSCONS Meter Reading Clearing

```typescript
const sessionId = 'mscons-clearing-2024-Q1';
const meterReadings = [
  { marktlokation: 'DE000123456789012345', value: 2350, timestamp: '2024-03-31T22:00:00Z' },
  { marktlokation: 'DE000123456789012346', value: 1244, timestamp: '2024-03-31T22:00:00Z' }
];

await client.createArtifact({
  sessionId,
  type: 'etl-input',
  name: 'mscons-readings.json',
  mimeType: 'application/json',
  encoding: 'utf8',
  content: JSON.stringify(meterReadings),
  tags: ['mscons', 'clearing', 'input']
});

const job = await client.createNodeScriptJob({
  sessionId,
  source: `
    const readings = ${JSON.stringify(meterReadings)};
    const anomalies = readings.filter(r => r.value < 0);
    console.log(JSON.stringify({ total: readings.length, anomalies }));
  `,
  metadata: { format: 'MSCONS', purpose: 'clearing' }
});
```

---

## 3. ORDERS Incident Replay

```typescript
const sessionId = 'orders-incident-2024-04-09';
const ordersPayload = `UNH+1+ORDERS:D:96A:UN:EAN005'
BGM+220+20240409-0001+9'
...`;

await client.createArtifact({
  sessionId,
  type: 'incident-input',
  name: 'ORDERS_incident.edi',
  mimeType: 'text/plain',
  encoding: 'utf8',
  content: ordersPayload,
  tags: ['orders', 'incident', 'klaerfallanalyse']
});

const replayJob = await client.createNodeScriptJob({
  sessionId,
  source: `
    const message = ${JSON.stringify(ordersPayload)};
    const supplierId = /\+([A-Z0-9]{13})'/.exec(message)?.[1];
    console.log(JSON.stringify({ supplierId }));
  `,
  metadata: { format: 'ORDERS', action: 'incident-replay' }
});
```

---

## 4. PRICAT Price Synchronisation

```typescript
const sessionId = 'pricat-sync-2024-05';
const priceList = {
  validity: '2024-05-01',
  entries: [
    { productId: 'P-1001', price: 0.322, unit: 'EUR/kWh' }
  ]
};

await client.createArtifact({
  sessionId,
  type: 'price-list',
  name: 'pricat-2024-05.json',
  mimeType: 'application/json',
  encoding: 'utf8',
  content: JSON.stringify(priceList, null, 2),
  tags: ['pricat', 'pricing', 'lieferant']
});
```

---

## 5. INVOIC Compliance Archiving

```typescript
const sessionId = 'invoic-archive-2024-02';
const invoicePdfBase64 = await readFileAsBase64('./examples/data/invoice.pdf');

await client.createArtifact({
  sessionId,
  type: 'invoice-document',
  name: 'INVOIC_2024-02-28.pdf',
  mimeType: 'application/pdf',
  encoding: 'base64',
  content: invoicePdfBase64,
  tags: ['invoic', 'audit', 'netzbetreiber'],
  metadata: { customerId: '9876543210', period: '2024-02' }
});
```

---

## CLI Recipes

```bash
# Validate UTILMD message using sandbox
willi-mako tools run-node-script \
  --session "lieferantenwechsel-2024-05" \
  --source "const msg = process.env.UTILMD; console.log(msg.includes('BGM+220'));" \
  --timeout 3000

# Start guided reasoning for a session
willi-mako reasoning generate \
  --session "lieferantenwechsel-2024-05" \
  --query "Erstelle eine Maßnahmenliste für offene MSCONS-Klärfälle" \
  --use-detailed-intent-analysis

# Run semantic search and save the best hit as artifact
willi-mako retrieval semantic-search --session "lieferantenwechsel-2024-05" --query "BDEW Lieferantenwechsel Leitfaden" --options '{"limit":1}' \
  | jq -r '.data.results[0].payload' \
  | willi-mako artifacts create --session "lieferantenwechsel-2024-05" --type knowledge-snippet --name "leitfaden.json" --mime application/json

# Create MSCONS clearing report from file
cat data/mscons-clearing.json | willi-mako artifacts create \
  --session "mscons-clearing-2024-Q1" \
  --type "clearing-report" \
  --name "mscons-clearing-2024-Q1.json" \
  --mime "application/json"

# Generate deterministic tool with contextual attachments
willi-mako tools generate-script \
  --query "Baue ein Skript, das MSCONS-Profilwerte mit CSV-Daten abgleicht" \
  --attachment "./docs/mscons-bilanzierung.md|text/markdown|Bilanzierungsleitfaden" \
  --attachment '{"path":"./data/profilwerte.csv","mimeType":"text/csv","description":"Profilwerte Q1","weight":0.3}'

# Search for market partners (v0.9.0) - public endpoint, no auth required
willi-mako market-partners search --query "Stadtwerke München" --limit 5

# Search by BDEW code
willi-mako market-partners search --query "9900123456789"

# Filter by market role (distribution network operators)
willi-mako market-partners search --query "Stadtwerke" --role VNB --limit 20

# Export all distribution network operators as CSV
willi-mako market-partners search --query "Netz" --role VNB --csv > vnb-liste.csv

# Filter by suppliers (Lieferanten)
willi-mako market-partners search --query "Energie" --role LF --limit 20

# Filter by metering point operators
willi-mako market-partners search --query "Mess" --role MSB --limit 20

# Get detailed JSON output for further processing
willi-mako market-partners search --query "Berlin" --json | jq '.data.results[] | {name: .companyName, code: .code, contacts: .contacts | length}'
```

> 💡 `willi-mako tools generate-script` startet seit v0.3 eine asynchrone Job-Pipeline. Die CLI zeigt Live-Updates zu `status`, `progress.stage` (z. B. `collecting-context`, `prompting`, `drafting`) sowie etwaige Warnungen an und beendet sich erst, wenn der Job `succeeded` oder `failed` erreicht. Mit `--json` erhältst du neben dem generierten Skript auch das vollständige Job-Objekt (`data.job`) inklusive `attempts`, `warnings`, `repairHistory` und `progressLog`. Über `--attachment` reichst du bis zu vier zusätzliche Textquellen (je ≤ ca. 1 MB Text, kombiniert ≤ ca. 2 MB) an, um die Prompterstellung zu steuern – wahlweise als `pfad|mimeType|Beschreibung|Gewicht` oder JSON. Bei Fehlern unternimmt die CLI automatisch bis zu drei Reparaturversuche (`♻️`-Logs), sofern der Fehlercode dies unterstützt. Deaktiviere dies mit `--no-auto-repair` oder passe die Versuchsanzahl mit `--repair-attempts` an. Ist zusätzlich `GEMINI_API_KEY` gesetzt, optimiert die CLI die Prompt-Anforderung mit `gemini-2.5-pro` und protokolliert die vorgeschlagene Validierungs-Checkliste im Terminal.

---

## Next Steps

- Explore the [`examples/`](../examples) folder for runnable scripts.
- Combine artifacts with your DWH/ETL tooling (e.g., Apache Airflow, Prefect, dbt) to automate compliance checkpoints.
- Contribute your best practices back to the community via pull requests or discussions.
```

> 💡 `willi-mako tools generate-script` startet seit v0.3 eine asynchrone Job-Pipeline. Die CLI zeigt Live-Updates zu `status`, `progress.stage` (z. B. `collecting-context`, `prompting`, `drafting`) sowie etwaige Warnungen an und beendet sich erst, wenn der Job `succeeded` oder `failed` erreicht. Mit `--json` erhältst du neben dem generierten Skript auch das vollständige Job-Objekt (`data.job`) inklusive `attempts`, `warnings`, `repairHistory` und `progressLog`. Über `--attachment` reichst du bis zu vier zusätzliche Textquellen (je ≤ ca. 1 MB Text, kombiniert ≤ ca. 2 MB) an, um die Prompterstellung zu steuern – wahlweise als `pfad|mimeType|Beschreibung|Gewicht` oder JSON. Bei Fehlern unternimmt die CLI automatisch bis zu drei Reparaturversuche (`♻️`-Logs), sofern der Fehlercode dies unterstützt. Deaktiviere dies mit `--no-auto-repair` oder passe die Versuchsanzahl mit `--repair-attempts` an. Ist zusätzlich `GEMINI_API_KEY` gesetzt, optimiert die CLI die Prompt-Anforderung mit `gemini-2.5-pro` und protokolliert die vorgeschlagene Validierungs-Checkliste im Terminal.

---

## Next Steps

- Explore the [`examples/`](../examples) folder for runnable scripts.
- Combine artifacts with your DWH/ETL tooling (e.g., Apache Airflow, Prefect, dbt) to automate compliance checkpoints.
- Contribute your best practices back to the community via pull requests or discussions.
