# 🔍 Token Authentication Debug Report

> **🎉 UPDATE (2025-12-06 13:29 UTC): PROBLEM GELÖST!**
>
> Der Token funktioniert jetzt einwandfrei! Das Backend wurde aktualisiert und akzeptiert nun beide Token-Formate.
> Siehe [TOKEN_WORKING_CONFIRMATION.md](./TOKEN_WORKING_CONFIRMATION.md) für Details.

---

## Ursprüngliches Problem (GELÖST)

Der bereitgestellte Token `_p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc` wurde zunächst vom Willi-Mako Backend mit einem **403 Forbidden** Fehler und der Meldung **"Invalid token"** abgelehnt.

**Status:** ✅ GELÖST - Backend akzeptiert jetzt Custom API-Tokens

## Ursachenanalyse

### 1. Token-Format ist NICHT JWT-konform

Das Backend erwartet JWT-Tokens gemäß der OpenAPI-Spezifikation:
```json
{
  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer",
      "bearerFormat": "JWT"
    }
  }
}
```

**Ein gültiger JWT hat die Struktur:**
```
header.payload.signature
```
z.B.: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U`

**Der bereitgestellte Token:**
```
_p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc
```

### 2. Strukturanalyse des bereitgestellten Tokens

| Merkmal | Wert | JWT-konform? |
|---------|------|--------------|
| **Länge** | 43 Zeichen | ❌ (JWTs sind normalerweise viel länger) |
| **Teile (durch `.` getrennt)** | 1 | ❌ (JWT benötigt 3) |
| **Startet mit** | `_p` | ❌ (JWTs starten mit Base64) |
| **Trennzeichen** | `-` (Bindestriche) | ❌ (JWT nutzt `.` Punkte) |
| **Segmente (durch `-` getrennt)** | 5 | ❌ (Nicht JWT-Standard) |

### 3. Token-Typ Einordnung

Der bereitgestellte Token ist **KEIN JWT**, sondern vermutlich:
- Ein API-Key aus einem anderen System
- Ein Service-Token aus einer älteren Implementierung
- Ein Token aus einem anderen Authentifizierungs-Mechanismus
- Ein verkürzter/abgeschnittener oder manipulierter Token

⚠️ **Hinweis:** Die URL-basierte Token-Notation `/{token}/mcp` ist **NUR für den MCP-Server** gedacht und funktioniert **NICHT** für direkte API-Aufrufe an `https://stromhaltig.de/api/v2`.

## Client-Verhalten (korrekt implementiert)

Der Client sendet den Token korrekt als Bearer-Token:

```typescript
headers.set('Authorization', `Bearer ${this.token}`);
```

**Tatsächlicher HTTP-Request:**
```http
POST /api/v2/sessions HTTP/1.1
Host: stromhaltig.de
Authorization: Bearer _p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc
Content-Type: application/json
```

**Backend-Antwort:**
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "success": false,
  "error": {
    "message": "Invalid token"
  }
}
```

## Lösungen

### ✅ Lösung 1: Login über die API durchführen

Mit E-Mail und Passwort einen gültigen JWT-Token erhalten:

```bash
# Umgebungsvariablen setzen
export WILLI_MAKO_EMAIL="ihre-email@example.com"
export WILLI_MAKO_PASSWORD="ihr-passwort"

# Test-Skript ausführen
npx tsx test-login.ts
```

**Oder programmatisch:**

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();

const response = await client.login({
  email: 'ihre-email@example.com',
  password: 'ihr-passwort'
});

if (response.success && response.data?.accessToken) {
  console.log('Token:', response.data.accessToken);
  // Dieser Token ist ein gültiger JWT
}
```

### ✅ Lösung 2: CLI Login-Befehl nutzen

```bash
npm run cli -- auth login \
  --email ihre-email@example.com \
  --password ihr-passwort \
  --export-env
```

Dies gibt einen Shell-Export-Befehl aus:
```bash
export WILLI_MAKO_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."
```

### ✅ Lösung 3: Automatischer Login über Umgebungsvariablen

Der CLI unterstützt automatischen Login, wenn diese Variablen gesetzt sind:

```bash
export WILLI_MAKO_EMAIL="ihre-email@example.com"
export WILLI_MAKO_PASSWORD="ihr-passwort"

# CLI holt automatisch einen Token
npm run cli -- sessions create
```

### ✅ Lösung 4: MCP-Server für URL-basierte Authentifizierung (fortgeschritten)

Falls Sie den MCP-Server nutzen möchten:

```bash
# MCP-Server lokal starten
npm run cli -- mcp --port 7337

# In einem anderen Terminal oder mit MCP-Client:
# Verbindung zu: http://localhost:7337/{IHR_JWT_TOKEN}/mcp
```

**Wichtig:** Die URL-basierte Token-Notation funktioniert **NUR** mit dem MCP-Server, **NICHT** mit der direkten API.

## Was ist zu tun?

### Für Backend-Entwickler:

1. **Token-Format prüfen:** Wurde das Token-Format im Backend geändert?
2. **Token-Quelle identifizieren:** Woher stammt der Token `_p-BLSliLL-...`?
3. **Migration:** Gibt es eine Migrations-Strategie für alte Tokens?
4. **Dokumentation:** Token-Formate und deren Verwendung klarer dokumentieren

### Für Client-Nutzer:

1. ✅ **Keine Änderungen am Client nötig** - der Client funktioniert korrekt
2. ✅ **Neuen Token holen** via Login-API (siehe Lösungen oben)
3. ✅ **Token-Format validieren** bevor er verwendet wird (muss ein JWT sein)
4. ⚠️ **URL-basierte Tokens nur für MCP-Server verwenden**, nicht für direkte API-Aufrufe

## Test-Ergebnisse

### ✅ Funktioniert (öffentliche Endpoints):
- `/openapi.json` - OpenAPI-Schema abrufen
- `/market-partners/search` - Marktpartner-Suche

### ❌ Funktioniert NICHT (authentifizierte Endpoints):
- `/sessions` (POST) - Session erstellen
- Alle anderen geschützten Endpoints

**Fehlercode:** 403 Forbidden
**Fehlermeldung:** "Invalid token"

## Debug-Skripte

Im Repository sind folgende Debug-Skripte verfügbar:

1. **`debug-token.ts`** - Testet den aktuellen Token gegen verschiedene Endpoints
2. **`analyze-token-format.ts`** - Analysiert das Token-Format im Detail
3. **`test-login.ts`** - Führt einen Login durch und testet den erhaltenen Token

Alle Skripte können mit `npx tsx <script-name>.ts` ausgeführt werden.

## Technische Details

### Token-Extraktion im Client (src/index.ts)

```typescript
constructor(options: WilliMakoClientOptions = {}) {
  this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
  this.token = options.token ?? process.env.WILLI_MAKO_TOKEN ?? null;
  // ...
}

private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, headers: providedHeaders, ...init } = options;
  const headers = new Headers(providedHeaders ?? {});

  if (!skipAuth && this.token) {
    headers.set('Authorization', `Bearer ${this.token}`);
  }
  // ...
}
```

### MCP-Server URL-Token-Extraktion (src/demos/mcp-server.ts)

```typescript
// NUR im MCP-Server! NICHT in direkten API-Aufrufen!
const segments = parsedUrl.pathname.split('/').filter(Boolean);

if (segments.length >= 2 && segments[0] !== 'mcp' && segments[1] === 'mcp') {
  pathToken = decodeURIComponent(segments[0]);
  // Token wird aus URL extrahiert: /{token}/mcp
  req.headers.authorization = `Bearer ${pathToken}`;
}
```

## Empfohlener Workflow

```bash
# 1. Credentials setzen
export WILLI_MAKO_EMAIL="ihre-email@example.com"
export WILLI_MAKO_PASSWORD="ihr-passwort"

# 2. Login durchführen und Token erhalten
npm run cli -- auth login --export-env

# 3. Ausgabe in Shell evaluieren (Beispiel)
export WILLI_MAKO_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."

# 4. Client nutzen
npm run cli -- sessions create

# 5. Token-Gültigkeit prüfen
npm run cli -- auth verify-token
```

## Fazit

**Problem:** Der Token `_p-BLSliLL-olJnCl-y1DWyYnFmJuOp1-Mj6ScjQ5Pc` ist kein gültiger JWT und wird daher vom Backend abgelehnt.

**Client-Status:** ✅ Der Client ist korrekt implementiert und sendet den Token richtig.

**Lösung:** Einen neuen, gültigen JWT-Token über die Login-API abrufen (siehe Lösungen oben).

**Token-Format:** Das Backend akzeptiert ausschließlich JWT-Tokens im Format `header.payload.signature`.

---

**Generiert am:** 2025-12-06
**Client Version:** 0.9.2
**Backend:** https://stromhaltig.de/api/v2
**Debug-Skripte:** `debug-token.ts`, `analyze-token-format.ts`, `test-login.ts`

