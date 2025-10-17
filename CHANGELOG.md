# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as soon as we reach a stable `1.0.0` release.

## [Unreleased]

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
- Das MCP-Tool `willi-mako.generate-tool` liefert Descriptor-, Eingabeschema- und Output-Metadaten der Skript-Generation an Agents zurück.
- README und Tooling-Hilfen verweisen auf den deterministischen Generator und die neuen Standardausgaben.

## [0.3.0] - 2025-10-14

### Added
- CLI-Befehl `willi-mako tools generate-script` erstellt lauffähige Node.js-Tools per Reasoning-API, inklusive Artefakt-Persistierung und Dateiausgabe.
- MCP-Tool `willi-mako.generate-tool` ermöglicht Agenten, Skripte direkt aus der MaKo-Beschreibung heraus generieren und optional zu speichern.

## [0.2.3] - 2025-10-14

### Added
- Ausführliche Schritt-für-Schritt-Anleitungen für MCP-Integrationen in VS Code & GitHub Copilot, Claude Desktop, ChatGPT, anythingLLM und n8n.

### Changed
- Der MCP-Server akzeptiert nun wahlweise Bearer-Header, Basic-Credentials oder das Tool `willi-mako.login` und persistiert Tokens pro MCP-Session.
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

[Unreleased]: https://github.com/energychain/willi-mako-client/compare/v0.3.2...HEAD
[0.3.2]: https://github.com/energychain/willi-mako-client/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/energychain/willi-mako-client/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/energychain/willi-mako-client/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/energychain/willi-mako-client/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/energychain/willi-mako-client/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/energychain/willi-mako-client/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/energychain/willi-mako-client/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/energychain/willi-mako-client/releases/tag/v0.1.0
