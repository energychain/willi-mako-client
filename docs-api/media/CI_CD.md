# 🚀 CI/CD Pipeline Documentation

Dieses Dokument beschreibt die vollständige CI/CD-Pipeline für das Willi-Mako Client SDK.

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [GitHub Actions Workflows](#github-actions-workflows)
- [Branch-Strategie](#branch-strategie)
- [Secrets & Konfiguration](#secrets--konfiguration)
- [Deployment-Prozess](#deployment-prozess)
- [Monitoring & Badges](#monitoring--badges)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Übersicht

Die CI/CD-Pipeline automatisiert:

✅ **Code-Qualität** – Linting, Formatierung, Type-Checking
✅ **Testing** – Unit Tests, Coverage Reports
✅ **Security** – Dependency Scanning, CodeQL Analysis
✅ **Build & Package** – TypeScript Compilation, Distribution
✅ **Deployment** – Automatisches npm Publishing bei Releases
✅ **Maintenance** – Dependency Updates, Stale Issue Management

---

## 🔄 GitHub Actions Workflows

### 1. **CI Pipeline** (`.github/workflows/ci.yml`)

**Trigger:** Push zu `main`/`develop`, Pull Requests zu `main`

**Jobs:**

#### Test Matrix
- Testet auf Node.js 18, 20, 22
- Lint, Format-Check, Type-Check
- Unit Tests
- Build-Validierung
- Bundle Size Check

#### Coverage
- Test Coverage Report
- Upload zu Codecov
- Automatischer PR-Comment mit Coverage-Delta

#### Security Audit
- `npm audit` für bekannte Vulnerabilities
- Snyk Security Scan (optional)
- Fail bei moderate+ Severity

#### Dependency Review (PRs only)
- Prüft neue Dependencies auf Lizenzen
- Blockiert GPL-2.0/GPL-3.0
- Warnt bei moderate+ Vulnerabilities

**Beispiel-Status:**
```bash
✅ Test on Node.js 18
✅ Test on Node.js 20
✅ Test on Node.js 22
✅ Code Coverage (85%)
✅ Security Audit
✅ Dependency Review
```

---

### 2. **Release Pipeline** (`.github/workflows/release.yml`)

**Trigger:** Push von Git-Tags (`v*`)

**Prozess:**
1. Checkout & Setup (Node.js 20)
2. Install Dependencies
3. Run Full Test Suite
4. Build Package
5. Publish to npm (mit Provenance)
6. Create GitHub Release (mit Release Notes)

**Beispiel:**
```bash
git tag v0.8.0
git push origin v0.8.0
# → Automatisches npm Publishing + GitHub Release
```

**Voraussetzungen:**
- `NPM_TOKEN` Secret gesetzt
- Provenance-kompatibles npm Setup
- Semantic Versioning in `package.json`

---

### 3. **Documentation Pipeline** (`.github/workflows/docs.yml`)

**Trigger:** Push zu `main`, PRs

**Prozess:**
- Generiert TypeDoc-Dokumentation
- Deployed zu GitHub Pages (optional)
- Validiert Markdown-Links

---

### 4. **Prebuilds** (`.github/workflows/prebuilds.yml`)

**Trigger:** Push zu `main`, PRs

**Prozess:**
- Baut Dependencies & Artefakte vor
- Cached für GitHub Codespaces
- Triggert Gitpod Prebuild (optional)

**Benefit:** Schnellere Cloud-IDE-Starts (15-30s statt 2-3min)

---

### 5. **Dependabot Auto-Merge** (`.github/workflows/auto-merge-dependabot.yml`)

**Trigger:** Dependabot PRs

**Prozess:**
- Auto-Approve für `minor`/`patch` Updates
- Auto-Merge nach erfolgreichen CI-Checks
- Manuelle Review für `major` Updates
- Kommentar bei Breaking Changes

**Konfiguration:** `.github/dependabot.yml`

---

### 6. **PR Labeler** (`.github/workflows/labeler.yml`)

**Trigger:** PRs (opened, synchronize)

**Auto-Labels:**
- `documentation` – Änderungen in docs/
- `tests` – Änderungen in tests/
- `ci-cd` – Änderungen in .github/
- `dependencies` – package.json Updates
- `cloud-ide` – .gitpod.yml, .devcontainer/
- etc.

**Konfiguration:** `.github/labeler.yml`

---

### 7. **Stale Management** (`.github/workflows/stale.yml`)

**Trigger:** Täglich um Mitternacht UTC

**Prozess:**
- Markiert Issues als `stale` nach 60 Tagen Inaktivität
- Schließt nach weiteren 7 Tagen
- Markiert PRs als `stale` nach 30 Tagen
- Schließt nach weiteren 14 Tagen

**Exempt Labels:**
- `pinned`, `security`, `bug`, `enhancement`
- `wip`, `work-in-progress`

---

### 8. **CodeQL Security Scan** (`.github/workflows/codeql.yml`)

**Trigger:**
- Push zu `main`/`develop`
- PRs
- Wöchentlich montags 10:00 UTC

**Prozess:**
- Statische Code-Analyse
- Security & Quality Queries
- Upload zu GitHub Security Tab

---

## 🌿 Branch-Strategie

### Main Branch (`main`)
- **Geschützt** – Nur via PR + Review
- **Produktionsreif** – Jeder Commit deploybar
- **CI-Pflicht** – Alle Checks müssen grün sein
- **Releases** – Tags auslösen npm Publishing

### Develop Branch (`develop`)
- **Integration** – Feature-Entwicklung
- **CI-Checks** – Gleiche wie `main`
- **Kein Auto-Deploy**

### Feature Branches
- **Naming:** `feature/beschreibung`
- **Source:** Von `develop`
- **Target:** Merge zurück zu `develop`

### Hotfix Branches
- **Naming:** `hotfix/beschreibung`
- **Source:** Von `main`
- **Target:** Merge zu `main` UND `develop`

---

## 🔐 Secrets & Konfiguration

### Required Secrets

Setze in **GitHub Settings → Secrets → Actions**:

#### 1. `NPM_TOKEN`
```bash
# Generiere bei npmjs.com:
# Account Settings → Access Tokens → Generate New Token → Automation
```

**Permissions:** Publish packages

#### 2. `WILLI_MAKO_TOKEN` (für Tests)
```bash
# Generiere bei https://stromhaltig.de/app/
# Einstellungen → API-Token
```

**Zweck:** Integration Tests

#### 3. `SNYK_TOKEN` (optional)
```bash
# Registriere bei snyk.io
# Settings → General → API Token
```

**Zweck:** Security Scanning

#### 4. `GITPOD_TOKEN` (optional)
```bash
# Gitpod Settings → Integrations → Create Personal Access Token
```

**Zweck:** Prebuild Trigger

### Environment Variables

Im Workflow direkt gesetzt:
- `NODE_ENV`: production/test
- `CI`: true (automatisch)

---

## 📦 Deployment-Prozess

### Automatisches Deployment (Empfohlen)

```bash
# 1. Entwicklung in Feature Branch
git checkout -b feature/neue-funktion

# 2. Changes commiten
git commit -m "feat: neue Funktion hinzugefügt"

# 3. PR erstellen zu 'develop'
gh pr create --base develop

# 4. Nach Merge: Version bump in develop
npm version minor # oder patch/major
git push origin develop

# 5. Merge develop → main
gh pr create --base main --head develop

# 6. Nach Merge: Tag erstellen
git tag v0.8.0
git push origin v0.8.0

# → Automatisches npm Publishing!
```

### Manuelles Deployment

```bash
# Nur in Notfällen
npm run build
npm publish --access public
```

---

## 📊 Monitoring & Badges

### GitHub Actions Status

Alle Workflows sind im **Actions Tab** einsehbar:
```
https://github.com/energychain/willi-mako-client/actions
```

### Badges in README.md

```markdown
[![CI](https://github.com/energychain/willi-mako-client/actions/workflows/ci.yml/badge.svg)](...)
[![codecov](https://codecov.io/gh/energychain/willi-mako-client/branch/main/graph/badge.svg)](...)
[![npm version](https://img.shields.io/npm/v/willi-mako-client)](...)
```

### Coverage Reports

Codecov Dashboard:
```
https://codecov.io/gh/energychain/willi-mako-client
```

### Security Alerts

GitHub Security Tab:
```
https://github.com/energychain/willi-mako-client/security
```

---

## 🔧 Troubleshooting

### CI-Checks schlagen fehl

**Lint-Fehler:**
```bash
npm run lint:fix
```

**Format-Fehler:**
```bash
npm run format
```

**Type-Fehler:**
```bash
npm run typecheck
# Fehler manuell in Code beheben
```

**Test-Fehler:**
```bash
npm test
# oder einzelnen Test:
npm test -- tests/specific.test.ts
```

### Deployment schlägt fehl

**NPM_TOKEN ungültig:**
```bash
# Neuen Token bei npmjs.com generieren
# In GitHub Settings → Secrets aktualisieren
```

**Versionsnummer existiert bereits:**
```bash
# Version in package.json erhöhen
npm version patch # oder minor/major
```

**Build-Fehler:**
```bash
# Lokal testen:
npm run build
# Falls erfolgreich, CI neu triggern
```

### Dependabot PRs werden nicht gemerged

**Checks schlagen fehl:**
- PR lokal auschecken und debuggen
- Breaking Changes in Dependencies identifizieren

**Auto-Merge funktioniert nicht:**
- Branch Protection Rules prüfen
- "Allow auto-merge" in Repo Settings aktivieren

---

## 🚦 Branch Protection Rules

Empfohlene Einstellungen für `main`:

```yaml
Required checks:
  ✅ Test on Node.js 18
  ✅ Test on Node.js 20
  ✅ Test on Node.js 22
  ✅ Code Coverage
  ✅ Security Audit

Settings:
  ✅ Require pull request reviews (1 approval)
  ✅ Require status checks to pass
  ✅ Require branches to be up to date
  ✅ Include administrators
  ❌ Allow force pushes
  ❌ Allow deletions
```

Setzen via:
```
Settings → Branches → Add branch protection rule
```

---

## 📈 Performance-Optimierung

### Caching

Alle Workflows nutzen `actions/cache` und `setup-node` mit `cache: 'npm'`:

**Effekt:**
- Dependency Installation: 2-3min → 30-60s
- Gesamte CI-Laufzeit: ~5min → ~2min

### Matrix Builds

Node.js 18, 20, 22 parallel:
- **Ohne:** 3 × 5min = 15min
- **Mit:** max(5min, 5min, 5min) = 5min

### Selective Workflows

```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - 'tests/**'
```

Runs only wenn relevante Dateien geändert wurden.

---

## 🎓 Best Practices

### Commit Messages

Nutze Conventional Commits:
```bash
feat: neue Feature
fix: Bugfix
chore: Wartung (Dependencies, CI)
docs: Dokumentation
test: Tests
refactor: Code-Refactoring
```

### PR-Titel

Gleiche Konvention wie Commits:
```
feat: Füge Market Partners Search hinzu
fix: Behebe Fehler in EDIFACT Analyzer
chore(deps): Update Dependencies
```

### Release Notes

Automatisch generiert aus PR-Titeln via `softprops/action-gh-release`.

**Manuell anpassen:**
- GitHub Release editieren
- Highlights hinzufügen
- Breaking Changes kennzeichnen

---

## 🔗 Weiterführende Links

- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [CodeQL für JavaScript](https://codeql.github.com/docs/codeql-language-guides/codeql-for-javascript/)

---

## 📞 Support

Bei Fragen oder Problemen:

- 💬 [GitHub Discussions](https://github.com/energychain/willi-mako-client/discussions)
- 🐛 [Issue Tracker](https://github.com/energychain/willi-mako-client/issues)
- 📧 E-Mail: dev@stromdao.com

---

**Happy CI/CD! 🚀**
