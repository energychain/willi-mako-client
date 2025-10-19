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
| 0.1.x       | API v2            | Initial public release of official client |

Check the [CHANGELOG](../CHANGELOG.md) for migration notes when upgrading.
