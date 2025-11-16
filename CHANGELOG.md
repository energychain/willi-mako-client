# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as soon as we reach a stable `1.0.0` release.

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
