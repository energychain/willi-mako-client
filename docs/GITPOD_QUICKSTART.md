# 🚀 Gitpod Quickstart für Willi-Mako Client SDK

> **Für Einsteiger in Energiewirtschaft und Softwareentwicklung**
> Dieser Guide führt dich Schritt für Schritt durch die wichtigsten Use Cases der Marktkommunikation – von der Marktpartner-Suche bis zur EDIFACT-Validierung.

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/energychain/willi-mako-client)

---

## 📋 Inhaltsverzeichnis

- [Was ist Gitpod?](#-was-ist-gitpod)
- [Voraussetzungen](#-voraussetzungen)
- [Schnellstart in 3 Schritten](#-schnellstart-in-3-schritten)
- [Use Cases für Einsteiger](#-use-cases-für-einsteiger)
  - [1. Marktpartner-Suche](#1-marktpartner-suche-kein-login-erforderlich)
  - [2. EDIFACT-Nachricht analysieren](#2-edifact-nachricht-analysieren)
  - [3. Lieferantenwechsel validieren (UTILMD)](#3-lieferantenwechsel-validieren-utilmd)
  - [4. Zählerstandsdaten prüfen (MSCONS)](#4-zählerstandsdaten-prüfen-mscons)
  - [5. Bestellprozess nachvollziehen (ORDERS)](#5-bestellprozess-nachvollziehen-orders)
  - [6. Preislistenabgleich (PRICAT)](#6-preislistenabgleich-pricat)
  - [7. Rechnungsprüfung (INVOIC)](#7-rechnungsprüfung-invoic)
- [Erweiterte Funktionen](#-erweiterte-funktionen)
- [Troubleshooting](#-troubleshooting)
- [Weiterführende Ressourcen](#-weiterführende-ressourcen)

---

## 🌐 Was ist Gitpod?

**Gitpod** ist eine Cloud-basierte Entwicklungsumgebung, die direkt im Browser läuft. Du benötigst **keine lokale Installation** von Node.js, npm oder anderen Tools – alles ist sofort einsatzbereit!

**Vorteile für Einsteiger:**
- ✅ Keine Installation oder Konfiguration nötig
- ✅ Funktioniert auf jedem Computer mit Webbrowser
- ✅ Vorinstallierte Dependencies und Tools
- ✅ Sichere, isolierte Umgebung zum Experimentieren
- ✅ 50 Stunden pro Monat kostenlos für öffentliche Repositories

---

## 📝 Voraussetzungen

1. **Gitpod-Account** (kostenlos):
   👉 [gitpod.io](https://gitpod.io) mit GitHub-, GitLab- oder Bitbucket-Account anmelden

2. **Willi-Mako-Account** (kostenlos):
   👉 [stromhaltig.de/app/](https://stromhaltig.de/app/) registrieren

   Nach der Registrierung erhältst du:
   - ✉️ E-Mail-Adresse (für Login)
   - 🔑 Passwort (für Login)
   - Optional: API-Token (im Dashboard unter "Einstellungen" generierbar)

---

## 🎯 Schnellstart in 3 Schritten

### Schritt 1: Gitpod-Workspace öffnen

Klicke auf den Button oder öffne diese URL:

```
https://gitpod.io/#https://github.com/energychain/willi-mako-client
```

Gitpod lädt automatisch:
- ✅ Node.js und npm
- ✅ Alle Dependencies
- ✅ Gebautes Projekt
- ✅ VS Code-Editor im Browser

⏱️ **Erste Öffnung:** ~2-3 Minuten
⏱️ **Nachfolgende Öffnungen:** ~30 Sekunden (dank Prebuilds)

---

### Schritt 2: Authentifizierung einrichten

Es gibt **zwei Optionen**:

#### Option A: Mit E-Mail & Passwort (Empfohlen für Einsteiger)

Im Terminal (unten in Gitpod) eingeben:

```bash
export WILLI_MAKO_EMAIL='deine@email.de'
export WILLI_MAKO_PASSWORD='dein-passwort'
```

> 💡 **Tipp:** Ersetze `deine@email.de` und `dein-passwort` durch deine Zugangsdaten von stromhaltig.de

#### Option B: Mit API-Token (Für Fortgeschrittene)

```bash
export WILLI_MAKO_TOKEN='dein-api-token'
```

> 💡 **API-Token generieren:** Melde dich bei [stromhaltig.de/app/](https://stromhaltig.de/app/) an → Einstellungen → API-Token erstellen

---

### Schritt 3: Ersten Test durchführen

Führe einen einfachen Befehl aus (funktioniert **ohne Login**):

```bash
willi-mako market-partners search "Netze BW"
```

**Erwartete Ausgabe:**
```
Found 1 market partner(s):

Name: Netze BW GmbH
Code: 9900123456789
Type: Netzbetreiber
City: Stuttgart
Contact: ...
```

🎉 **Gratulation!** Dein erster API-Call war erfolgreich!

---

## 🎓 Use Cases für Einsteiger

Jeder Use Case enthält:
- 📖 **Fachliche Erklärung** – Was ist der Geschäftsprozess?
- 💻 **Technische Umsetzung** – Wie nutzt du den Client dafür?
- 🧪 **Beispiel-Code** – Zum direkten Ausprobieren

---

### 1. Marktpartner-Suche (Kein Login erforderlich!)

#### 📖 Fachlicher Hintergrund

In der Energiewirtschaft gibt es viele verschiedene **Marktpartner**:
- **Netzbetreiber** (z.B. Netze BW, Westnetz, Avacon)
- **Lieferanten** (z.B. Stadtwerke, Energieversorger)
- **Messstellenbetreiber** (z.B. Discovergy, EMH)

Jeder Marktpartner hat eindeutige **Identifikationscodes** (BDEW-Codes, EIC-Codes), die für die Kommunikation zwischen den Partnern wichtig sind.

**Typisches Szenario:**
Du hast eine EDIFACT-Nachricht erhalten und möchtest wissen, wer der Absender ist – z.B. Code `9900123456789`.

#### 💻 Technische Umsetzung

**Option 1: Via CLI (Kommandozeile)**

```bash
# Suche nach Name
willi-mako market-partners search "Netze BW"

# Suche nach Code
willi-mako market-partners search "9900123456789"

# Suche nach Stadt
willi-mako market-partners search "Stuttgart"
```

**Option 2: Via TypeScript/JavaScript**

Erstelle eine Datei `test-market-search.ts` oder führe direkt aus:

```bash
npm run example:market-search
```

**Oder erstelle eigenen Code:**

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();

// Suche nach Netzbetreiber
const results = await client.searchMarketPartners({
  query: 'Netze BW'
});

console.log('Gefundene Partner:', results.data.results.length);

results.data.results.forEach(partner => {
  console.log(`
    Name: ${partner.name}
    Code: ${partner.code}
    Typ: ${partner.marketRole}
    Stadt: ${partner.city}
    Kontakt: ${partner.contactEmail || 'N/A'}
  `);
});
```

**Ausführen:**

```bash
npx ts-node test-market-search.ts
```

#### 🎯 Übung

Versuche folgende Partner zu finden:
- [ ] Westnetz GmbH
- [ ] Stadtwerke München
- [ ] Einen Partner in deiner Stadt

---

### 2. EDIFACT-Nachricht analysieren

#### 📖 Fachlicher Hintergrund

**EDIFACT** ist das Standardformat für elektronischen Datenaustausch in der Energiewirtschaft. Nachrichten wie **UTILMD**, **MSCONS** oder **ORDERS** werden im EDIFACT-Format zwischen Marktteilnehmern ausgetauscht.

**Problem:**
EDIFACT-Nachrichten sind schwer lesbar:

```
UNH+1+UTILMD:D:04B:UN:2.3e'
BGM+Z01+47110815+9'
DTM+137:202404221015:203'
```

**Lösung:**
Der EDIFACT-Analyzer übersetzt die Nachricht in verständliche Form und prüft auf Fehler.

#### 💻 Technische Umsetzung

**Option 1: Via CLI**

Erstelle eine Beispiel-EDIFACT-Datei `test-message.edi`:

```
UNH+1+UTILMD:D:04B:UN:2.3e'
BGM+Z01+47110815+9'
DTM+137:202404221015:203'
NAD+MS+9900123456789::293'
```

Analysiere die Nachricht:

```bash
willi-mako edifact analyze test-message.edi
```

**Option 2: Via TypeScript**

```bash
npm run example:edifact-analyze
```

**Oder eigener Code:**

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();

// 1. Login (falls nicht via ENV-Variable)
await client.login({
  email: 'deine@email.de',
  password: 'dein-passwort',
  persistToken: true
});

const edifactMessage = `UNH+1+UTILMD:D:04B:UN:2.3e'
BGM+Z01+47110815+9'
DTM+137:202404221015:203'
NAD+MS+9900123456789::293'`;

// 2. Nachricht analysieren
const analysis = await client.analyzeEdifactMessage({
  message: edifactMessage
});

console.log('Analyse-Ergebnis:', JSON.stringify(analysis.data, null, 2));

// 3. Nachricht erklären lassen (KI-gestützt)
const explanation = await client.explainEdifactMessage({
  message: edifactMessage
});

console.log('\nErklärung:', explanation.data.explanation);

// 4. Nachricht validieren
const validation = await client.validateEdifactMessage({
  message: edifactMessage
});

console.log('\nValidierung:');
console.log('  Gültig:', validation.data.isValid);
console.log('  Fehler:', validation.data.errors);
console.log('  Warnungen:', validation.data.warnings);
```

#### 🎯 Übung

1. Analysiere die Beispiel-UTILMD-Nachricht
2. Lass dir die Nachricht in natürlicher Sprache erklären
3. Prüfe, ob die Nachricht valide ist

---

### 3. Lieferantenwechsel validieren (UTILMD)

#### 📖 Fachlicher Hintergrund

**Geschäftsprozess: Lieferantenwechsel**

Ein Endkunde möchte den Stromanbieter wechseln:
1. Kunde schließt Vertrag mit **neuem Lieferanten**
2. Neuer Lieferant sendet **UTILMD-Nachricht** (Format: `Z01` = Anmeldung) an **Netzbetreiber**
3. Netzbetreiber prüft die Daten und bestätigt oder lehnt ab
4. Bei Bestätigung wird der Lieferantenwechsel zum gewünschten Termin durchgeführt

**Herausforderung:**
Die UTILMD-Nachricht muss korrekt formatiert sein und alle Pflichtfelder enthalten, sonst wird sie abgelehnt.

**Lösung:**
Automatische Validierung und Archivierung für Compliance-Nachweis.

#### 💻 Technische Umsetzung

```bash
npm run example:utilmd
```

**Oder eigener Code:**

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();
await client.login({ email: '...', password: '...', persistToken: true });

// Session für diesen Geschäftsvorfall erstellen
const session = await client.createSession({
  ttlMinutes: 120,
  preferences: {
    companiesOfInterest: ['Stadtwerke XY'],
    preferredTopics: ['lieferantenwechsel', 'utilmd']
  }
});

const sessionId = session.data.session.id;

// UTILMD-Nachricht (vereinfacht)
const utilmdMessage = `UNH+1+UTILMD:D:04B:UN:2.3e'
BGM+Z01+47110815+9'
DTM+137:202404221015:203'
NAD+MS+DE0001234567890123456789::293'
NAD+MR+9900111222333::293'
LOC+172+DE0001234567890123456789::293'
DTM+92:20240501:102'
UNT+7+1'`;

// 1. Nachricht archivieren (für Audit-Trail)
await client.createArtifact({
  sessionId,
  type: 'edifact-message',
  name: 'UTILMD_Lieferantenwechsel.edi',
  mimeType: 'text/plain',
  encoding: 'utf8',
  content: utilmdMessage,
  tags: ['utilmd', 'lieferantenwechsel', 'z01']
});

console.log('✅ UTILMD-Nachricht archiviert');

// 2. Validierung durchführen
const validation = await client.validateEdifactMessage({
  message: utilmdMessage
});

console.log('\n📋 Validierungs-Ergebnis:');
console.log('  Gültig:', validation.data.isValid);
console.log('  Fehler:', validation.data.errors.length);
console.log('  Warnungen:', validation.data.warnings.length);

if (validation.data.errors.length > 0) {
  console.log('\n❌ Fehler gefunden:');
  validation.data.errors.forEach((err, i) => {
    console.log(`  ${i + 1}. ${err.message}`);
  });
}

// 3. Validierungsbericht speichern
await client.createArtifact({
  sessionId,
  type: 'validation-report',
  name: 'UTILMD_Validierung.json',
  mimeType: 'application/json',
  encoding: 'utf8',
  content: JSON.stringify(validation.data, null, 2),
  tags: ['utilmd', 'validation', 'audit']
});

console.log('\n✅ Validierungsbericht gespeichert');
console.log(`\n📂 Session-ID: ${sessionId}`);
console.log('   (Alle Artefakte sind dieser Session zugeordnet)');
```

#### 🎯 Übung

1. Führe das Beispiel aus
2. Modifiziere die UTILMD-Nachricht (z.B. entferne ein Pflichtfeld)
3. Validiere erneut und beobachte die Fehler

---

### 4. Zählerstandsdaten prüfen (MSCONS)

#### 📖 Fachlicher Hintergrund

**Geschäftsprozess: Zählerstandsübermittlung**

**MSCONS** (Metered Services Consumption Report) übermittelt Verbrauchsdaten:
- Netzbetreiber → Lieferant
- Messstellenbetreiber → Netzbetreiber
- Messstellenbetreiber → Lieferant

**Typische Inhalte:**
- Zählerstand zu einem Stichtag
- Verbrauchswerte über einen Zeitraum (15-Min-Werte, Tageswerte)
- Marktlokations-ID (DE0001234567890123456789)

**Problem:**
Fehlerhafte oder fehlende Zählerstände führen zu falschen Abrechnungen.

**Lösung:**
Automatisches Clearing: Prüfung auf Anomalien (negative Werte, fehlende Zeitstempel, Ausreißer).

#### 💻 Technische Umsetzung

```bash
npm run example:mscons
```

**Oder eigener Code:**

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();
await client.login({ email: '...', password: '...', persistToken: true });

const session = await client.createSession({ ttlMinutes: 60 });
const sessionId = session.data.session.id;

// Beispiel-Zählerstandsdaten (vereinfacht)
const meterReadings = [
  { marktlokation: 'DE0001234567890123456789', value: 2350, timestamp: '2024-03-31T22:00:00Z' },
  { marktlokation: 'DE0001234567890123456790', value: 1244, timestamp: '2024-03-31T22:00:00Z' },
  { marktlokation: 'DE0001234567890123456791', value: -50, timestamp: '2024-03-31T22:00:00Z' }, // Anomalie!
];

// 1. Daten archivieren
await client.createArtifact({
  sessionId,
  type: 'etl-input',
  name: 'mscons-readings.json',
  mimeType: 'application/json',
  encoding: 'utf8',
  content: JSON.stringify(meterReadings, null, 2),
  tags: ['mscons', 'clearing', 'input']
});

// 2. Clearing-Logik im Sandbox ausführen
const clearingJob = await client.createNodeScriptJob({
  sessionId,
  source: `
    const readings = ${JSON.stringify(meterReadings)};

    // Prüfung auf Anomalien
    const anomalies = readings.filter(r => r.value < 0);
    const valid = readings.filter(r => r.value >= 0);

    const result = {
      total: readings.length,
      valid: valid.length,
      anomalies: anomalies.length,
      anomalyDetails: anomalies
    };

    console.log(JSON.stringify(result, null, 2));
  `,
  timeoutMs: 5000,
  metadata: { format: 'MSCONS', purpose: 'clearing' }
});

// 3. Warten auf Ergebnis
const jobId = clearingJob.data.job.id;
let job = await client.getToolJob(jobId);

while (job.data.job.status === 'queued' || job.data.job.status === 'running') {
  await new Promise(resolve => setTimeout(resolve, 1000));
  job = await client.getToolJob(jobId);
}

console.log('\n📊 Clearing-Ergebnis:');
console.log(job.data.job.result?.stdout);

// 4. Ergebnis archivieren
await client.createArtifact({
  sessionId,
  type: 'etl-output',
  name: 'mscons-clearing-result.json',
  mimeType: 'application/json',
  encoding: 'utf8',
  content: job.data.job.result?.stdout || '{}',
  tags: ['mscons', 'clearing', 'output']
});

console.log('\n✅ Clearing abgeschlossen');
```

#### 🎯 Übung

1. Führe das Clearing-Beispiel aus
2. Füge weitere Zählerstände hinzu (positive und negative Werte)
3. Erweitere die Clearing-Logik um weitere Prüfungen (z.B. Maximalwerte)

---

### 5. Bestellprozess nachvollziehen (ORDERS)

#### 📖 Fachlicher Hintergrund

**Geschäftsprozess: Bestellung von Netzanschluss oder Messeinrichtung**

**ORDERS** wird verwendet für:
- Bestellung eines Netzanschlussses
- Beauftragung eines Smart Meters
- Änderung von Messeinrichtungen

**Typischer Ablauf:**
1. Lieferant sendet ORDERS-Nachricht an Netzbetreiber
2. Netzbetreiber prüft Machbarkeit
3. Netzbetreiber sendet Auftragsbestätigung (ORDRSP)

**Problem:**
Bei Störungen oder Ablehnungen muss der Vorfall nachvollziehbar dokumentiert werden.

**Lösung:**
Incident-Replay – systematische Analyse fehlgeschlagener Bestellungen.

#### 💻 Technische Umsetzung

```bash
npm run example:orders
```

**Oder eigener Code:**

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();
await client.login({ email: '...', password: '...', persistToken: true });

const session = await client.createSession({ ttlMinutes: 60 });
const sessionId = session.data.session.id;

const ordersMessage = `UNH+1+ORDERS:D:96A:UN:EAN005'
BGM+220+20240409-0001+9'
DTM+137:202404091430:203'
NAD+BY+9900111222333::293'
NAD+SU+9900444555666::293'
UNT+5+1'`;

// 1. Nachricht archivieren
await client.createArtifact({
  sessionId,
  type: 'incident-input',
  name: 'ORDERS_incident.edi',
  mimeType: 'text/plain',
  encoding: 'utf8',
  content: ordersMessage,
  tags: ['orders', 'incident', 'klaerfallanalyse']
});

// 2. Incident analysieren
const job = await client.createNodeScriptJob({
  sessionId,
  source: `
    const message = ${JSON.stringify(ordersMessage)};

    // Extrahiere wichtige Informationen
    const buyerMatch = /NAD\\+BY\\+([A-Z0-9]+)/.exec(message);
    const supplierMatch = /NAD\\+SU\\+([A-Z0-9]+)/.exec(message);
    const refMatch = /BGM\\+220\\+([^']+)/.exec(message);

    const analysis = {
      referenceNumber: refMatch?.[1],
      buyer: buyerMatch?.[1],
      supplier: supplierMatch?.[1],
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(analysis, null, 2));
  `,
  metadata: { format: 'ORDERS', action: 'incident-replay' }
});

console.log('✅ Incident-Analyse gestartet');
console.log(`Job-ID: ${job.data.job.id}`);
```

#### 🎯 Übung

1. Analysiere die ORDERS-Nachricht
2. Erweitere die Analyse um weitere Felder
3. Erstelle einen Incident-Report als PDF (via Artifact)

---

### 6. Preislistenabgleich (PRICAT)

#### 📖 Fachlicher Hintergrund

**Geschäftsprozess: Aktualisierung von Preislisten**

**PRICAT** (Price Catalogue) übermittelt:
- Netzentgelte
- Arbeitspreis und Grundpreis
- Zeitliche Gültigkeit
- Preiszonen

**Typischer Ablauf:**
1. Netzbetreiber publiziert neue Netzentgelte (oft jährlich)
2. PRICAT-Nachricht wird an Lieferanten gesendet
3. Lieferanten aktualisieren ihre Abrechnungssysteme

**Problem:**
Manuelle Preispflege ist fehleranfällig und zeitaufwändig.

**Lösung:**
Automatischer Abgleich mit ETL-Pipeline.

#### 💻 Technische Umsetzung

```bash
npm run example:pricat
```

**Code-Beispiel:**

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();
await client.login({ email: '...', password: '...', persistToken: true });

const session = await client.createSession({ ttlMinutes: 60 });
const sessionId = session.data.session.id;

// Beispiel: Neue Preisliste einlesen
const newPrices = [
  { zone: 'HT', price: 0.08, validFrom: '2025-01-01' },
  { zone: 'NT', price: 0.06, validFrom: '2025-01-01' }
];

const job = await client.createNodeScriptJob({
  sessionId,
  source: `
    const prices = ${JSON.stringify(newPrices)};
    const summary = {
      totalPrices: prices.length,
      avgPrice: (prices.reduce((sum, p) => sum + p.price, 0) / prices.length).toFixed(4),
      validFrom: prices[0]?.validFrom
    };
    console.log(JSON.stringify(summary, null, 2));
  `,
  metadata: { format: 'PRICAT', purpose: 'price-sync' }
});

console.log('✅ Preisabgleich gestartet');
```

---

### 7. Rechnungsprüfung (INVOIC)

#### 📖 Fachlicher Hintergrund

**Geschäftsprozess: Rechnungsstellung**

**INVOIC** (Invoice) übermittelt Rechnungen zwischen Marktteilnehmern:
- Lieferant → Kunde (Endkundenrechnung)
- Netzbetreiber → Lieferant (Netzentgelte)
- Messstellenbetreiber → Netzbetreiber (Messdienstleistungen)

**Herausforderung:**
Compliance-Anforderungen verlangen:
- Vollständige Archivierung (10 Jahre)
- Nachvollziehbare Prüfpfade
- Revisionssichere Speicherung

#### 💻 Technische Umsetzung

```bash
npm run example:invoic
```

**Code-Beispiel:**

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient();
await client.login({ email: '...', password: '...', persistToken: true });

const session = await client.createSession({ ttlMinutes: 1440 }); // 24h
const sessionId = session.data.session.id;

const invoicMessage = `UNH+1+INVOIC:D:96A:UN:EAN008'
BGM+380+INV-2024-001+9'
DTM+137:202404151200:203'
DTM+3:202404:610'
UNT+4+1'`;

// Archivierung
await client.createArtifact({
  sessionId,
  type: 'invoice-archive',
  name: 'INVOIC_2024_001.edi',
  mimeType: 'text/plain',
  encoding: 'utf8',
  content: invoicMessage,
  tags: ['invoic', 'compliance', 'archive-2024']
});

console.log('✅ Rechnung archiviert (compliance-konform)');
```

---

## 🚀 Erweiterte Funktionen

### Session Management

Sessions gruppieren zusammengehörige Vorgänge:

```typescript
// Session erstellen
const session = await client.createSession({
  ttlMinutes: 120,
  preferences: {
    companiesOfInterest: ['Stadtwerke München'],
    preferredTopics: ['lieferantenwechsel']
  }
});

// Session-Info abrufen
const sessionInfo = await client.getSession(session.data.session.id);

// Session löschen (inkl. aller Artefakte)
await client.deleteSession(session.data.session.id);
```

### KI-gestützter Chat

```typescript
// Chat mit Willi-Mako (Marktkommunikation)
const chatResponse = await client.chat({
  sessionId: 'my-session',
  message: 'Was sind die Pflichtfelder in einer UTILMD Z01-Nachricht?'
});

console.log(chatResponse.data.response);

// Semantische Suche
const searchResults = await client.semanticSearch({
  query: 'Lieferantenwechsel Fristen',
  options: { limit: 5 }
});
```

### Document Management

```typescript
// Dokumente auflisten
const docs = await client.listDocuments({
  page: 1,
  limit: 20,
  search: 'UTILMD'
});

// Dokument hochladen (Feature coming soon)
// Details siehe API-Dokumentation
```

---

## 🔧 Troubleshooting

### Problem: "Unauthorized" oder 401-Fehler

**Lösung:**

```bash
# Prüfe, ob ENV-Variablen gesetzt sind
echo $WILLI_MAKO_EMAIL
echo $WILLI_MAKO_PASSWORD

# Falls leer, setze sie erneut
export WILLI_MAKO_EMAIL='deine@email.de'
export WILLI_MAKO_PASSWORD='dein-passwort'

# Alternative: Login via CLI
willi-mako auth login
```

### Problem: "Session not found"

**Ursache:** Session ist abgelaufen (Standard: TTL)

**Lösung:**

```typescript
// Längere TTL setzen
const session = await client.createSession({
  ttlMinutes: 1440 // 24 Stunden
});
```

### Problem: TypeScript-Fehler

**Lösung:**

```bash
# Projekt neu bauen
npm run build

# Falls Fehler bleiben
npm install
npm run build
```

### Problem: Gitpod-Workspace startet nicht

**Lösung:**

1. Cache löschen: Workspace stoppen → Neu starten
2. Falls weiterhin Probleme: [Gitpod Status](https://status.gitpod.io) prüfen
3. Repository-Fork nutzen und eigene Gitpod-Konfiguration anpassen

---

## 📚 Weiterführende Ressourcen

### Offizielle Dokumentation

- 📘 [API-Dokumentation](./API.md)
- 🧪 [Weitere Beispiele](./EXAMPLES.md)
- 🔌 [MCP-Server-Integration](./MCP_SERVICE.md)
- 🐳 [Docker-Integration](./INTEGRATIONS.md)

### Externe Links

- 🌐 [Willi-Mako Plattform](https://stromhaltig.de/app/)
- 📖 [BDEW edi@energy](https://www.edi-energy.de/)
- 🎓 [Marktkommunikation lernen](https://www.bundesnetzagentur.de/)

### Support

- 💬 [GitHub Discussions](https://github.com/energychain/willi-mako-client/discussions)
- 🐛 [Issue Tracker](https://github.com/energychain/willi-mako-client/issues)
- 📧 E-Mail: dev@stromdao.com

---

## 🎉 Nächste Schritte

Nach diesem Quickstart bist du bereit für:

1. **Eigene Use Cases umsetzen** – Adaptiere die Beispiele für deine Anforderungen
2. **CI/CD-Integration** – Baue automatisierte Workflows mit GitHub Actions
3. **Produktivsysteme anbinden** – Nutze die APIs in deinen Applikationen
4. **Community beitreten** – Teile deine Erfahrungen und lerne von anderen

---

**Viel Erfolg mit Willi-Mako! 🚀**

Bei Fragen oder Feedback: [GitHub Discussions](https://github.com/energychain/willi-mako-client/discussions)
