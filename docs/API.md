# Willi-Mako Client SDK – API Reference

This document provides an overview of the TypeScript/JavaScript API exposed by `willi-mako-client`. Refer to the generated type definitions in `dist/index.d.ts` for full detail.

## Table of Contents

- [Instantiating the Client](#instantiating-the-client)
- [Authentication](#authentication)
- [Methods](#methods)
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
import { WilliMakoClient } from 'willi-mako-client';

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
