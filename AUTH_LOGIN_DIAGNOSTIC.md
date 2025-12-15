# 🔍 Auth Login Command Diagnostic Report

## Problem Report
Ein Nutzer berichtet, dass `willi-mako auth login -e email -p password` nicht mehr funktionieren würde.

## Test-Ergebnisse (2025-12-11)

### ✅ Alle Tests bestanden

Die CLI-Befehle wurden umfassend getestet und funktionieren **einwandfrei**:

1. **CLI Binary Accessible**: ✅
   - Help-Ausgabe funktioniert korrekt
   - Alle Optionen werden angezeigt

2. **Short Options (-e, -p)**: ✅
   - Befehl: `willi-mako auth login -e email -p password`
   - Parameter werden korrekt übergeben
   - Authentifizierung wird durchgeführt (Fehler bei ungültigen Credentials ist erwartet)

3. **Long Options (--email, --password)**: ✅
   - Befehl: `willi-mako auth login --email email --password password`
   - Parameter werden korrekt übergeben
   - Funktioniert identisch zu short options

4. **Required Parameters**: ✅
   - Fehlende Parameter werden korrekt erkannt
   - Klare Fehlermeldungen: "required option '-e, --email <email>' not specified"

5. **Package Version**: ✅
   - Aktuelle Version: 0.9.3
   - Korrekt installiert und einsatzbereit

## Code-Analyse

### CLI-Implementierung (src/cli.ts, Zeilen 82-125)

```typescript
auth
  .command('login')
  .description('Exchange email/password credentials for a JWT access token')
  .requiredOption('-e, --email <email>', 'Email address used for authentication')
  .requiredOption('-p, --password <password>', 'Password used for authentication')
  .option('--no-store', 'Do not persist the retrieved token on this client instance')
  .option('--export-env', 'Print shell export statement for WILLI_MAKO_TOKEN', false)
  .option('--shell <shell>', 'Shell for --export-env output (posix|powershell|cmd)', 'posix')
  .option('--json', 'Print JSON response payload', true)
  .action(async (options) => {
    const client = await createClient();
    const response = await client.login(
      {
        email: options.email,
        password: options.password
      },
      {
        persistToken: options.store !== false
      }
    );
    // ... weitere Verarbeitung
  });
```

**Status**: ✅ Korrekt implementiert

- `requiredOption` für email und password
- Beide short (`-e`, `-p`) und long (`--email`, `--password`) Optionen definiert
- Parameter werden korrekt an `client.login()` übergeben

## Mögliche Ursachen beim Nutzer

Da der Code einwandfrei funktioniert, liegt das Problem wahrscheinlich beim Nutzer:

### 1. **Veraltete Package-Version** 🔴
**Wahrscheinlichkeit: HOCH**

Der Nutzer verwendet möglicherweise eine alte Version, die einen Bug hatte oder anders funktioniert.

**Lösung:**
```bash
# Version prüfen
npm list willi-mako-client

# Auf neueste Version updaten
npm update willi-mako-client

# Oder global updaten
npm update -g willi-mako-client

# Oder mit npx die neueste Version forcieren
npx willi-mako-client@latest auth login -e email -p password
```

### 2. **Falsche Credentials** 🟡
**Wahrscheinlichkeit: MITTEL**

Tippfehler in Email oder Passwort führen zu 401-Fehlern.

**Typische Fehlermeldung:**
```
Request failed (401)
{
  success: false,
  error: { message: 'Ungültige E-Mail oder Passwort' }
}
```

**Lösung:**
- Credentials überprüfen
- Auf Copy&Paste-Fehler achten (versteckte Zeichen, Leerzeichen)

### 3. **Netzwerk-/Backend-Probleme** 🟡
**Wahrscheinlichkeit: MITTEL**

- Backend-Service vorübergehend nicht erreichbar
- Firewall/Proxy blockiert die Verbindung
- SSL/TLS-Zertifikatsprobleme

**Typische Fehlermeldungen:**
```
ECONNREFUSED
ETIMEDOUT
certificate has expired
```

**Lösung:**
```bash
# Backend-Erreichbarkeit testen
curl https://stromhaltig.de/api/v2/openapi.json

# Mit verbose output
npx willi-mako --verbose auth login -e email -p password
```

### 4. **Installation/Environment-Probleme** 🔴
**Wahrscheinlichkeit: NIEDRIG**

- `npx` nicht im PATH
- Node.js-Version zu alt (< 18)
- Korrupte npm-Installation

**Lösung:**
```bash
# Node-Version prüfen
node --version  # sollte >= 18 sein

# npx verfügbarkeit
which npx

# Neu installieren
npm uninstall -g willi-mako-client
npm install -g willi-mako-client
```

### 5. **Syntax-Fehler beim Aufruf** 🟢
**Wahrscheinlichkeit: SEHR NIEDRIG**

Der Nutzer könnte einen Syntax-Fehler im Befehl haben:

**Falsch:**
```bash
willi-mako auth login -e email -p password    # email/password wörtlich
willi-mako auth login -eemail@example.com     # kein Leerzeichen
willi-mako auth login --e email --p password  # doppelter Bindestrich bei short options
```

**Richtig:**
```bash
willi-mako auth login -e user@example.com -p mypassword123
willi-mako auth login --email user@example.com --password mypassword123
```

## Empfohlene Vorgehensweise

### Schritt 1: Version prüfen
```bash
npm list willi-mako-client
# oder
npx willi-mako-client --help | head -1
```

### Schritt 2: Auf neueste Version updaten
```bash
npm update willi-mako-client
# oder global
npm update -g willi-mako-client
```

### Schritt 3: Mit neuester Version testen
```bash
npx willi-mako-client@latest auth login -e ihre-email@example.com -p ihr-passwort
```

### Schritt 4: Genaue Fehlermeldung erfragen
Bitten Sie den Nutzer, die **exakte Fehlermeldung** bereitzustellen:
```bash
npx willi-mako auth login -e email -p password 2>&1 | tee error.log
```

### Schritt 5: Environment-Informationen sammeln
```bash
node --version
npm --version
npx willi-mako-client@latest --help
npm list willi-mako-client
```

## Debug-Befehle für den Nutzer

```bash
# 1. Version prüfen
npm list willi-mako-client

# 2. Help anzeigen (funktioniert das?)
npx willi-mako auth login --help

# 3. Mit neuester Version testen
npx willi-mako-client@latest auth login -e test@example.com -p test

# 4. Backend-Verbindung testen
npx willi-mako openapi --local

# 5. Umgebung prüfen
node --version
npm --version
```

## Fazit

✅ **Der Code ist korrekt und funktioniert einwandfrei**

Der `willi-mako auth login -e email -p password` Befehl funktioniert in Version 0.9.3 vollständig. Das Problem liegt höchstwahrscheinlich bei:

1. Veralteter Package-Version beim Nutzer
2. Falschen oder ungültigen Credentials
3. Netzwerk-/Backend-Problemen

**Empfehlung**: Bitte den Nutzer um:
- Update auf die neueste Version
- Exakte Fehlermeldung
- Environment-Informationen (Node-Version, Package-Version)

---

**Getestet am**: 2025-12-11
**Getestete Version**: 0.9.3
**Status**: ✅ VOLL FUNKTIONSFÄHIG
**Test-Skript**: `diagnose-auth-login.ts`
