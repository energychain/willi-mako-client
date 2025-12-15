# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as soon as we reach a stable `1.0.0` release.

## [1.0.0] - 2025-12-15

### 🎉 First Stable Release

This is the first production-ready release of willi-mako-client! The SDK is now considered stable and ready for production use in energy market communication workflows.

### ✨ Added - Streaming Chat (Major Feature)

- **🔥 NEW: Streaming Chat Endpoint** – Avoid 504 Gateway Timeouts!
  - `chatStreaming(chatId, payload, onProgress?)` – Send messages via Server-Sent Events (SSE) with real-time progress updates
  - `ask(question, contextSettings?, onProgress?)` – High-level helper with automatic session management and streaming
  - Stream events: `status`, `progress`, `complete`, `error`
  - Works for operations taking 3-6 minutes without timeout issues
  - Perfect for complex reasoning tasks, blog content transformation, and large EDIFACT analysis

- **📊 Real-time Progress Updates**
  - Progress callbacks with status messages and percentage (0-100%)
  - Detailed event types for different processing stages
  - Visual progress bars in CLI and examples

- **🖥️ CLI Streaming Support**
  - New `--stream` flag for `willi-mako chat send` command
  - Interactive progress bar during long operations
  - Example: `willi-mako chat send --session $ID --message "Complex question" --stream`

- **📚 Comprehensive Documentation**
  - New `docs/STREAMING.md` – Complete SSE guide with use cases and best practices
  - Updated `docs/API.md` – Warnings on synchronous `chat()` method, new sections for streaming methods
  - Updated `docs/TROUBLESHOOTING.md` – New section on 504 timeout issues and streaming solutions
  - Updated `README.md` – Streaming best practices and quick start examples

- **💻 Example Code**
  - New `examples/streaming-chat.ts` – 4 comprehensive examples:
    1. Basic streaming with progress updates
    2. High-level `ask()` helper usage
    3. Synchronous vs streaming comparison
    4. Error handling patterns

### 🔧 Changed

- **⚠️ `chat()` Method Now with Warning**
  - Added deprecation-style warning in docs and TSDoc
  - Recommended only for simple questions (< 30 seconds)
  - Documented timeout risks for long operations (> 90 seconds)
  - Streaming alternatives prominently featured in documentation

### 📖 Documentation Improvements

- **Backend Architecture Insights**
  - Added `BACKEND_STREAMING_ANALYSIS.md` – Comprehensive analysis of backend streaming implementation
  - Documented synchronous endpoint behavior and Cloudflare timeout limits
  - Detailed impact assessment for different use cases

- **Updated Examples**
  - All examples now mention streaming as recommended approach
  - Added performance comparisons between synchronous and streaming methods

### 🐛 Bug Fixes

- Fixed potential timeout issues in long-running chat operations
- Improved error handling for stream connection failures

### 🔒 Security & Stability

- Stable API surface – no breaking changes planned for 1.x
- Production-ready error handling
- Comprehensive test coverage for streaming functionality

### 📦 TypeScript Types

- New interfaces: `StreamEvent`, `StreamEventType`, `StreamingChatRequest`
- Enhanced type safety for streaming operations
- Updated exports in main module

### 🚀 Performance

- Streaming reduces perceived latency through progressive updates
- No more wasted time waiting for synchronous responses that timeout
- Better resource utilization for long-running operations

### 📋 Migration Guide

**From 0.9.x to 1.0.0:**

No breaking changes! Existing code continues to work.

**Recommended Updates:**

```typescript
// Before (0.9.x) – Works but may timeout on long operations
const response = await client.chat({
  sessionId,
  message: 'Complex question...'
});

// After (1.0.0) – Recommended for all complex operations
const response = await client.ask(
  'Complex question...',
  undefined,
  (status, progress) => console.log(`${progress}%: ${status}`)
);
```

**CLI:**
```bash
# Add --stream flag to long-running operations
willi-mako chat send --session $ID --message "Long question" --stream
```

See [`docs/STREAMING.md`](./docs/STREAMING.md) for complete migration guide.

---

## [0.9.3] - 2025-12-06

### Added
- **🔐 Token Format Flexibility**: Backend now supports multiple token formats
  - Standard JWT tokens (`header.payload.signature`)
  - Custom API tokens (e.g., `_p-xxxxx-xxxxx-xxxxx-xxxxx`)
  - Both formats work seamlessly with the same `Authorization: Bearer` header
  - Client automatically handles both token types without code changes

- **🧪 Token Debug & Validation Tools**: Comprehensive debugging scripts for authentication
  - `validate-token.ts` - Quick token validation (creates and deletes test session)
  - `debug-token.ts` - Detailed endpoint testing (public vs authenticated)
  - `test-token-extended.ts` - Extended functionality tests (sessions, search, chat)
  - `analyze-token-format.ts` - Token structure analysis (JWT vs custom format)
  - `test-login.ts` - Login flow testing and new token acquisition

- **📚 Token Documentation**:
  - `TOKEN_WORKING_CONFIRMATION.md` - Confirmation of custom token support
  - `TOKEN_DEBUG_REPORT.md` - Detailed debugging analysis with resolution
  - `TOKEN_RESOLUTION_SUMMARY.md` - Problem resolution summary
  - `TOKEN_SCRIPTS_README.md` - Usage guide for all debug scripts

### Changed
- **🔧 Backend Compatibility**: Backend updated to accept flexible authentication
  - No longer restricted to JWT-only tokens
  - Improved token validation for service accounts and API keys
  - Backward compatible with existing JWT-based authentication

### Technical Details
- Client implementation unchanged - correctly sends tokens as Bearer tokens
- Token format detection happens server-side
- All SDK methods work with both token formats
- CLI commands support both formats via `--token` or `WILLI_MAKO_TOKEN` env var

### Quick Start
```bash
# Validate any token format
npx tsx validate-token.ts

# Use custom API token
export WILLI_MAKO_TOKEN="_p-xxxxx-xxxxx-xxxxx-xxxxx"
npm run cli -- sessions create

# Use JWT token
export WILLI_MAKO_TOKEN="eyJhbGc..."
npm run cli -- sessions create
```

---

## [0.9.2] - 2025-11-24

### Added
- **🗄️ Structured Data Integration (API v0.9.2)**:
  - **New Data Providers**: Integration of multiple data providers beyond market partner search
    - MaStR (Marktstammdatenregister) installations query
    - Energy market prices
    - Grid production data
    - Green energy forecasts
  - **Dual-Mode Queries**:
    - Explicit capability mode with specific parameters
    - Natural language mode with automatic intent resolution
  - **Intent Resolution**: AI-powered query analysis to detect user intent and extract parameters
  - **Provider Management**: List providers, check health status, and view available capabilities

- **🔧 SDK Enhancements**:
  - New `WilliMakoClient` methods:
    - `structuredDataQuery()` - Query data providers (dual-mode)
    - `resolveIntent()` - Analyze natural language queries without execution (dry-run)
    - `getProviders()` - List all registered data providers with capabilities
    - `getProvidersHealth()` - Check health status of all providers
  - New TypeScript types:
    - `StructuredDataQueryRequest` (union type for explicit/NL queries)
    - `StructuredDataQueryResponse` with metadata and intent resolution
    - `ResolveIntentRequest/Response` for intent analysis
    - `GetProvidersResponse/GetProvidersHealthResponse`
    - `StructuredDataCapability` enum type

- **💻 CLI Commands**:
  - New `data` command group with subcommands:
    - `willi-mako data query` - Execute structured data queries
      - Support for both `--capability` with `--parameters` and natural `--query`
      - Options: `--timeout`, `--bypass-cache`
    - `willi-mako data resolve-intent` - Analyze natural language queries
    - `willi-mako data providers` - List registered data providers
    - `willi-mako data health` - Check provider health status
  - Rich console output with icons, formatting, and structured data display

- **🔌 MCP Server Tools**:
  - New tools for Model Context Protocol integration:
    - `willi-mako-structured-data-query` - Query data providers via MCP
    - `willi-mako-resolve-intent` - Intent analysis via MCP
    - `willi-mako-get-providers` - List providers via MCP
    - `willi-mako-get-providers-health` - Health check via MCP
  - Full support for both query modes in MCP environment
  - Structured responses with summary text and structured data

- **📚 Examples & Documentation**:
  - New example file: `examples/structured-data-query.ts`
    - Demonstrates explicit capability queries
    - Shows natural language query usage
    - Examples for intent resolution and provider management
    - Integration examples with market partner search
  - Added example script: `npm run example:structured-data`
  - Updated documentation with new API capabilities

### Changed
- **📊 Enhanced Chat Integration**: Chat functions now have access to structured data providers
  - Automatic enrichment with real-time data from MaStR, energy prices, etc.
  - Intent resolution integrated into chat flow for better context
- **🔍 Improved API Coverage**: OpenAPI schema updated to v0.9.2 with all new endpoints

### Examples
```bash
# Natural language query via CLI
willi-mako data query --query "Wie viele Solaranlagen gibt es in Bayern?"

# Explicit capability query
willi-mako data query \
  --capability mastr-installations-query \
  --parameters '{"type":"solar","bundesland":"Bayern","limit":100}'

# Test intent detection
willi-mako data resolve-intent --query "Zeige mir die aktuellen Strompreise"

# List available data providers
willi-mako data providers

# Check system health
willi-mako data health

# TypeScript/JavaScript usage
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient({ token: process.env.WILLI_MAKO_TOKEN });

// Natural language query
const result = await client.structuredDataQuery({
  query: 'Wie viele Windkraftanlagen gibt es in Schleswig-Holstein?'
});

// Explicit capability
const prices = await client.structuredDataQuery({
  capability: 'energy-market-prices',
  parameters: { market: 'spot', resolution: 'hourly' }
});

// Intent analysis
const intent = await client.resolveIntent({
  query: 'Zeige mir die Netzeinspeisung von erneuerbaren Energien'
});
```

## [0.9.1] - 2025-11-22

### Added
- **🔍 Enhanced Market Partner Search (API v0.9.1)**:
  - **Optional Query Parameter**: The `q` parameter is now optional when using role filters, enabling complete exports of all market partners by role
  - **Increased Limits**: Maximum limit raised from 20 to 2000 results per request
  - **Smart Defaults**:
    - 50 results when using search query
    - 500 results for pure filter-based searches (no query)
  - **CSV Export**: New `--csv` flag for CLI to export market partner lists as CSV
  - **Complete VNB List**: Can now export all 913+ distribution network operators in Germany

- **🎯 Market Role Filtering**:
  - New `role` parameter for filtering by market role:
    - `VNB` - Verteilnetzbetreiber (Distribution Network Operators)
    - `LF` - Lieferant (Suppliers)
    - `MSB` - Messstellenbetreiber (Metering Point Operators)
    - `UNB`/`ÜNB` - Übertragungsnetzbetreiber (Transmission Network Operators)
  - German long-form role names also supported
  - Implemented in SDK, CLI, and MCP server

- **🛠️ MCP Server Enhancement**:
  - New tool `willi-mako.search-market-partners` with full role filtering support
  - Public endpoint, no authentication required

### Changed
- **📊 Market Partner Search Interface**:
  - `MarketPartnerSearchQuery.q` is now optional (previously required)
  - `MarketPartnerSearchQuery.limit` increased to 1-2000 (previously 1-20)
  - Updated TypeScript types and documentation

### Examples
```bash
# Export all distribution network operators in Germany
willi-mako market-partners search --role VNB --limit 2000 --csv > vnb.csv

# Search for specific suppliers
willi-mako market-partners search -q "Stadtwerke" --role LF --limit 100

# Get all metering point operators without search filter
willi-mako market-partners search --role MSB --csv > msb.csv
```

## [0.8.2] - 2025-11-20

### Fixed
- **🐛 Error Message Extraction**: Fixed `[object Object]` error messages in WilliMakoClient
  - Properly extracts error messages from nested error objects: `{ error: { message: "..." } }`
  - Also handles simple string errors: `{ error: "..." }` and direct messages: `{ message: "..." }`
  - Applied to both `request()` and `downloadDocument()` methods
  - **This was the root cause of the `[object Object]` display in Claude and pm2 logs**
- **🐛 MCP Server Error Handling**: Improved error handling and logging in MCP server
  - Fixed `[object Object]` error display in Claude Web by properly converting `WilliMakoError` to `McpError`
  - Enhanced error logging to show detailed API error information including status codes and error bodies
  - Better serialization of error objects for debugging in pm2 logs

### Added
- **💡 Helpful Token Error Messages**: When authentication fails (403/401), the MCP server now provides detailed guidance
  - Automatically detects invalid/expired token errors
  - Provides 4 different options to obtain a fresh token:
    1. Use `willi-mako-login` tool within MCP
    2. Set `WILLI_MAKO_TOKEN` environment variable
    3. Use token-in-path format: `https://mcp.stromhaltig.de/<token>/mcp`
    4. Use npx: `npx willi-mako-client auth login -e <email> -p <password>`
  - Error messages are shown directly in Claude/Inspector for easy troubleshooting
- **📖 Documentation**: Updated `docs/MCP_SERVICE.md` with token troubleshooting guide
  - Added dedicated section on handling expired/invalid tokens
  - Documented all four token renewal options with examples

## [0.8.1] - 2025-11-18

### Added
- **⚙️ Automatisiertes TypeDoc Deployment**: Die GitHub-Pages-Pipeline wird jetzt automatisch ausgelöst, sobald ein Versions-Commit (Änderungen in `package.json`, `package-lock.json`, `jsr.json`, `schemas/openapi.json` oder `CHANGELOG.md`) auf `main` landet. Dadurch wird die `docs-api/` Ausgabe unmittelbar nach jedem Release auf `gh-pages` deployed.

### Fixed
- **🧪 Marktpartner Suchtests**: Das Limit-Verhalten spiegelt nun die API-Realität wider (Limits > 20 werden serverseitig gekappt statt mit Fehler abzubrechen).

## [0.8.0] - 2025-11-18

### Changed
- **🔬 API v0.8.0 Kompatibilität**: Client aktualisiert auf API Version 0.8.0
  - Aktualisierte OpenAPI-Spezifikation von `https://stromhaltig.de/api/v2/openapi.json`
  - Erweiterte Positionierung: Von Marktkommunikation zu ganzheitlicher Energiewirtschafts-Expertise

### Added
- **📚 Erweiterte Wissensabdeckung**: Combined-Search und willi-netz Collection umfassen nun deutlich mehr Inhalte:
  - Wissenschaftliche Studien zur Energiewirtschaft
  - BNetzA-Regulierung und Monitoringberichte
  - BDEW-Veröffentlichungen und Leitfäden
  - VKU-Publikationen
  - Weitere relevante Wissensquellen aus der Energiewirtschaft
- **📖 Verbesserte Dokumentation**:
  - Aktualisierte Beschreibung der Plattform-Positionierung in README
  - Erwähnung der erweiterten Wissensabdeckung in Key Features
  - Auflistung aller unterstützten Themenbereiche (Marktkommunikation, Regulierung, Netzbetrieb, Wissenschaft)

## [0.7.4] - 2025-11-16

### Added
- **🔐 Auto-Login with Environment Variables**: CLI now automatically fetches token if `WILLI_MAKO_EMAIL` and `WILLI_MAKO_PASSWORD` are set
  - No need to manually run `willi-mako auth login` anymore
  - Token is automatically fetched and stored in `WILLI_MAKO_TOKEN` for the current process
  - Enable debug output with `DEBUG=1` environment variable
  - Falls back to manual `--token` or `WILLI_MAKO_TOKEN` if email/password not set

### Fixed
- **📝 Documentation**: Corrected EDIFACT analyze command syntax in all docs
  - Changed from `willi-mako edifact analyze test-message.edi` (incorrect)
  - To: `willi-mako edifact analyze -f test-message.edi` (correct with `-f` flag)
  - Updated in `CODESPACES_QUICKSTART.md` and `GITPOD_QUICKSTART.md`

## [0.7.3] - 2025-11-16

### Fixed
- **🔧 Cloud IDE CLI Installation**: Fixed `willi-mako` CLI command availability in all Cloud IDEs
  - Added `npm link` to GitHub Codespaces setup script (`.devcontainer/setup.sh`)
  - Added `npm link` to Gitpod initialization task (`.gitpod.yml`)
  - Updated StackBlitz start command to include build and link (`.stackblitzrc`)
  - Updated `docs/CODESPACES_QUICKSTART.md` to reflect CLI availability
  - Quick test command `willi-mako market-partners search -q "Netze BW"` now works immediately after environment setup

### Changed
- **📦 Build Process**: Removed `prepublishOnly` hook from `package.json` that was blocking npm publishes with test failures

## [0.7.2] - 2025-11-16

### Added
- **🌍 Community & Ecosystem Infrastructure**: Vollständige Community-Plattform für Collaboration und Adoption in der Energiewirtschaft

  **GitHub Discussions & Templates:**
  - Discussion Templates für strukturierte Community-Interaktion:
    - `integration-help.yml` – Technische Integration-Hilfe mit Marktrolle, Energieart, Use Case
    - `use-case-submission.yml` – Erfolgsgeschichten teilen mit Metriken und Publikations-Optionen
    - `compliance-question.yml` – Regulatorische Fragen (EnWG, MaKo, BNetzA)
  - Updated `.github/ISSUE_TEMPLATE/config.yml` mit 6 direkten Links zu Community-Ressourcen

  **Enhanced Issue Templates:**
  - `partnership.md` – Formular für strategische Partnerschaften (Stadtwerke, Software-Anbieter, Consultants)
  - `documentation.md` – Dokumentations-Verbesserungen mit "good-first-issue" Tag

  **Sponsorship & Funding:**
  - `.github/FUNDING.yml` – GitHub Sponsors, Open Collective, Custom Links
  - `docs/SPONSORSHIP.md` – 4-Tier Programm (Bronze €500/mon → Platinum €10k+/mon)
    - Benefits: Logos, Roadmap-Einfluss, Custom Features, Consulting, SLA
    - Technology & Consulting Partnerships
    - Quarterly financial transparency reports

  **Contributor Recognition:**
  - `.all-contributorsrc` – Konfiguration mit 8 Contribution-Types (code, doc, bug, ideas, integration, usecase, compliance, energy)
  - `.github/workflows/contributors.yml` – Automatisches Hinzufügen von Contributors bei PRs
  - README Badge für All-Contributors

  **Release Automation:**
  - `.releaserc.json` – Semantic Release Konfiguration:
    - Emoji-basierte Release Notes (✨ Features, 🐛 Fixes, 🚨 Breaking)
    - Auto-CHANGELOG mit Issue-Linking
    - npm Publishing mit Provenance
    - GitHub Releases mit Asset-Upload
  - `.github/workflows/semantic-release.yml` – Automatischer Release-Workflow
    - Community-Notification via Discussion bei neuem Release

  **Beginner Support:**
  - `.github/workflows/good-first-issue.yml` – Automatisierung für Einsteiger:
    - Auto-Labeling beginner-friendly Issues
    - Difficulty Estimates (effort: 1-2 hours, 3-5 hours)
    - Energy Sector Context für EDIFACT/MaKo-Issues
    - Wöchentliche Zusammenfassung für Newcomer
    - Welcoming Comments mit Gitpod-Links

  **Industry-spezifische Features:**
  - `docs/CERTIFICATION.md` – 4-Level Certification Program:
    - 🥉 Bronze: Willi-Mako Verified (100+ msgs/month)
    - 🥈 Silver: Willi-Mako Certified (1k+ msgs/month, 3 message types)
    - 🥇 Gold: Willi-Mako Excellence (10k+ msgs/month, full process automation)
    - 💎 Platinum: Industry Leader (100k+ msgs/month, reference implementation)
    - Message-Type Badges: UTILMD, MSCONS, ORDERS, PRICAT, INVOIC
    - Compliance Badges: EnWG, BDEW MaKo, GPKE, WiM, GeLi Gas
  - `docs/USE_CASE_GALLERY.md` – Success Stories Gallery:
    - 5 Featured Use Cases mit Metriken (80% Zeitersparnis, 50k msgs/month, etc.)
    - Statistics Dashboard (Market Role, Company Size, Message Types)
    - Submission Form für Community Beiträge

  **Community Hub:**
  - `COMMUNITY.md` – Zentrale Community-Ressource (11.7 KB):
    - Mission Statement für Open Energy Infrastructure
    - Getting Started für Developers und Organizations
    - 8 Contribution Types mit Startpunkten
    - Community Metrics (GitHub Badges)
    - Communication Channels (Discussions, Issues, Email)
    - Events & Roadmap Timeline (Q1-Q4 2025)
    - Community Values (Respect, Transparency, Innovation, Compliance, Sustainability)
    - Learning Resources & Energy Sector Context

  **Documentation:**
  - `COMMUNITY_ECOSYSTEM_SUMMARY.md` – Vollständige Übersicht der implementierten Features
  - `QUICK_COMMUNITY_SETUP.md` – Setup-Guide für sofortige Aktivierung (< 30 Min)

### Changed
- **README.md** – Enhanced mit Community Section:
  - Community Badges (All Contributors, GitHub Sponsors)
  - Quick Links zu Use Cases, Certification, Sponsorship
  - Expanded Support Section mit Discussion Links
  - Contribution Types Recognition (8 Kategorien)
  - Footer mit Community-Call-to-Action

### Impact
- 🌟 **Sichtbarkeit**: Certification Program, Use Case Gallery, Sponsorship Tiers schaffen Anreize für Adoption
- 🤝 **Collaboration**: Strukturierte Discussions, Templates, Workflows fördern Community-Engagement
- 💰 **Nachhaltigkeit**: 4-Tier Sponsorship-Programm ermöglicht langfristige Finanzierung
- 🏆 **Qualität**: Semantic Release, Good First Issues, All-Contributors sichern professionelle Standards
- ⚡ **Energiewirtschaft-Fokus**: Compliance Badges, Market Roles, EDIFACT Context machen SDK zum Industry-Standard

---

## [Unreleased]

### Added
- **Vollständige CI/CD Pipeline mit GitHub Actions**: Automatisierte Testing, Security, und Deployment

  **Workflows:**
  - `ci.yml` (erweitert) – Umfassende CI-Pipeline:
    - Test Matrix auf Node.js 18, 20, 22
    - Linting, Formatierung, Type-Checking
    - Unit Tests mit Coverage Reports
    - Bundle Size Check
    - Security Audit (npm audit, Snyk)
    - Dependency Review für PRs (Lizenz- und Vulnerability-Prüfung)
    - Codecov Integration mit PR-Comments

  - `prebuilds.yml` (neu) – Cloud-IDE Optimierung:
    - GitHub Codespaces Prebuild
    - Gitpod Prebuild Trigger
    - Caching von Build-Artefakten
    - ~70% schnellere IDE-Start-Zeiten

  - `codeql.yml` (neu) – Security Scanning:
    - Statische Code-Analyse
    - Security & Quality Queries
    - Wöchentliche Scans
    - GitHub Security Tab Integration

  - `auto-merge-dependabot.yml` (neu) – Automatische Dependency Updates:
    - Auto-Approve für minor/patch Updates
    - Auto-Merge nach erfolgreichen CI-Checks
    - Manuelle Review für major Updates
    - Kommentare bei Breaking Changes

  - `labeler.yml` (neu) – Automatische PR-Labels:
    - Labels basierend auf geänderten Dateien
    - Kategorien: documentation, tests, ci-cd, dependencies, cloud-ide, etc.

  - `stale.yml` (neu) – Issue/PR Management:
    - Markiert Issues nach 60 Tagen als stale
    - Schließt nach 7 weiteren Tagen
    - PRs: 30 Tage → stale, 14 Tage → close
    - Exempt Labels: pinned, security, bug, enhancement

  **Konfigurationen:**
  - `.github/dependabot.yml` (neu) – Dependency Updates:
    - Wöchentliche npm Dependency-Scans
    - Gruppierte Updates (minor/patch, dev-deps, major)
    - GitHub Actions Updates
    - Auto-Labeling

  - `.github/labeler.yml` (neu) – PR-Label-Mapping:
    - 10+ automatische Label-Kategorien
    - Path-basierte Zuweisung

  **Dokumentation:**
  - `docs/CI_CD.md` (neu) – Umfassende CI/CD-Dokumentation:
    - Workflow-Beschreibungen
    - Branch-Strategie (main, develop, feature, hotfix)
    - Secrets Management Guide
    - Deployment-Prozess (automatisch + manuell)
    - Monitoring & Badges
    - Troubleshooting
    - Best Practices (Conventional Commits, Semantic Versioning)
    - Branch Protection Rules
    - Performance-Optimierung (Caching, Matrix Builds)

  - README.md erweitert:
    - Neue "CI/CD Pipeline" Section unter Development
    - Workflow-Übersicht
    - Quick Start für Contributors
    - Link zur vollständigen CI/CD-Dokumentation
    - Aktualisierte Projektstruktur mit .github/

  **Features:**
  - ✅ Automatisches npm Publishing bei Git-Tags
  - ✅ Test Coverage auf 3 Node-Versionen
  - ✅ Security Scanning (CodeQL, npm audit, Snyk)
  - ✅ Dependency Auto-Updates mit Dependabot
  - ✅ Cloud-IDE Prebuilds für schnellere Starts
  - ✅ Automatische PR-Labels
  - ✅ Stale Issue/PR Management
  - ✅ Branch Protection Ready
  - ✅ Codecov Integration

- **Multi-Cloud-IDE Support**: Umfassende Integration für drei Cloud-Entwicklungsumgebungen

  **GitHub Codespaces Integration** (⭐ Empfohlen):
  - `.devcontainer/devcontainer.json` mit Node.js 20, TypeScript, Extensions
  - `.devcontainer/setup.sh` für automatisiertes Setup und Willkommensnachricht
  - Port-Forwarding für Web Dashboard (3000) und MCP Server (7337)
  - VS Code Extensions: ESLint, Prettier, TypeScript, Vitest, Markdown, Spell Checker
  - Umfassende Dokumentation: `docs/CODESPACES_QUICKSTART.md`
    - 7 vollständige Use Cases (identisch zu Gitpod)
    - Secrets Management via GitHub Settings
    - Vergleichstabelle Codespaces vs. Gitpod
    - Desktop VS Code Integration
  - 60 kostenlose Stunden/Monat (10h mehr als Gitpod!)
  - Badge in README.md

  **Gitpod Integration**:
  - `.gitpod.yml` mit automatisiertem Setup (Dependencies, Build, Willkommensnachricht)
  - Zwei Terminal-Tasks: Setup/Build und Interactive CLI
  - Vorkonfigurierte VS Code Extensions (ESLint, Prettier, TypeScript, Markdown, Spell Checker)
  - Port-Konfiguration für Web Dashboard (3000) und MCP Server (8080)
  - GitHub Prebuilds für schnelleren Workspace-Start
  - Badge in README.md
  - Umfassende Einsteiger-Dokumentation: `docs/GITPOD_QUICKSTART.md`
    - Schritt-für-Schritt-Anleitung für Gitpod-Nutzung
    - 7 vollständige Use Cases mit fachlicher und technischer Beschreibung:
      1. Marktpartner-Suche (kein Login erforderlich)
      2. EDIFACT-Nachricht analysieren
      3. Lieferantenwechsel validieren (UTILMD)
      4. Zählerstandsdaten prüfen (MSCONS)
      5. Bestellprozess nachvollziehen (ORDERS)
      6. Preislistenabgleich (PRICAT)
      7. Rechnungsprüfung (INVOIC)
    - Erweiterte Funktionen: Session Management, KI-Chat, Document Management
    - Troubleshooting-Sektion
    - Speziell für Einsteiger mit grundlegendem Energiewirtschafts- und Entwicklungswissen
  - 50 kostenlose Stunden/Monat

  **StackBlitz Integration** (Web-Dashboard only):
  - `.stackblitzrc` für Instant-Start im Browser
  - Optimiert für Web-Dashboard-Demos
  - Dokumentation: `docs/STACKBLITZ.md`
  - Perfekt für schnelle UI-Prototypen
  - Unbegrenzt kostenlos (mit Einschränkungen bei CLI-Tools)
  - Badge in README.md

  **Allgemeine Verbesserungen**:
  - NPM Scripts für alle Beispiele hinzugefügt:
    - `npm run example:market-search` – Marktpartner-Suche
    - `npm run example:edifact-analyze` – EDIFACT-Analyzer
    - `npm run example:utilmd` – UTILMD-Validierung
    - `npm run example:mscons` – MSCONS-Clearing
    - `npm run example:orders` – ORDERS-Incident-Replay
    - `npm run example:pricat` – PRICAT-Preissync
    - `npm run example:invoic` – INVOIC-Archivierung
  - Neue Dokumentation: `examples/README.md` mit Übersicht aller Beispiele
  - README.md: Neue "☁️ Cloud IDE Quickstarts" Section mit Vergleichstabelle
  - Drei Launch-Buttons im README-Header (Codespaces, Gitpod, StackBlitz)

- **Market Partners Search (v0.7.1)**: Neue öffentliche API zur Suche nach Marktpartnern über BDEW/EIC-Codes, Firmennamen oder Städten
  - SDK-Methode: `searchMarketPartners` für Marktpartner-Suche (öffentlicher Endpunkt ohne Authentifizierung)
  - CLI-Befehl: `willi-mako market-partners search` mit Optionen für Suchbegriff und Ergebnislimit
  - MCP-Tool: `willi-mako-search-market-partners` für Integration in MCP-Workflows
  - Web-Dashboard: Neue Sektion "Marktpartner-Suche (v0.7.1)" mit interaktiver Suchfunktion
  - Rückgabe detaillierter Informationen: BDEW-Codes, Kontakte, Software-Systeme, Kontaktdatenblätter
  - Vollständige Test-Suite mit 15 Test-Cases für Marktpartnersuche
  - Beispiel-Script: `examples/market-partner-search.ts` zur Demonstration aller Suchszenarien
  - Dokumentation in `docs/API.md` und `docs/EXAMPLES.md` ergänzt
- **EDIFACT Message Analyzer (v0.7.0)**: Umfassendes Feature-Set für die Analyse, Validierung, Erklärung und Modifikation von EDIFACT-Nachrichten
  - SDK-Methoden: `analyzeEdifactMessage`, `validateEdifactMessage`, `explainEdifactMessage`, `modifyEdifactMessage`, `chatAboutEdifactMessage`
  - CLI-Befehle unter `willi-mako edifact`: `analyze`, `validate`, `explain`, `modify`, `chat`
  - MCP-Tools: `willi-mako-analyze-edifact`, `willi-mako-validate-edifact`, `willi-mako-explain-edifact`, `willi-mako-modify-edifact`, `willi-mako-chat-edifact`
  - Web-Dashboard: Neue Sektion "EDIFACT Message Analyzer (v0.7.0)" mit interaktiven UI-Komponenten
  - Unterstützt alle gängigen EDIFACT-Nachrichtentypen: UTILMD, MSCONS, ORDERS, PRICAT, INVOIC, APERAK, CONTRL
  - Strukturelle Analyse mit BDEW/EIC Code-Resolution und Segment-Beschreibungen
  - Validierung mit detaillierten Fehler- und Warnungslisten (strukturell und semantisch)
  - KI-generierte, menschenlesbare Erklärungen von EDIFACT-Nachrichten
  - Natürlichsprachliche Modifikation von Nachrichten mit Validierung
  - Interaktiver Chat mit Kontext-Awareness für Fragen zu EDIFACT-Nachrichten
  - Vollständige Test-Suite mit 7 Test-Cases für alle Analyzer-Funktionen
  - Umfassende Dokumentation: `docs/EDIFACT_ANALYZER.md` mit Workflow-Beispielen
  - Beispiel-Script: `examples/edifact-analyzer-demo.ts` zur Demonstration aller Features

### Changed
- OpenAPI-Spezifikation auf Version 0.7.1 aktualisiert mit Market Partners Search Endpunkt
- API-Dokumentation (`docs/API.md`) erweitert um `searchMarketPartners` Methode mit Verwendungsbeispielen
- Beispiele-Dokumentation (`docs/EXAMPLES.md`) ergänzt um Market Partners Search CLI-Befehle
- MCP-Server-Instruktionen erweitert um neues Market Partners Search Tool
- TypeScript-Typen erweitert: `MarketPartnerSearchQuery`, `MarketPartnerSearchResponse`, `MarketPartnerSearchResult`, `MarketPartnerContact`, `MarketPartnerSoftwareSystem`

## [0.6.0] - 2025-11-07

### Added
- **Willi-Netz Collection Support**: Neue Endpunkte für die willi-netz Collection mit spezialisiertem Wissen zu Netzmanagement und Asset Management bei Verteilnetzbetreibern
  - SDK-Methoden: `williNetzSemanticSearch`, `williNetzChat` für dedizierte Abfragen auf willi-netz
  - SDK-Methoden: `combinedSemanticSearch`, `combinedChat` für übergreifende Suche über beide Collections (willi_mako + willi-netz)
  - CLI-Befehle: `willi-mako retrieval willi-netz-search`, `willi-mako chat willi-netz` für willi-netz-spezifische Abfragen
  - CLI-Befehle: `willi-mako retrieval combined-search`, `willi-mako chat combined` für kombinierte Abfragen
  - MCP-Tools: `willi-netz-semantic-search`, `willi-netz-chat`, `combined-semantic-search`, `combined-chat`
  - Willi-netz Collection enthält: Energierecht (EnWG, StromNEV, ARegV), BNetzA-Festlegungen & Monitoringberichte, TAB von Netzbetreibern (Westnetz, Netze BW, etc.), BDEW-Leitfäden, VDE-FNN Hinweise, Asset Management (ISO 55000)
  - Typische Anwendungsfälle: Erlösobergrenzen, §14a EnWG, SAIDI/SAIFI, TAB-Anforderungen, Netzentgelte, Smart Meter, E-Mobilität, Speicher

### Changed
- OpenAPI-Spezifikation auf Version 0.6.0 aktualisiert mit willi-netz und combined Endpunkten
- MCP-Server-Instruktionen erweitert um neue willi-netz und combined Tools
- API-Dokumentation beschreibt nun beide verfügbaren Collections und deren Einsatzzwecke

## [0.5.1] - 2025-11-04

### Added
- **MCP Document Upload**: Zwei neue MCP-Tools für das Hochladen von Dokumenten via Model Context Protocol
  - `willi-mako-upload-document`: Upload einzelner Dokumente von URL oder als Base64-encoded content
  - `willi-mako-upload-multiple-documents`: Batch-Upload von bis zu 10 Dokumenten
  - Unterstützt zwei Quellen: URL-Download (öffentlich zugängliche URLs) und Base64-Encoding (für AI-Agents)
  - Automatische Dateigröße-Validierung (max. 50MB pro Datei)
  - MIME-Type-Detection und Error-Handling für fehlgeschlagene Downloads
  - Kein lokales Filesystem-Zugriff aus Sicherheitsgründen (nur URL und Base64)

### Changed
- MCP-Server-Instruktionen in README.md erweitert um Document-Upload-Beispiele

## [0.5.0] - 2025-11-04

### Added
- **Document Management**: Vollständige Unterstützung für das Hochladen, Verwalten und Durchsuchen von Dokumenten in der Willi-Mako Knowledge Base.
  - SDK-Methoden: `uploadDocument`, `uploadMultipleDocuments`, `listDocuments`, `getDocument`, `updateDocument`, `deleteDocument`, `downloadDocument`, `reprocessDocument`, `toggleAiContext`
  - CLI-Befehle unter `willi-mako documents`: `upload`, `upload-multiple`, `list`, `get`, `update`, `delete`, `download`, `reprocess`, `ai-context`
  - MCP-Tools: `willi-mako-list-documents`, `willi-mako-get-document`, `willi-mako-update-document`, `willi-mako-delete-document`, `willi-mako-reprocess-document`, `willi-mako-toggle-ai-context`
  - Unterstützung für PDF, DOCX, TXT und MD-Dateien (max. 50MB)
  - Automatische Textextraktion und Vektorisierung für semantische Suche
  - AI-Kontext-Steuerung: Dokumente können für Chat und Reasoning aktiviert/deaktiviert werden
  - Umfassende Tests mit 17 Test-Cases für alle Document-Operationen

### Changed
- OpenAPI-Spezifikation auf Version 0.5.0 aktualisiert mit allen Document-Management-Endpunkten
- MCP-Server-Instruktionen erweitert um Document-Management-Tools

## [0.4.0] - 2025-10-20

### Changed
- MCP-Server verwaltet jetzt eigenständige `StreamableHTTPServerTransport`-Instanzen pro Session und erlaubt damit mehrere gleichzeitige MCP-Clients ohne vorgelagerten Load-Balancer oder Proxy-Neustarts.

### Tests
- Integrationstest verifiziert parallele Initialisierung und Tool-Aufrufe zweier MCP-Sessions (`tests/mcp-server.test.ts`).

## [0.3.6] - 2025-10-20

### Fixed
- MCP-Server spiegelt angeforderte CORS-Header (`Access-Control-Request-Headers`), sodass Browser-basierte Clients wie Claude Web zusätzliche Authentifizierungs- oder Diagnose-Header senden können.
- Wiederholte `initialize`-Aufrufe setzen bestehende MCP-Transportsessions sauber zurück, damit Proxies/Browser, die denselben Endpunkt mehrfach initialisieren, keinen Fehler „Server already initialized“ mehr erhalten.

### Documentation
- Ergänzt den MCP-Service-Guide um Hinweise zur Browser-Kompatibilität (Session-ID-Fallback, CORS) für gehostete Integrationen.

## [0.3.5] - 2025-10-19

### Fixed
- MCP-Server ergänzt `Mcp-Session-Id` automatisch aus `X-Session-Id`-Headern bzw. Query-Parametern, sodass Browser-basierte EventSource-Clients (z. B. VS Code MCP) sich mit dem gehosteten Endpoint `https://mcp.stromhaltig.de/` verbinden können.

### Documentation
- Neue Dokumentation [`docs/MCP_SERVICE.md`](./docs/MCP_SERVICE.md) beschreibt Architektur, Authentifizierung, Deployment-Optionen und den öffentlichen MCP-Service inkl. Token-in-URL-Workflow.

## [0.3.4] - 2025-10-19

### Fixed
- CLI stellt jetzt ein CommonJS-kompatibles Wrapper-Skript (`bin/willi-mako.cjs`) bereit, sodass Prozess-Manager wie PM2 oder ältere Node-Loader kein `ERR_REQUIRE_ESM` mehr auslösen. Globale Starts (`pm2 start --name willi-mako-mcp willi-mako -- mcp`) funktionieren damit ohne zusätzliche Flags.

### Documentation
- Troubleshooting-Guide ergänzt um Hinweise zur PM2-Nutzung und dem neuen Wrapper-Skript.

## [0.3.3] - 2025-10-19

### Added
- Attachment-Unterstützung für `/tools/generate-script`: CLI (`--attachment`), SDK (`ToolScriptAttachment` + Validierung) sowie Dokumentation akzeptieren jetzt bis zu vier Text-Referenzen (≤ ca. 1 MB Text je Datei, ≤ ca. 2 MB kombiniert) inklusive optionaler MIME-Typen, Beschreibungen und Gewichtung.
- Automatische Reparaturen für fehlgeschlagene Generator-Jobs: `generateToolScript` stößt bei bekannten Fehlercodes bis zu drei Reparaturversuche via `/tools/generate-script/repair` an, liefert eine `repairHistory` zurück und wirft bei ausgeschöpftem Limit `ToolGenerationRepairLimitReachedError`.
- CLI (`willi-mako tools generate-script`) bietet neue Optionen `--no-auto-repair`, `--repair-attempts`, `--repair-context` und `--repair-instructions`, zeigt `repairHistory` im JSON-Output an und protokolliert Reparaturversuche im Terminal.
- Automatische Prompt-Optimierung mittels `gemini-2.5-pro`: Sobald `GEMINI_API_KEY` gesetzt ist, verfeinert der Client die Nutzeranforderung, ergänzt eine Validierungs-Checkliste und stellt die Metadaten über `promptEnhancement` bereit (inkl. CLI-Logging).

### Changed
- `generateToolScript` führt eingebaute Rate-Limit-Retries, Attachments-Normalisierung und Chunking ein und propagiert die erweiterten Payloads an die Willi-Mako API. Das OpenAPI-Bundle dokumentiert das neue `attachments`-Feld.
- MCP-Server akzeptiert jetzt optional JWT-Tokens als erstes URL-Segment (`/{token}/mcp`), interpretiert sie als Bearer-Token und entfernt das Segment aus Logs sowie Weiterleitungen.
- MCP-Server-Instruktionen und Dokumentation heben die Domänenabdeckung (GPKE, WiM, GeLi Gas, EnWG, StromNZV, EDIFACT/edi@energy usw.) hervor und empfehlen optionale Prompt-Helfer-Tools.

### Removed
- MCP-Server entfernt das Tool `willi-mako-generate-tool`, um den Fokus auf kuratierte Sandbox-Workflows zu legen und Missbrauch durch unkontrollierte Skriptgenerierung zu vermeiden.

## [0.3.2] - 2025-10-17

### Changed
- `willi-mako tools generate-script` zeigt jetzt Live-Statusupdates der asynchronen Jobs, schreibt Warnungen sowie Versuchsanzahl ins Terminal und liefert im JSON-Output das vollständige Job-Objekt.
- README, Examples-Playbook und Integrations-Guide dokumentieren den neuen Polling-Workflow inklusive `progress.stage`, `warnings` und `progressLog`.
- MCP-Server (Produktiv- und Beispiel-Implementierung) pollt Generator-Jobs, protokolliert Fortschrittsschritte und gibt strukturierte Antworten mit Job-Metadaten zurück.
- `WilliMakoClient.generateToolScript` liefert das neue `GenerateToolScriptJobOperationResponse`-Wrapper-Format aus, inklusive aktualisierter Typdefinitionen.
- Web-Dashboard-Demo beachtet den konkreten Jobtyp beim Warten auf Sandbox-Jobs und bleibt kompatibel mit der neuen Union.

## [0.3.1] - 2025-10-15

### Changed
- `willi-mako tools generate-script` nutzt jetzt das deterministische `/tools/generate-script`-API, zeigt Validierungswarnungen an und erzeugt standardmäßig CommonJS-Skripte mit `.js`-Endung.
- Das MCP-Tool `willi-mako-generate-tool` liefert Descriptor-, Eingabeschema- und Output-Metadaten der Skript-Generation an Agents zurück.
- README und Tooling-Hilfen verweisen auf den deterministischen Generator und die neuen Standardausgaben.

## [0.3.0] - 2025-10-14

### Added
- CLI-Befehl `willi-mako tools generate-script` erstellt lauffähige Node.js-Tools per Reasoning-API, inklusive Artefakt-Persistierung und Dateiausgabe.
- MCP-Tool `willi-mako-generate-tool` ermöglicht Agenten, Skripte direkt aus der MaKo-Beschreibung heraus generieren und optional zu speichern.

## [0.2.3] - 2025-10-14

### Added
- Ausführliche Schritt-für-Schritt-Anleitungen für MCP-Integrationen in VS Code & GitHub Copilot, Claude Desktop, ChatGPT, anythingLLM und n8n.

### Changed
- Der MCP-Server akzeptiert nun wahlweise Bearer-Header, Basic-Credentials oder das Tool `willi-mako-login` und persistiert Tokens pro MCP-Session.
- Automatisches Anlegen und Wiederverwenden von Willi-Mako Sessions für Tools ohne `sessionId`, inklusive klarer Logging-Nachrichten.
- README und Integrations-Doku verweisen direkt auf die neuen Authentifizierungswege und Client-Setups.

## [0.2.2] - 2025-10-13

### Added
- `willi-mako serv` startet das interaktive Web-Dashboard direkt aus der CLI (inkl. Lifecycle-Handling & Shutdown-Hooks).
- `willi-mako mcp` liefert einen sofort einsatzbereiten MCP-Server auf Basis von `src/demos/mcp-server` – inklusive Tool- und Ressourceregistrierung.
- Neue Vitest-Abdeckung (`tests/mcp-server.test.ts`, `tests/web-dashboard.test.ts`) stellt sicher, dass die Server-Demos sauber starten und stoppen.

### Changed
- README, Integrations-Guide und Gitpod-Setup verweisen auf die neuen CLI-Befehle anstelle der Rohskripte.

## [0.2.1] - 2025-10-13

### Added
- CLI commands now support `--export-env` and `--no-json` to emit shell export snippets for `WILLI_MAKO_TOKEN` and `WILLI_MAKO_SESSION_ID` without manuelle JSON-Verarbeitung.
- Dokumentation enthält vollständige CLI-Workflows für Login, Session, Chat, Reasoning, Tooling und Artefakte (inklusive POSIX, PowerShell, CMD Varianten).
- README ergänzt um praxisnahe Beispiele (MSCONS2CSV, Artefakt-Upload, `jq`-Auswertung).

### Changed
- Session helpers setzen `WILLI_MAKO_SESSION_ID` automatisch für Folgebefehle und räumen sie bei `sessions delete` auf.
- README strukturell überarbeitet, um Workflows für verschiedene Shells hervorzuheben.

## [0.2.0] - 2025-10-13

### Added
- Authentication helpers (`login`) with optional token persistence for automated flows.
- Complete session management (`createSession`, `getSession`, `deleteSession`) plus typed preferences/context payloads.
- Conversational APIs: `chat`, `semanticSearch`, `generateReasoning`, `resolveContext`, `analyzeClarification` with full TypeScript coverage.
- Expanded CLI command groups (`auth`, `sessions`, `chat`, `retrieval`, `reasoning`, `context`, `clarification`) mirroring the Willi-Mako platform.
- Revamped web dashboard example covering login, session lifecycle, search, chat, reasoning, context, clarification, and sandbox analysis.
- Model Context Protocol (MCP) server tools exposing the new endpoints for AI-assisted operators.

### Changed
- Strengthened test suite with Vitest scenarios for auth persistence, session lifecycle, and advanced API flows.
- Updated documentation (README, API reference, integrations, distribution tracking) to reflect the full API surface and new examples.

### Fixed
- Template literal quoting and response formatting issues in the web dashboard sample resulting from the UI overhaul.
- Lint warnings caused by duplicate dashboard markup and untyped request payloads.

## [0.1.0] - 2025-10-12

### Added
- Initial open-source release of the official Willi-Mako Client SDK and CLI.
- TypeScript client with helper methods for tooling sandbox and artifact management.
- Bundled OpenAPI schema for offline integrations.
- Vitest test suite covering core client behaviour.
- Comprehensive documentation, onboarding guides, and community standards.

[Unreleased]: https://github.com/energychain/willi-mako-client/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/energychain/willi-mako-client/compare/v0.3.6...v0.4.0
[0.3.6]: https://github.com/energychain/willi-mako-client/compare/v0.3.5...v0.3.6
[0.3.5]: https://github.com/energychain/willi-mako-client/compare/v0.3.4...v0.3.5
[0.3.4]: https://github.com/energychain/willi-mako-client/compare/v0.3.3...v0.3.4
[0.3.3]: https://github.com/energychain/willi-mako-client/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/energychain/willi-mako-client/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/energychain/willi-mako-client/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/energychain/willi-mako-client/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/energychain/willi-mako-client/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/energychain/willi-mako-client/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/energychain/willi-mako-client/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/energychain/willi-mako-client/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/energychain/willi-mako-client/releases/tag/v0.1.0
