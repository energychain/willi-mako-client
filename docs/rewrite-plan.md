# Willi-Mako Client Rewrite Plan

## Confirmed source

- Source: `https://willi.cernion.de/api/openapi.json`
- Saved as sanitized app schema: `schemas/willi-cernion-openapi.json`
- Normalized tooling copy: `schemas/openapi.json`
- API: OpenAPI 3.1.0, `Willi Mako App API` 1.0.0
- Default base URL: `https://willi.cernion.de`
- Auth: session token from magic-link request/verify; JSON request bodies are required.

## Confirmed endpoint groups

- OpenAPI documentation: `GET /api/openapi.json`
- Auth: `POST /api/auth/request-link`, `GET /api/auth/token-peek`, `POST /api/auth/verify`, `GET /api/auth/me`, `POST /api/auth/logout`
- Mandant/team: invite, switch, members, usage, AVV record
- AVV onboarding: fetch and accept AVV
- Coaching/case turns: start, message, load turn
- Sessions/case files: list, get, markdown card/review, close, live-coaching toggle
- Review: `POST /api/review/session`

## Rewrite decision

The old package targeted a fundamentally different API and contained legacy demos, generated docs, MCP examples and bearer-token assumptions. This rewrite keeps the repository/package identity, positions STROMDAO GmbH as maintainer, and replaces the code with a small TypeScript client for the current willi.cernion.de API.

## Ecosystem positioning

- Willi Mako is the user-facing case-file and coaching application for German energy-market communication workflows.
- `willi-mako-client` is the public TypeScript SDK/CLI integration surface for Node.js tools, scripts, RAG pipelines and automation agents that need to work with the hosted Willi Mako app API.
- Cernion Energy Tools remains the broader Cernion service/tool ecosystem for energy-market, regulatory and operational orchestration. This package should not become a hidden general CET SDK.
- Integrations between Cernion Energy Tools and Willi Mako should stay explicit, typed and reviewable.
- STROMDAO GmbH is the public OSS maintainer and keeps the `energychain/willi-mako-client` package identity as the open bridge to `willi.cernion.de`.
- Public docs/examples must stay generic or synthetic and must not include real operator, customer, mandant or production case data.
- The major-version break is intentional because the current app API uses magic-link/session semantics rather than the former legacy API model.

## Schema normalization note

The fetched OpenAPI includes nested `$defs` references such as `#/$defs/edifactNote` that are invalid from document root for many generators. `scripts/normalize-openapi.mjs` hoists nested definitions into `components.schemas` and rewrites those refs for tooling compatibility. The raw schema is preserved as `schemas/willi-cernion-openapi.json`.
