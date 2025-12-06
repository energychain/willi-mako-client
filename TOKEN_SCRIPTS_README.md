# Token Debug & Validation Scripts

Diese Sammlung von Skripten hilft bei der Diagnose und Validierung von Authentifizierungs-Tokens für die Willi-Mako API.

## 📁 Verfügbare Skripte

### 1. `validate-token.ts` ⚡ (Empfohlen)
**Schnelle Token-Validierung**

Testet, ob ein Token funktioniert, indem eine Test-Session erstellt und wieder gelöscht wird.

```bash
# Standard: Nutzt Token aus env oder Standardwert
npx tsx validate-token.ts

# Mit spezifischem Token
npx tsx validate-token.ts "your-token-here"

# Mit Umgebungsvariable
export WILLI_MAKO_TOKEN="your-token"
npx tsx validate-token.ts
```

**Output:**
```
✅ Token is VALID and WORKING!
Session ID: xxx-xxx-xxx
```

---

### 2. `debug-token.ts` 🔍
**Umfassende Token-Tests**

Testet den Token gegen verschiedene Endpoints:
- Session-Erstellung
- OpenAPI-Schema
- Market-Partner-Suche
- Raw HTTP-Requests

```bash
npx tsx debug-token.ts
```

**Nützlich für:**
- Detaillierte Fehleranalyse
- Vergleich öffentlicher vs. authentifizierter Endpoints
- HTTP-Header-Debugging

---

### 3. `test-token-extended.ts` 🧪
**Erweiterte Funktionalitätstests**

Testet umfangreiche SDK-Funktionen:
- Session Management (Create, Get, Delete)
- Semantic Search
- Chat Endpoint
- Market Partner Search

```bash
npx tsx test-token-extended.ts
```

**Output:**
```
1️⃣  Session erstellen:     ✅ Erfolgreich
2️⃣  Session abrufen:       ✅ Erfolgreich
3️⃣  Semantic Search:       ✅ 3 Ergebnisse
4️⃣  Chat Endpoint:         ✅ Erfolgreich
5️⃣  Market Partners:       ✅ 2 gefunden
```

---

### 4. `analyze-token-format.ts` 📊
**Token-Format-Analyse**

Analysiert die Struktur eines Tokens:
- JWT-Struktur-Prüfung
- Segment-Analyse
- Encoding-Validierung
- Format-Vergleich

```bash
npx tsx analyze-token-format.ts
```

**Nützlich für:**
- Verstehen, warum ein Token abgelehnt wird
- Unterscheidung zwischen JWT und Custom-Tokens
- Token-Format-Dokumentation

---

### 5. `test-login.ts` 🔐
**Login-Flow-Test**

Testet den Login-Endpoint und erhält einen neuen JWT-Token.

```bash
export WILLI_MAKO_EMAIL="your-email@example.com"
export WILLI_MAKO_PASSWORD="your-password"
npx tsx test-login.ts
```

**Output:**
```
✅ Login successful!
Access Token: eyJhbGc...
Token Length: 234
Expires at: 2025-12-07T12:00:00Z
```

## 🎯 Empfohlener Workflow

### Problem: "Token funktioniert nicht"

```bash
# 1. Schnelle Validierung
npx tsx validate-token.ts

# 2. Falls fehlgeschlagen: Format analysieren
npx tsx analyze-token-format.ts

# 3. Falls falsches Format: Neuen Token holen
export WILLI_MAKO_EMAIL="your@email.com"
export WILLI_MAKO_PASSWORD="your-password"
npx tsx test-login.ts

# 4. Neuen Token testen
export WILLI_MAKO_TOKEN="new-token-from-login"
npx tsx validate-token.ts
```

### Problem: "Bestimmte Funktionen funktionieren nicht"

```bash
# Umfassende Tests durchführen
npx tsx test-token-extended.ts

# Detaillierte Endpoint-Analyse
npx tsx debug-token.ts
```

## 📊 Dokumentation

- **`TOKEN_WORKING_CONFIRMATION.md`** - Bestätigung, dass Custom-Tokens funktionieren
- **`TOKEN_DEBUG_REPORT.md`** - Ursprüngliche Analyse + Update
- **`TOKEN_RESOLUTION_SUMMARY.md`** - Zusammenfassung der Problemlösung

## 🔧 Konfiguration

Alle Skripte nutzen den gleichen Token-Fallback:

```typescript
const token = args[0] || process.env.WILLI_MAKO_TOKEN || DEFAULT_TOKEN;
```

Priorität:
1. CLI-Argument
2. Umgebungsvariable `WILLI_MAKO_TOKEN`
3. Hardcoded Default (nur für Tests)

## ✅ Token-Formate

Das Backend akzeptiert beide Formate:

**JWT-Token (Standard):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4...
```

**Custom API-Token:**
```
_p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc
```

## 🚀 Schnellstart

```bash
# Token validieren
npx tsx validate-token.ts

# Mit eigenem Token
npx tsx validate-token.ts "your-token-here"

# Alle Tests durchlaufen
npx tsx test-token-extended.ts
```

## 🐛 Troubleshooting

### "Token is INVALID or EXPIRED"
- Token ist abgelaufen oder ungültig
- Neuen Token via Login holen: `npx tsx test-login.ts`

### "Cannot find module"
- TypeScript-Compiler ausführen: `npm run build`
- Oder direkt mit tsx: `npx tsx script.ts`

### "WILLI_MAKO_EMAIL not set"
- Umgebungsvariablen setzen:
  ```bash
  export WILLI_MAKO_EMAIL="your@email.com"
  export WILLI_MAKO_PASSWORD="your-password"
  ```

## 📝 Hinweise

- Alle Skripte räumen nach sich auf (Test-Sessions werden gelöscht)
- Keine persistenten Änderungen in der Datenbank
- Öffentliche Endpoints werden ohne Token getestet
- Rate-Limiting wird beachtet

---

**Erstellt:** 2025-12-06
**SDK Version:** 0.9.2
**Backend:** https://stromhaltig.de/api/v2
