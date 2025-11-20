# Willi-Mako MCP Service Guide

This guide explains how the Willi-Mako Model Context Protocol (MCP) service is implemented in the `willi-mako-client`, how you can run it yourself, and how to connect to the public instance hosted at `https://mcp.stromhaltig.de/`. It also documents the available tools, authentication flows, deployment options, and recommended integration patterns for AI copilots.

> **TL;DR**
> - Start a local MCP endpoint with `willi-mako mcp` (or via PM2/systemd/Docker).
> - Connect your MCP-aware agent to `http://localhost:7337/mcp` by default.
> - Use the hosted endpoint `https://mcp.stromhaltig.de/` for managed access. Supply a `WILLI_MAKO_TOKEN` either via HTTP headers or by embedding it into the URL path (`https://mcp.stromhaltig.de/<YOUR_TOKEN>/mcp`).

---

## Table of Contents

1. [Conceptual Overview](#conceptual-overview)
2. [Architecture](#architecture)
3. [Authentication and Authorization](#authentication-and-authorization)
4. [Available Tools & Resources](#available-tools--resources)
5. [Running the MCP Service Locally](#running-the-mcp-service-locally)
6. [Production Deployment Patterns](#production-deployment-patterns)
7. [Public Hosted Endpoint](#public-hosted-endpoint)
8. [Integrating MCP Clients](#integrating-mcp-clients)
9. [Observability & Troubleshooting](#observability--troubleshooting)
10. [Security Recommendations](#security-recommendations)
11. [Further Reading](#further-reading)

---

## Conceptual Overview

The Model Context Protocol (MCP) provides a standardized way for AI assistants, IDE copilots, and automation agents to interact with external tools and data through HTTP transports. Within the `willi-mako-client`, we expose the full Willi-Mako API surface as curated MCP tools so that operators and agents can:

- Authenticate against the Willi-Mako platform.
- Manage sessions for market communication workflows (MaKo).
- Run intent analysis, conversational chat, clarification, and reasoning pipelines.
- Execute deterministic tooling scripts via the Willi-Mako sandbox.

The MCP server ships alongside the SDK. It reuses the typed `WilliMakoClient` internally, handles token persistence per transport session, and surfaces strongly typed JSON responses to connected clients.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│      MCP-aware Agent (IDE, CLI, Chat Client, Automation)      │
└───────────────▲───────────────────────────┬──────────────────┘
                │ HTTP/JSON (MCP protocol)  │
                │                           │
        ┌───────┴───────────────────────────▼──────────────────┐
        │           Willi-Mako MCP Service Transport           │
        │   (Streamable HTTP transport on port 7337 by default)│
        └───────▲───────────────────────────┬──────────────────┘
                │                           │
         ┌──────┴──────┐              ┌─────┴────────────────┐
         │ Token cache │              │  WilliMakoClient SDK │
         │ & session    │              │  (REST calls, retries │
         │ tracker      │              │   typed responses)    │
         └──────▲──────┘              └────────▲─────────────┘
                │                                │
                │                                │
          ┌─────┴────────────────────────────────▼──────┐
          │      Willi-Mako API v2 (stromhaltig.de)     │
          └─────────────────────────────────────────────┘
```

Key architectural features:

- **Streamable HTTP transport** provided by `@modelcontextprotocol/sdk`, allowing bidirectional streaming compatible with IDEs and copilots.
- **Session-scoped transports**: the server erzeugt für jede MCP-Session eine eigene Transportinstanz, sodass mehrere Clients parallel arbeiten können, ohne sich gegenseitig zu blockieren oder neu zu initialisieren.
- **Per-connection state tracking** (`transportState`) to remember bearer tokens and Willi-Mako session IDs between tool invocations.
- **Credential flexibility** through Bearer tokens, Basic credentials (email:password), environment variables, or URL-embedded tokens.
- **Tool wrappers** that translate MCP invocations into typed SDK calls with detailed logging and response shaping.

---

## Authentication and Authorization

The MCP service supports several authentication mechanisms. All flows ultimately require a valid Willi-Mako access token, but the transport helps you obtain or persist it.

### Supported Mechanisms

| Method | Usage | Notes |
| --- | --- | --- |
| **Bearer header** | `Authorization: Bearer <token>` | Preferred for clients that already store a token (e.g., CI or headless agents).
| **Basic header** | `Authorization: Basic base64(email:password)` | MCP server exchanges credentials for a JWT via the `WilliMakoClient.login` endpoint and caches the token (with expiry awareness).
| **Ambient token** | `WILLI_MAKO_TOKEN` environment variable on the MCP server | The fallback token if no header or session token is provided.
| **URL segment** | `https://mcp.stromhaltig.de/<token>/mcp` | Public service shortcut that extracts the token from the first path segment and strips it from logs (see [Public Hosted Endpoint](#public-hosted-endpoint)).

### Token Persistence

- Tokens are stored per MCP transport session, enabling multi-step workflows (e.g., login → session create → chat) without re-supplying credentials.
- The `willi-mako-login` tool optionally persists tokens for subsequent calls and writes them to the Basic-auth cache to speed up reauthentication.
- Call `willi-mako-login` with `{ persistToken: false }` if you only need a transient token.

### Session Handling

- When a client does not provide a `sessionId`, the MCP transport stores the last-active Willi-Mako session per connection.
- Tools that require a session (chat, reasoning, retrieval, tooling) will automatically reuse the cached session or guide you to create one with `willi-mako-create-session`.

---

## Available Tools & Resources

The MCP service registers curated tools that map one-to-one to Willi-Mako workflows. Each tool returns a JSON payload (also emitted as formatted text content).

| Tool | Description | Typical Use |
| --- | --- | --- |
| `willi-mako-login` | Exchanges email/password credentials for a JWT token. | Authenticate a new MCP session, optionally persisting the token server-side. |
| `willi-mako-create-session` | Creates a new Willi-Mako workspace session. | Start a fresh MaKo workflow, optionally configuring preferences or context. |
| `willi-mako-get-session` | Retrieves metadata for a given session. | Audit session policies or confirm expiry. |
| `willi-mako-delete-session` | Deletes a session and associated artefacts/jobs. | Clean up after automation runs. |
| `willi-mako-chat` | Sends conversational prompts to the assistant. | Ask domain questions about GPKE, WiM, GeLi Gas, EnWG/StromNZV/EEG, EDIFACT/edi@energy, etc. |
| `willi-mako-semantic-search` | Runs hybrid retrieval in the knowledge base. | Locate regulations, process steps, and sample EDIFACT segments. |
| `willi-mako-generate-reasoning` | Executes the deterministic reasoning pipeline. | Get structured analyses, intent metadata, and proposed actions. |
| `willi-mako-resolve-context` | Resolves context scaffolding for user queries. | Derive supporting data before a decision or workflow execution. |
| `willi-mako-clarification-analyze` | Detects whether follow-up questions are required. | Drive conversational guardrails for agents. |
| `willi-mako-generate-tool` | Generates tooling scripts via `/tools/generate-script` with attachment support and automatic repair retries. | Produce deterministic Node.js utilities for MaKo data tasks. |
| `willi-mako-repair-tool` | Requests auto-repair for failed generation jobs. | Iterate on tool generation without leaving the MCP client. |
| `willi-mako-list-artifacts` / `willi-mako-get-artifact` / `willi-mako-create-artifact` | Manage Willi-Mako artefacts within MCP flows. | Store, retrieve, or index artefacts such as UTILMD, MSCONS, or custom reports. |

> **Tip:** Additional helper tools and resource registries expose metadata such as documentation links and contact channels. Review the MCP server source (`src/demos/mcp-server.ts`) for the exhaustive list and schemas.

---

## Running the MCP Service Locally

### Prerequisites

- Node.js ≥ 18 (for native `fetch`, ESM support, and the MCP SDK).
- Installed `willi-mako-client` (either globally via `npm install -g willi-mako-client` or locally in your project).
- A valid Willi-Mako access token or credentials.

### Quick Start

```bash
# Option 1: Using npx from a fresh checkout
npx willi-mako-client mcp

# Option 2: After installing globally
npm install -g willi-mako-client@0.3.4
willi-mako mcp
```

By default, the server starts on `http://localhost:7337/mcp`. Use `--port` to override the port, or set the `PORT` environment variable.

### Configuring the Base URL and Token

- `--base-url` allows targeting non-productive environments.
- `--token` or the `WILLI_MAKO_TOKEN` environment variable seeds the MCP server with a bearer token.
- `--no-store` on the login tool prevents persisting tokens server-side.

### Running with PM2 (CommonJS Wrapper)

Version `0.3.4` introduced a CommonJS shim (`bin/willi-mako.cjs`) so PM2 can spawn the ESM CLI without `ERR_REQUIRE_ESM` errors:

```bash
pm2 start --name willi-mako-mcp willi-mako -- mcp
```

PM2 automatically tracks the process and restarts on failure. Use `pm2 logs willi-mako-mcp` to view the structured MCP logs (including tool invocation IDs).

### Docker Example

```bash
docker run \
  -e WILLI_MAKO_TOKEN=$WILLI_MAKO_TOKEN \
  -p 7337:7337 \
  ghcr.io/energychain/willi-mako-client:0.3.4 \
  willi-mako mcp --port 7337
```

Adapt the image/tag to your CI build if you maintain a private container.

---

## Production Deployment Patterns

| Pattern | Highlights | Notes |
| --- | --- | --- |
| **PM2** | Zero-downtime restarts, log rotation. | Use the CommonJS shim (`willi-mako`) as shown above. |
| **systemd service** | OS-native lifecycle management. | Wrap a shell script that exports `WILLI_MAKO_TOKEN` and runs `willi-mako mcp`. |
| **Docker / Kubernetes** | Immutable deployment, horizontal scaling. | Expose port 7337, mount secrets via environment variables or secrets managers. |
| **Serverless container** | On-demand scaling. | Ensure cold start times are acceptable; persistent sessions live in memory, so stateless restarts reset cached tokens. |

For high availability, deploy multiple MCP instances behind an HTTP load balancer. Durch die session-spezifischen Transporte können Clients ohne Sticky Sessions parallel arbeiten; bei Load-Balancer-Wechseln müssen sie lediglich ihre Session-ID erneut mitsenden (SSE-Streams werden dabei wie gewohnt neu aufgebaut).

---

## Public Hosted Endpoint

STROMDAO operates a managed MCP instance that mirrors the functionality of the CLI demo:

- **Base URL:** `https://mcp.stromhaltig.de/`
- **Transport path:** `/mcp`
- **Token injection:** Append your bearer token as the first URL segment if you cannot supply headers: `https://mcp.stromhaltig.de/<WILLI_MAKO_TOKEN>/mcp`
  - The server strips the token from access logs and forwards the request as if it arrived via `Authorization: Bearer ...`.
  - Tokens embedded in the URL are never persisted beyond the active request unless you call `willi-mako-login` with `persistToken: true`.
- **TLS:** The endpoint enforces HTTPS with modern cipher suites.
- **Rate limiting:** Apply standard Willi-Mako API rate limits; heavy automation should back off with exponential retries.

Use this hosted endpoint for quick experiments or as a permanent integration point if you do not need full control over the runtime environment.

---

## Integrating MCP Clients

Popular MCP consumers include IDE extensions (VS Code, Cursor, Zed), AI desktop tools (Claude Desktop, ChatGPT / OpenAI Desktop), or custom agents. General configuration steps:

1. **Define the transport:** `HTTP` with the URL `http://localhost:7337/mcp` (local) or `https://mcp.stromhaltig.de/mcp` (hosted).
2. **Provide credentials:** Either inject tokens via headers (preferred) or use the login tool to obtain them interactively.
3. **Discover tools:** Most MCP clients offer a tool palette or command list. Look for the `willi-mako-*` prefixes.
4. **Establish a session:** Run `willi-mako-create-session` once per workflow, then chain chat/reasoning/search calls.
5. **Persist important outputs:** Use the artifact tools to archive JSON/EDI results back into the Willi-Mako platform.

> **Compatibility tip:** Einige MCP-Clients (z. B. Browser-basierte EventSource-Implementierungen) können keine benutzerdefinierten HTTP-Header senden. In diesem Fall akzeptiert der Dienst die Session-ID auch über `X-Session-Id` oder als Query-Parameter (`?mcp-session-id=` bzw. `?sessionId=`). Der Server setzt daraus automatisch den erforderlichen `Mcp-Session-Id`-Header, übernimmt CORS-Preflight-Wünsche (`Access-Control-Request-Headers`) und erzeugt bei erneuten `initialize`-Aufrufen eine eigene Transportinstanz, statt bestehende Sessions zu blockieren. Dadurch können Browser-gestützte Integrationen (Claude Web, Custom Dashboards) Tokens rotieren, mehrere Tabs parallel verbinden oder Sessions neu aushandeln, ohne in den Fehler „Server already initialized“ zu laufen.

### Example: VS Code MCP Client

```jsonc
{
  "mcpServers": {
    "willi-mako": {
      "transport": "streamable",
      "url": "https://mcp.stromhaltig.de/<YOUR_TOKEN>/mcp"
    }
  }
}
```

Replace `<YOUR_TOKEN>` with a freshly issued JWT or configure VS Code to send an `Authorization` header instead.

### Example: Claude Desktop

1. Navigate to *Integrations → MCP Servers*.
2. Add a server named "Willi-Mako" with URL `https://mcp.stromhaltig.de/mcp`.
3. Add a custom header `Authorization: Bearer <YOUR_TOKEN>` or embed the token in the URL as shown above.
4. Once connected, use `/tool willi-mako-create-session` to bootstrap your workspace context.

---

## Observability & Troubleshooting

- **Structured logs:** The server prints emoji-prefixed messages for connection lifecycle and tool invocations (`🛠️`, `✅`, `❌`). When running under PM2, view them with `pm2 logs`.
- **Error handling:** API errors propagate as MCP `Error` responses with `ErrorCode` annotations. Review the payload to determine whether the issue is authentication, validation, or rate limiting.
- **Token cache invalidation:** The Basic-auth cache automatically purges expired tokens. If you rotate credentials, call `willi-mako-login` again to refresh the cache.
- **Session reset:** Disconnecting an MCP transport clears in-memory session state. Re-run `willi-mako-create-session` after reconnecting.
- **PM2 shim:** If you see `ERR_REQUIRE_ESM`, upgrade to `willi-mako-client@0.3.4` or newer, which ships the CommonJS wrapper.

### Expired or Invalid Token Errors

If you encounter authentication errors (HTTP 403 or 401) with messages like "Invalid token" or "Token expired", the MCP server provides helpful guidance directly in the error response. You have several options to obtain a fresh token:

**Option 1: Use the `willi-mako-login` tool within MCP**
```json
{
  "email": "your-email@example.com",
  "password": "your-password",
  "persistToken": true
}
```
The token will be stored for the current MCP session and used automatically for subsequent tool calls.

**Option 2: Set the WILLI_MAKO_TOKEN environment variable**
```bash
willi-mako auth login
# Copy the token and set it as WILLI_MAKO_TOKEN
export WILLI_MAKO_TOKEN="your-new-token"
```
Restart the MCP server to pick up the new token.

**Option 3: Use the token-in-path format**
```
https://mcp.stromhaltig.de/<your-fresh-token>/mcp
```
This is convenient for quick tests or browser-based MCP clients.

**Option 4: Use npx to get a new token**
```bash
npx willi-mako-client auth login -e <youremail> -p <yourpassword>
```
Copy the token from the output and use it in your Authorization header or URL.

The MCP server automatically detects token-related errors and includes these instructions in the error message, making it easy to resolve authentication issues without consulting documentation.

For additional debugging tips, refer to [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md).

---

## Security Recommendations

- Treat tokens embedded in URLs as sensitive; avoid sharing recorded command history or logs containing them.
- Rotate `WILLI_MAKO_TOKEN` regularly and scope tokens to least-privilege tenants.
- When hosting the service yourself, restrict inbound traffic with firewalls or VPNs where possible.
- Disable token persistence (`persistToken: false`) for transient or shared environments.
- Monitor API usage via the Willi-Mako dashboard to detect anomalies.

---

## Further Reading

- [`src/demos/mcp-server.ts`](../src/demos/mcp-server.ts) – Reference implementation used by the CLI.
- [`docs/INTEGRATIONS.md`](./INTEGRATIONS.md) – Broader guide on connecting IDEs and agents.
- [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) – Common issues and resolutions, including PM2 guidance.
- [`README.md`](../README.md) – Overview of the `willi-mako-client` project and CLI usage.

With this documentation, you can confidently deploy, integrate, and operate the Willi-Mako MCP service—either self-hosted or via the managed endpoint at `https://mcp.stromhaltig.de/`.
