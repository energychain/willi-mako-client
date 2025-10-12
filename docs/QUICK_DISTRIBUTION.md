# Quick Start Guide - Distribution

Schnellanleitung zur sofortigen Verbreitung von willi-mako-client v0.1.0.

## ⚡ 15-Minuten Quick Start

### 1. GitHub Topics hinzufügen (2 Min)

```bash
# Via GitHub Web UI:
# 1. Gehe zu https://github.com/energychain/willi-mako-client
# 2. Klicke auf ⚙️ (Settings-Icon neben "About")
# 3. Füge Topics hinzu:
```

**Empfohlene Topics** (max 20):
```
typescript
nodejs
api-client
sdk
cli
energy
utility
edi
etl
compliance
open-source
mcp-server
model-context-protocol
automation
german-energy
marktkommunikation
typescript-library
developer-tools
```

### 2. JSR Publish (5 Min)

```bash
cd /config/Development/willi-mako-client

# JSR CLI installieren (falls noch nicht vorhanden)
npm install -g @jsr/cli

# Bei JSR anmelden (einmalig)
jsr login

# Paket publishen
npx jsr publish

# Oder ohne globale Installation:
npx jsr@latest publish
```

**Erwartetes Ergebnis**: Package verfügbar unter `jsr.io/@energychain/willi-mako-client`

### 3. Dev.to Post (30 Min)

```bash
# 1. Gehe zu https://dev.to/new
# 2. Kopiere Template aus docs/ANNOUNCEMENT_TEMPLATES.md
# 3. Passe an (Logo, Screenshots hinzufügen)
# 4. Publish mit Tags: typescript, nodejs, opensource, api
```

### 4. Twitter Thread (10 Min)

```bash
# 1. Kopiere Thread aus docs/ANNOUNCEMENT_TEMPLATES.md
# 2. Poste ersten Tweet
# 3. Reply mit restlichen Tweets
# 4. Tags: @nodejs @typescriptlang
```

### 5. Reddit Post r/typescript (10 Min)

```bash
# 1. Gehe zu https://reddit.com/r/typescript/submit
# 2. Wähle "Post" Type
# 3. Kopiere Template aus docs/ANNOUNCEMENT_TEMPLATES.md
# 4. Submit
```

### 6. LinkedIn (10 Min)

```bash
# 1. Erstelle neuen Post auf LinkedIn
# 2. Kopiere Template aus docs/ANNOUNCEMENT_TEMPLATES.md
# 3. Füge Hashtags hinzu
# 4. Post
```

### 7. GitHub Discussions aktivieren (2 Min)

```bash
# Via GitHub Web UI:
# 1. Settings > Features > Discussions ✅
# 2. Create categories: Announcements, Q&A, Show and Tell
```

### 8. Social Preview Image (15 Min)

Erstelle ein Image (1280×640px) mit:
- Logo von Willi-Mako
- Tagline: "TypeScript SDK for Energy Market Communication"
- Tech Stack Icons: TypeScript, Node.js, CLI
- GitHub Stars Badge

**Tools**: Canva, Figma, oder Photopea (kostenlos)

**Upload**:
```bash
# Via GitHub Web UI:
# Settings > Social Preview > Upload Image
```

---

## 🚀 Sofort-Commands

### JSR Publish One-Liner

```bash
npx jsr@latest publish --allow-dirty
```

### GitHub Topics via CLI (optional)

```bash
# Requires GitHub CLI
gh repo edit energychain/willi-mako-client \
  --add-topic typescript \
  --add-topic nodejs \
  --add-topic api-client \
  --add-topic sdk \
  --add-topic cli \
  --add-topic energy \
  --add-topic etl \
  --add-topic compliance
```

### Alle Links auf einmal checken

```bash
# npm
open https://www.npmjs.com/package/willi-mako-client

# Libraries.io (automatisch indexiert)
open https://libraries.io/npm/willi-mako-client

# Bundlephobia
open https://bundlephobia.com/package/willi-mako-client@0.1.0

# Packagephobia
open https://packagephobia.com/result?p=willi-mako-client

# Snyk Advisor
open https://snyk.io/advisor/npm-package/willi-mako-client
```

---

## 📋 Checkliste

Drucke diese Checkliste aus und hake ab:

### Sofort (Heute)
- [ ] GitHub Topics hinzugefügt
- [ ] JSR published
- [ ] Dev.to Post veröffentlicht
- [ ] Twitter Thread gepostet
- [ ] LinkedIn Post erstellt
- [ ] Reddit r/typescript gepostet
- [ ] GitHub Discussions aktiviert
- [ ] Social Preview Image hochgeladen

### Diese Woche
- [ ] Reddit r/node gepostet
- [ ] OpenBase geclaimed
- [ ] Newsletter Submissions (Node Weekly, JS Weekly)
- [ ] Hacker News Show HN
- [ ] Product Hunt vorbereitet
- [ ] GitHub Pages aktiviert (TypeDoc)

### Nächste Woche
- [ ] Product Hunt Launch
- [ ] Medium/Hashnode Artikel
- [ ] Awesome Lists PRs
- [ ] Best of JS Issue
- [ ] Podcast Pitches

### Langfristig
- [ ] OpenSSF Best Practices Badge
- [ ] Video Tutorial
- [ ] Energy Community Posts
- [ ] Follow-up Blog Posts

---

## 📊 Success Tracking

### Woche 1 Ziele

| Metrik | Ziel | Aktuell |
|--------|------|---------|
| npm Downloads | 100 | ___ |
| GitHub Stars | 10 | ___ |
| Twitter Impressions | 1,000 | ___ |
| Dev.to Views | 500 | ___ |
| Reddit Upvotes | 20 | ___ |

### Tracking Commands

```bash
# npm Downloads (daily)
npm info willi-mako-client downloads

# GitHub Stats
gh repo view energychain/willi-mako-client --json stargazerCount,forkCount

# npm Trends (browser)
open https://npmtrends.com/willi-mako-client
```

---

## 🆘 Support

Bei Fragen oder Problemen:

1. **GitHub Issues**: https://github.com/energychain/willi-mako-client/issues
2. **Email**: dev@stromdao.com
3. **Documentation**: Siehe `docs/DISTRIBUTION_STRATEGY.md` für Details

---

**Geschätzte Gesamtzeit**: 1.5 Stunden
**Potentielle Reichweite**: 500,000+ Developers
**ROI**: Hoch - Einmalige Investition, langfristiger Nutzen

**Let's go! 🚀**
