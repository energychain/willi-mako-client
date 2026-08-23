# Ecosystem Architecture

Status: canonical public repository map  
Repository: `energychain/willi-mako-client`  
Mainline branch: `main`

## This repository's role

#WilliMakoClient TypeScript/Node.js SDK and CLI for the Willi Mako application API.

## This repository owns

- developer-facing TypeScript client API
- CLI command surface
- non-browser authentication/session handling
- OpenAPI-derived endpoint coverage and examples

## This repository consumes or connects to

- https://willi.cernion.de/api/...
- server-issued session IDs/cookies and Bearer-compatible session flow when available


## Ecosystem map

```text
Public users / developers / Stadtwerke / VNBs
        |
        v
Public enablement surfaces
  - energychain/energy (energy.js.org recipes)
  - energychain/Szenarienrechner-EOG (offline-first regulated planning)
        |
        v
Domain clients and workflow applications
  - energychain/willi-mako-client (#WilliMakoClient)
  - energychain/cernion-znp-frontend (ZNP dashboard/showcase)
        |
        v
Agent and integration adapters
  - SmartEnergySolutions/cernion-openclaw-sidecar
        |
        v
Core API runtime
  - energychain/cernion-energy-tools
        ^
        |
Knowledge, evidence and safe sample support
  - energychain/mako-edifact-sanitizer
```

Some adjacent workspaces may be private or operational and are intentionally not part of this public repository map until they are published as public surfaces.


## Change ownership

- **API endpoint, service schema, Moleculer action, OpenAPI contract:** `energychain/cernion-energy-tools`
- **Willi Mako SDK, CLI and client-side session handling:** `energychain/willi-mako-client`
- **Agent tool discovery, OpenClaw manifests and policy adapter:** `SmartEnergySolutions/cernion-openclaw-sidecar`
- **Safe MaKo/EDIFACT sample preparation:** `energychain/mako-edifact-sanitizer`
- **ZNP UI behavior and public/demo visualization:** `energychain/cernion-znp-frontend`
- **Offline-first regulated planning methodology:** `energychain/Szenarienrechner-EOG`
- **Educational recipes and small public examples:** `energychain/energy`

When a change crosses repositories, make the contract change in the owning repository first, then update adapters, clients, demos or documentation as follow-up work.


## Public safety boundaries

- Public repositories must not contain TWL raw context, customer data, private operational secrets or undeclared production credentials.
- Demo and fallback data must be marked clearly as synthetic or non-live.
- MaKo/EDIFACT examples must be synthetic, public, or explicitly approved and sanitized before publication.
- Deployment, DNS, PM2, server restarts and production operations remain Infrastructure-owned and are not authorized by this document.
- GitHub issues, code changes, public publication and external commitments still follow the applicable HITL and repository governance rules.


## Recommended reader path

1. Start with `energychain/cernion-energy-tools` to understand the canonical API/runtime contract.
2. Use `energychain/willi-mako-client` for script or CLI integration with Willi Mako.
3. Use `SmartEnergySolutions/cernion-openclaw-sidecar` when the consumer is an OpenClaw agent.
4. Use `energychain/mako-edifact-sanitizer` before turning MaKo/EDIFACT payloads into public examples.
5. Use `energychain/Szenarienrechner-EOG`, `energychain/cernion-znp-frontend` and `energychain/energy` as public application and learning surfaces.

## Maintainer note

This file is the shared connective tissue for the public Cernion/STROMDAO repository ecosystem. Keep it concise, public-safe and aligned with the repository's actual contract. If the public ecosystem changes, update this file together with the affected repository documentation.
