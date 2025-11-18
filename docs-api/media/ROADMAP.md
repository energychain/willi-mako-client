# Roadmap

This roadmap outlines the near-term and long-term priorities for the Willi-Mako Client SDK. Community feedback is welcome—open an issue or discussion with suggestions.

## Q4 2025 – Foundation & Stabilisation

- [x] Comprehensive documentation (README, contributing, security, examples)
- [x] CLI polish and examples for UTILMD, MSCONS, ORDERS, PRICAT, INVOIC
- [ ] GitHub Actions for automated build, lint, and test
- [ ] Increase Vitest coverage for CLI flows and error handling
- [ ] Provide sample mocks for offline testing

## Q1 2026 – Developer Experience

- [ ] Add typed helpers for common edi@energy transformations (segment parsers)
- [ ] Publish Postman collection powered by bundled OpenAPI spec
- [ ] Generate markdown documentation from OpenAPI automatically
- [ ] Add optional logging hooks for tracing and telemetry

## Q2 2026 – Integrations & Scaling

- [ ] Native ETL connectors (Airflow operator, Prefect task, Apache NiFi processor)
- [ ] Artifact streaming for large INVOIC attachments
- [ ] Job orchestration helpers for batching and rate limiting
- [ ] Improved device twin support for Messstellenbetreiber use cases

## Wishlist / Community Ideas

- [ ] Java/Kotlin client leveraging the same OpenAPI spec
- [ ] VS Code extension for debugging edi@energy payloads
- [ ] Sample dashboards for compliance monitoring
- [ ] Localization of docs (EN/DE parity)

## How to Influence the Roadmap

1. Start a [GitHub Discussion](https://github.com/energychain/willi-mako-client/discussions/new?category=ideas).
2. Create or upvote issues with the label `roadmap`.
3. Contact the STROMDAO team: [dev@stromdao.com](mailto:dev@stromdao.com).

We prioritise items that help the core market roles—Lieferanten, Netzbetreiber, Messstellenbetreiber—operate reliably, meet compliance requirements, and integrate with modern data platforms.
