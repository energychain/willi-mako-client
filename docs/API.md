# Willi-Mako Client SDK – API Reference

This document provides an overview of the TypeScript/JavaScript API exposed by `@stromhaltig/willi-mako-client`. Refer to the generated type definitions in `dist/index.d.ts` for full detail.

## Table of Contents

- [Instantiating the Client](#instantiating-the-client)
- [Authentication](#authentication)
- [Methods](#methods)
  - [`login(credentials, options?)`](#logincredentials-options)
  - [`createSession(payload)`](#createsessionpayload)
  - [`getSession(sessionId)`](#getsessionsessionid)
  - [`deleteSession(sessionId)`](#deletesessionsessionid)
  - [`chat(payload)`](#chatpayload)
  - [`semanticSearch(payload)`](#semanticsearchpayload)
  - [`generateReasoning(payload)`](#generatereasoningpayload)
  - [`resolveContext(payload)`](#resolvecontextpayload)
  - [`analyzeClarification(payload)`](#analyzeclarificationpayload)
  - [`getBundledOpenApiDocument()`](#getbundledopenapidocument)
  - [`getRemoteOpenApiDocument()`](#getremoteopenapidocument)
  - [`createNodeScriptJob(payload)`](#createnodescriptjobpayload)
  - [`getToolJob(jobId)`](#gettooljobjobid)
  - [`createArtifact(payload)`](#createartifactpayload)
  - [EDIFACT Message Analyzer Methods](#edifact-message-analyzer-methods-v070)
    - [`analyzeEdifactMessage(payload)`](#analyzeedifactmessagepayload)
    - [`validateEdifactMessage(payload)`](#validateedifactmessagepayload)
    - [`explainEdifactMessage(payload)`](#explainedifactmessagepayload)
    - [`modifyEdifactMessage(payload)`](#modifyedifactmessagepayload)
    - [`chatAboutEdifactMessage(payload)`](#chataboutedifactmessagepayload)
  - [`setToken(token)`](#settokentoken)
  - [`getBaseUrl()`](#getbaseurl)
- [Error Handling](#error-handling)
- [Types](#types)
- [Rate Limiting & Performance](#rate-limiting--performance)
- [Version Compatibility](#version-compatibility)

---

## Instantiating the Client

```typescript
import { WilliMakoClient } from '@stromhaltig/willi-mako-client';

const client = new WilliMakoClient({
  baseUrl: 'https://stromhaltig.de/api/v2',
  token: process.env.WILLI_MAKO_TOKEN
});
```

### `WilliMakoClientOptions`

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `baseUrl` | `string` | `https://stromhaltig.de/api/v2` | Base URL of the API (strip trailing `/`). |
| `token` | `string \| null` | `process.env.WILLI_MAKO_TOKEN ?? null` | Bearer token for authentication. |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation (for tests or polyfills). |

---

## Authentication

The SDK automatically attaches a `Bearer` token to requests when `token` is provided. You may change the token at runtime:

```typescript
client.setToken('new-token');
```

To perform unauthenticated requests (e.g., fetching the OpenAPI schema), pass `skipAuth: true` via request options (handled internally for `getRemoteOpenApiDocument`).

---

## Methods

### `login(credentials, options?)`

Authenticates via email/password and returns a JWT token envelope.

```typescript
const auth = await client.login({ email: 'user@example.com', password: 'secret' });
console.log(auth.data.accessToken);
```

- `credentials` – `LoginRequest` (`email`, `password`).
- `options.persistToken` *(default `true`)* – store the returned token on the client instance for subsequent calls.

> Call with `{ persistToken: false }` if you only need the token for immediate use and prefer manual storage. When disabled, the client clears any previously stored token so follow-up requests remain unauthenticated until you reapply one explicitly.

### `createSession(payload)`

Creates a new workspace session with optional preferences and context settings.

```typescript
const session = await client.createSession({
  ttlMinutes: 60,
  preferences: { companiesOfInterest: ['DE000123456789012345'] }
});
```

- `payload.preferences` – bias retrieval and reasoning towards specific companies/topics.
- `payload.contextSettings` – arbitrary configuration object passed to the backend.
- `payload.ttlMinutes` – lifespan in minutes (minimum 1).

Returns `SessionEnvelopeResponse` with policy flags, workspace context and expiry timestamps.

### `getSession(sessionId)`

Fetches metadata for an existing session.

```typescript
const envelope = await client.getSession('session-uuid');
console.log(envelope.data.policyFlags);
```

Useful for rehydrating stateful workflows or inspecting granted capabilities.

### `deleteSession(sessionId)`

Deletes a session including associated artefacts and sandbox jobs.

```typescript
await client.deleteSession('session-uuid');
```

Expect an empty (204) response when successful.

### `chat(payload)`

Sends a conversational message to the Willi-Mako assistant.

```typescript
const reply = await client.chat({
  sessionId,
  message: 'Welche MSCONS-Anomalien wurden entdeckt?'
});
```

Optional fields:
- `contextSettings` – temporary override of context for the message.
- `timelineId` – attach events to a shared timeline.

Returns a `ChatResponse` with assistant reply and metadata.

### `semanticSearch(payload)`

Executes hybrid semantic retrieval across the Willi-Mako knowledge graph.

```typescript
const results = await client.semanticSearch({
  sessionId,
  query: 'Flexibilitätsverordnung',
  options: { limit: 5, outlineScoping: true }
});
```

- `options.limit` – cap number of results (1–100).
- `options.alpha` – balance semantic vs. lexical retrieval.
- `options.outlineScoping` – request outline-based scoping.
- `options.excludeVisual` – omit visual artefacts.

### `generateReasoning(payload)`

Runs the multi-step reasoning pipeline for complex tasks.

```typescript
const reasoning = await client.generateReasoning({
  sessionId,
  query: 'Erstelle einen Maßnahmenplan für den Netzengpass',
  useDetailedIntentAnalysis: true
});
```

Provide optional `messages` history, `contextSettingsOverride`, `preferencesOverride`, or `overridePipeline` to fine-tune behaviour.

### `resolveContext(payload)`

Determines routing, decisions and additional resources required for a user request.

```typescript
const context = await client.resolveContext({ sessionId, query: 'Welche Datenpunkte fehlen?' });
```

Returns `ContextResolveResponse` with `decision`, `contextSettingsUsed` and public/user context breakdowns.

### `analyzeClarification(payload)`

Evaluates whether clarification questions are needed before continuing.

```typescript
const clarification = await client.analyzeClarification({
  sessionId,
  query: 'Bitte starte den Lieferantenwechsel',
  includeEnhancedQuery: true
});
```

Use the `analysis` payload to surface suggested clarification questions or enhanced queries.

### `getBundledOpenApiDocument()`

Returns the OpenAPI document bundled with the current package version.

```typescript
const schema = client.getBundledOpenApiDocument();
console.log(schema.info.version);
```

Use this for offline tooling or code generation that should match the installed SDK.

### `getRemoteOpenApiDocument()`

Fetches the latest OpenAPI schema from the API (no authentication required).

```typescript
const remoteSchema = await client.getRemoteOpenApiDocument();
```

> **Tip:** Compare bundled vs. remote schema to detect new endpoints before upgrading.

### `generateToolScript(params)`

Triggers the deterministic tooling generator. The helper wraps job polling and returns the final script once the asynchronous job succeeds.

```typescript
const generation = await generateToolScript({
  client,
  sessionId,
  query: 'Bilanzkreistreue aus MSCONS prüfen',
  preferredInputMode: 'file',
  outputFormat: 'csv',
  attachments: [
    {
      filename: 'leitfaden.md',
      content: await fs.readFile('docs/leitfaden.md', 'utf8'),
      description: 'Interne Validierungsregeln',
      weight: 0.6
    }
  ]
});

console.log(generation.suggestedFileName, generation.descriptor.validation);
```

**Parameter**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `client` | `ToolGenerationClient` | ✅ | Minimal client with `generateToolScript`, `getToolJob` **und** `repairToolScript`. |
| `sessionId` | `string` | ✅ | Session that owns the job and resulting artefacts. |
| `query` | `string` | ✅ | Natürliche Sprache Beschreibung des gewünschten Tools. |
| `preferredInputMode` | `'file' \| 'stdin' \| 'environment'` | ❌ | Steuerung der Eingabeverarbeitung im generierten Skript. |
| `outputFormat` | `'csv' \| 'json' \| 'text'` | ❌ | Erwartetes Ausgabeformat. |
| `includeShebang` | `boolean` | ❌ | Steuert, ob `#!/usr/bin/env node` vorangestellt wird (Standard: `true`). |
| `additionalContext` | `string` | ❌ | Weitere fachliche Hinweise oder Randbedingungen. |
| `attachments` | `ToolScriptAttachment[]` | ❌ | Bis zu vier Textdateien (≤ ≈ 1 MB Text je Datei, ≤ ≈ 2 MB kombiniert) mit optionalem MIME-Type, Beschreibung und Gewichtung zur Kontextanreicherung. |
| `autoRepair` | `boolean` | ❌ | Aktiviert automatische Reparaturen bekannter Fehlercodes (Standard: `true`). |
| `maxAutoRepairAttempts` | `number` | ❌ | Obergrenze für automatische Reparaturversuche (Standard: `3`). |
| `repairAdditionalContext` | `string` | ❌ | Zusatzkontext (≤ 2000 Zeichen) für jede Reparaturanfrage. |
| `repairInstructionBuilder` | `(job) => string \| undefined` | ❌ | Individueller Builder für Reparaturhinweise (Rückgabe von `undefined` nutzt Standardhinweise). |
| `onJobUpdate` | `(job) => void` | ❌ | Callback für Live-Updates (`status`, `progress.stage`, `warnings`). |
| `onRepairAttempt` | `(attempt) => void` | ❌ | Callback, sobald ein Reparaturversuch abgeschlossen wurde. |
| `onPromptEnhancement` | `(enhancement) => void` | ❌ | Benachrichtigt über automatisch erzeugte Prompt-Optimierungen (z. B. Gemini). |

> 💡 Wenn die Umgebungsvariable `GEMINI_API_KEY` gesetzt ist, verwendet der Client automatisch das Modell `gemini-2.5-pro`, um die Nutzeranforderung zu präzisieren und eine Validierungs-Checkliste vorzuschlagen. Die Optimierung läuft rein clientseitig und wird bei Fehlern stillschweigend übersprungen.

**Rückgabewerte**

`generateToolScript` liefert ein Objekt mit `code`, `descriptor`, `job`, `inputSchema`, `expectedOutputDescription`, `summary`, `description`, `suggestedFileName`, `repairHistory` **sowie** `promptEnhancement`. Letzteres beschreibt, welches Optimierungsmodell (z. B. Gemini) aktiv war, wie die Anfrage angepasst wurde und welche Validierungs-Checkliste hinzugefügt wurde.

Laufen alle automatischen Versuche aus, bevor ein Erfolg erzielt wird, löst die Funktion eine `ToolGenerationRepairLimitReachedError` aus. Für nicht reparierbare Fehler oder deaktivierte Automatik wird weiterhin `ToolGenerationJobFailedError` geworfen.

### `createNodeScriptJob(payload)`

Submits JavaScript/TypeScript code to the Willi-Mako tooling sandbox.

```typescript
const job = await client.createNodeScriptJob({
  sessionId: 'session-uuid',
  source: 'console.log("Hello Marktkommunikation")',
  timeoutMs: 5000,
  metadata: { format: 'UTILMD', purpose: 'compliance-check' }
});
```

**Payload fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | ✅ | Links job to a Willi-Mako session. |
| `source` | `string` | ✅ | Node.js source code executed in sandbox. |
| `timeoutMs` | `number` | ❌ | Optional execution timeout (500 – 60,000). |
| `metadata` | `Record<string, unknown>` | ❌ | Arbitrary metadata for auditing/ETL context. |

**Response:** `RunNodeScriptJobResponse` with `success`, `data.sessionId`, `data.job`.

### `getToolJob(jobId)`

Retrieves status and results for a sandbox job.

```typescript
let job = await client.getToolJob(jobId);
while (['queued', 'running'].includes(job.data.job.status)) {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  job = await client.getToolJob(jobId);
}

if (job.data.job.status === 'succeeded') {
  console.log(job.data.job.result?.stdout);
}
```

Returned `ToolJob` includes diagnostics, warnings, stdout, stderr, and timing information.

### `createArtifact(payload)`

Stores an artifact (e.g., UTILMD message, compliance report, MSCONS validation).

```typescript
await client.createArtifact({
  sessionId: 'session-uuid',
  type: 'edifact-message',
  name: 'ORDERS_2024-03-15.edi',
  mimeType: 'text/plain',
  encoding: 'utf8',
  content: edifactPayload,
  tags: ['orders', 'audit'],
  metadata: { process: 'lieferantenwechsel', role: 'netzbetreiber' }
});
```

**Payload fields:** see `CreateArtifactRequest` in [`src/types.ts`](../src/types.ts) for full detail.

### EDIFACT Message Analyzer Methods (v0.7.0)

The EDIFACT Message Analyzer provides comprehensive tools for analyzing, validating, explaining, modifying, and discussing EDIFACT messages used in German energy market communication.

#### `analyzeEdifactMessage(payload)`

Performs structural analysis of an EDIFACT message, extracting segments and enriching them with code lookup information from BDEW/EIC databases.

```typescript
const analysis = await client.analyzeEdifactMessage({
  message: 'UNH+00000000001111+MSCONS:D:11A:UN:2.6e\\nBGM+E01+1234567890+9\\nUNT+3+00000000001111'
});

console.log('Format:', analysis.data.format); // 'EDIFACT'
console.log('Summary:', analysis.data.summary);
console.log('Segments:', analysis.data.structuredData.segments);
```

Returns `EdifactAnalysisResult` with structured segments, plausibility checks, and resolved code mappings.

#### `validateEdifactMessage(payload)`

Validates an EDIFACT message structurally and semantically with detailed error and warning lists.

```typescript
const validation = await client.validateEdifactMessage({
  message: 'UNH+1+UTILMD:D:04B:UN:2.3e\\n...'
});

console.log('Valid:', validation.data.isValid);
console.log('Message Type:', validation.data.messageType);
console.log('Errors:', validation.data.errors);
console.log('Warnings:', validation.data.warnings);
```

Returns `EdifactValidationResult` with validation status, detected message type, and detailed diagnostics.

#### `explainEdifactMessage(payload)`

Generates a human-readable explanation of an EDIFACT message using LLM and expert knowledge.

```typescript
const explanation = await client.explainEdifactMessage({
  message: 'UNH+1+MSCONS:D:11A:UN:2.6e\\n...'
});

console.log(explanation.data.explanation);
```

Returns `ExplainEdifactMessageResponse` with a structured, understandable explanation of the message content.

#### `modifyEdifactMessage(payload)`

Modifies an EDIFACT message based on natural language instructions while maintaining valid structure.

```typescript
const modified = await client.modifyEdifactMessage({
  instruction: 'Erhöhe den Verbrauch in jedem Zeitfenster um 10%',
  currentMessage: 'UNH+1+MSCONS:D:11A:UN:2.6e\\n...'
});

console.log('Modified:', modified.data.modifiedMessage);
console.log('Valid:', modified.data.isValid);
```

Returns `ModifyEdifactMessageResponse` with the modified message and validation status.

#### `chatAboutEdifactMessage(payload)`

Enables interactive questions and discussions about an EDIFACT message with a context-aware AI assistant.

```typescript
const response = await client.chatAboutEdifactMessage({
  message: 'Welche Zählernummer ist in dieser Nachricht enthalten?',
  currentEdifactMessage: 'UNH+1+MSCONS:D:11A:UN:2.6e\\n...',
  chatHistory: [] // Optional previous conversation
});

console.log('Answer:', response.data.response);
```

Returns `EdifactChatResponse` with the AI assistant's contextual answer.

### `searchMarketPartners(query)` *(v0.9.1)*

Searches for market partners using BDEW/EIC codes, company names, cities, etc. This is a **public endpoint** that does not require authentication.

**New in v0.9.1:** Optional query parameter, increased limits (up to 2000), and smart defaults.

```typescript
// Basic search
const results = await client.searchMarketPartners({
  q: 'Stadtwerke München',
  limit: 50
});

// Export all distribution network operators (no search query needed!)
const allVNBs = await client.searchMarketPartners({
  role: 'VNB',
  limit: 2000
});

// Filter by market role with search term
const vnbResults = await client.searchMarketPartners({
  q: 'Stadtwerke',
  role: 'VNB',
  limit: 100
});

// Get all suppliers without search restriction
const allSuppliers = await client.searchMarketPartners({
  role: 'LF',
  limit: 1000
});

for (const partner of results.data.results) {
  console.log(`${partner.companyName} (${partner.code})`);
  console.log(`  Type: ${partner.codeType}, Source: ${partner.source}`);

  if (partner.contacts?.length) {
    console.log(`  Contacts: ${partner.contacts.length}`);
    const firstContact = partner.contacts[0];
    if (firstContact.City) {
      console.log(`  Location: ${firstContact.PostCode || ''} ${firstContact.City}`);
    }
  }

  if (partner.allSoftwareSystems?.length) {
    const systems = partner.allSoftwareSystems.map(s => s.name).join(', ');
    console.log(`  Software: ${systems}`);
  }
}
```

**Parameters:**
- `query.q` – (Optional) Search term (code, company name, city, etc.). Can be omitted when using role filter
- `query.limit` – Maximum number of results (1-2000). Defaults: 50 with query, 500 for filter-only searches
- `query.role` – Filter by market role (optional):
  - `'VNB'` – Verteilnetzbetreiber (distribution network operators)
  - `'LF'` – Lieferant (suppliers)
  - `'MSB'` – Messstellenbetreiber (metering point operators)
  - `'UNB'` or `'ÜNB'` – Übertragungsnetzbetreiber (transmission network operators)
  - Also accepts German long forms: `'VERTEILNETZBETREIBER'`, `'LIEFERANT'`, `'MESSSTELLENBETREIBER'`, `'ÜBERTRAGUNGSNETZBETREIBER'`

**Use Cases:**
- Export complete lists of all market partners by role (e.g., all 913+ VNBs in Germany)
- Filter large datasets by market role
- Build market analysis tools and dashboards
- Generate compliance reports

Returns `MarketPartnerSearchResponse` with an array of matching market partners including contact information, BDEW codes, software systems, and contact sheet URLs.

### `setToken(token)`

Updates the bearer token at runtime.

```typescript
client.setToken(process.env.NEW_TOKEN ?? null);
```

### `getBaseUrl()`

Returns the base URL currently configured.

```typescript
console.log(client.getBaseUrl());
```

---

## Error Handling

All HTTP errors throw a `WilliMakoError`:

```typescript
try {
  await client.createNodeScriptJob({ sessionId, source: '' });
} catch (error) {
  if (error instanceof WilliMakoError) {
    console.error('Status:', error.status);
    console.error('Body:', error.body);
  }
}
```

`WilliMakoError` exposes:

- `message` – human-readable summary
- `status` – HTTP status code
- `body` – parsed response (JSON or text)

---

## Types

Key interfaces are defined in [`src/types.ts`](../src/types.ts):

- `Artifact`, `CreateArtifactRequest`, `CreateArtifactResponse`
- `ToolJob`, `RunNodeScriptJobRequest`, `RunNodeScriptJobResponse`
- `ToolJobResult`, `ToolJobDiagnostics`
- `ApiProblem`

These models track edi@energy metadata such as encoding (`utf8`, `base64`), tags, checksums, and diagnostics.

---

## Rate Limiting & Performance

- Sandbox jobs (`createNodeScriptJob`) are asynchronous: poll with exponential backoff to reduce load.
- Large artifacts should use `encoding: 'base64'` for binary data (e.g., PDF invoices).
- Respect tenant-level rate limits documented in the Willi-Mako portal; the SDK does not throttle automatically.

---

## Version Compatibility

| SDK Version | API Compatibility | Notes |
|-------------|-------------------|-------|
| 0.8.x       | API v2 (0.8.0)    | Erweiterte Wissensabdeckung: wissenschaftliche Studien, BNetzA, BDEW, VKU |
| 0.7.x       | API v2            | EDIFACT Analyzer, Market Partner Search, Document Management |
| 0.1.x-0.6.x | API v2            | Initial releases with core functionality |

Check the [CHANGELOG](../CHANGELOG.md) for migration notes when upgrading.
