# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) as soon as we reach a stable `1.0.0` release.

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
