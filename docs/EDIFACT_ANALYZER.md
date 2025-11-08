# EDIFACT Message Analyzer (Version 0.7.0)

Der EDIFACT Message Analyzer ist ein neues Feature-Set in Willi-Mako Client v0.7.0, das umfassende Werkzeuge zur Analyse, Validierung, Erklärung und Modifikation von EDIFACT-Nachrichten bietet.

## Übersicht

Der EDIFACT Analyzer bietet fünf Hauptfunktionen:

1. **Analyse** - Strukturelle Analyse mit Code-Resolution
2. **Validierung** - Strukturelle und semantische Prüfung
3. **Erklärung** - KI-generierte, menschenlesbare Beschreibung
4. **Modifikation** - Änderung basierend auf natürlichsprachlichen Anweisungen
5. **Chat** - Interaktive Fragen zur Nachricht

## Verwendung über SDK

### 1. Nachricht analysieren

```typescript
import { WilliMakoClient } from '@stromhaltig/willi-mako-client';

const client = new WilliMakoClient();

const analysis = await client.analyzeEdifactMessage({
  message: 'UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111'
});

console.log('Format:', analysis.data.format); // 'EDIFACT'
console.log('Summary:', analysis.data.summary);
console.log('Plausibility Checks:', analysis.data.plausibilityChecks);

// Segmente durchgehen
analysis.data.structuredData.segments.forEach(segment => {
  console.log(`${segment.tag}: ${segment.description}`);
  if (segment.resolvedCodes) {
    console.log('  Resolved codes:', segment.resolvedCodes);
  }
});
```

### 2. Nachricht validieren

```typescript
const validation = await client.validateEdifactMessage({
  message: 'UNH+1+UTILMD:D:04B:UN:2.3e\n...'
});

if (!validation.data.isValid) {
  console.error('Validation failed!');
  console.error('Errors:', validation.data.errors);
  console.error('Warnings:', validation.data.warnings);
} else {
  console.log('Message is valid!');
  console.log('Type:', validation.data.messageType);
  console.log('Segments:', validation.data.segmentCount);
}
```

### 3. Nachricht erklären

```typescript
const explanation = await client.explainEdifactMessage({
  message: 'UNH+1+MSCONS:D:11A:UN:2.6e\n...'
});

console.log('Explanation:');
console.log(explanation.data.explanation);
```

### 4. Nachricht modifizieren

```typescript
const modified = await client.modifyEdifactMessage({
  instruction: 'Erhöhe den Verbrauch in jedem Zeitfenster um 10%',
  currentMessage: 'UNH+1+MSCONS:D:11A:UN:2.6e\n...'
});

console.log('Modified message:');
console.log(modified.data.modifiedMessage);
console.log('Is valid:', modified.data.isValid);

// Speichern als Artefakt
await client.createArtifact({
  sessionId: 'my-session',
  type: 'edifact-message',
  name: 'mscons-modified.edi',
  mimeType: 'text/plain',
  encoding: 'utf8',
  content: modified.data.modifiedMessage,
  tags: ['mscons', 'modified']
});
```

### 5. Chat über Nachricht

```typescript
const edifactMessage = 'UNH+1+MSCONS:D:11A:UN:2.6e\n...';

// Erste Frage
const response1 = await client.chatAboutEdifactMessage({
  message: 'Welche Zählernummer ist in dieser Nachricht enthalten?',
  currentEdifactMessage: edifactMessage
});

console.log('Answer:', response1.data.response);

// Folgefrage mit Historie
const response2 = await client.chatAboutEdifactMessage({
  message: 'In welchem Zeitfenster ist der Verbrauch am höchsten?',
  chatHistory: [
    { role: 'user', content: 'Welche Zählernummer ist in dieser Nachricht enthalten?' },
    { role: 'assistant', content: response1.data.response }
  ],
  currentEdifactMessage: edifactMessage
});

console.log('Answer:', response2.data.response);
```

## Verwendung über CLI

### Analyse

```bash
# Von Datei
willi-mako edifact analyze --file ./data/mscons-sample.edi

# Inline-Nachricht
willi-mako edifact analyze \
  --message "UNH+1+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+1"
```

### Validierung

```bash
willi-mako edifact validate --file ./data/utilmd-lieferantenwechsel.edi

# Mit JSON-Output
willi-mako edifact validate \
  --file ./data/utilmd.edi \
  --json > validation-result.json
```

### Erklärung

```bash
willi-mako edifact explain --file ./data/mscons-sample.edi

# Ergebnis in Datei speichern
willi-mako edifact explain \
  --file ./data/mscons-sample.edi \
  --json | jq -r '.data.explanation' > explanation.txt
```

### Modifikation

```bash
willi-mako edifact modify \
  --file ./data/mscons-base.edi \
  --instruction "Erhöhe den Verbrauch in jedem Zeitfenster um 10%" \
  --output ./data/mscons-modified.edi
```

### Chat

```bash
willi-mako edifact chat \
  --file ./data/mscons-sample.edi \
  --query "Welche Zählernummer ist in dieser Nachricht enthalten?"
```

## Verwendung im Web-Dashboard

Das Web-Dashboard hat einen eigenen Bereich für den EDIFACT Analyzer:

```bash
# Dashboard starten
willi-mako web-dashboard

# Öffne http://localhost:4173
# Navigiere zur Sektion "EDIFACT Message Analyzer (v0.7.0)"
```

Das Dashboard bietet:
- **Analyze**: Strukturelle Analyse mit grafischer Darstellung
- **Validate**: Validierung mit Fehler- und Warnungslisten
- **Explain**: KI-generierte Erklärung
- **Modify**: Interaktive Nachrichtenmodifikation
- **Chat**: Chat-Interface für Fragen

## Verwendung über MCP Server

Der EDIFACT Analyzer ist auch über das Model Context Protocol verfügbar:

```bash
# MCP Server starten
willi-mako mcp

# Tools verfügbar unter:
# - willi-mako-analyze-edifact
# - willi-mako-validate-edifact
# - willi-mako-explain-edifact
# - willi-mako-modify-edifact
# - willi-mako-chat-edifact
```

## Vollständiges Workflow-Beispiel

```typescript
import { WilliMakoClient } from '@stromhaltig/willi-mako-client';
import { readFileSync, writeFileSync } from 'fs';

const client = new WilliMakoClient();

async function processEdifactMessage(filePath: string) {
  // 1. Nachricht laden
  const message = readFileSync(filePath, 'utf8');
  console.log('Processing:', filePath);

  // 2. Analysieren
  const analysis = await client.analyzeEdifactMessage({ message });
  console.log('✓ Analysis complete');
  console.log('  Format:', analysis.data.format);
  console.log('  Segments:', analysis.data.structuredData.segments.length);

  // 3. Validieren
  const validation = await client.validateEdifactMessage({ message });
  console.log('✓ Validation complete');
  console.log('  Valid:', validation.data.isValid);
  console.log('  Message Type:', validation.data.messageType);

  if (!validation.data.isValid) {
    console.error('  Errors:', validation.data.errors);
    return;
  }

  // 4. Erklärung generieren
  const explanation = await client.explainEdifactMessage({ message });
  console.log('✓ Explanation generated');
  writeFileSync(filePath + '.explanation.txt', explanation.data.explanation);

  // 5. Session erstellen für Artefakte
  const session = await client.createSession({ ttlMinutes: 60 });
  const sessionId = session.data.sessionId;
  console.log('✓ Session created:', sessionId);

  // 6. Ergebnisse als Artefakte speichern
  await client.createArtifact({
    sessionId,
    type: 'edifact-analysis',
    name: 'analysis-result.json',
    mimeType: 'application/json',
    encoding: 'utf8',
    content: JSON.stringify(analysis.data, null, 2),
    tags: ['edifact', 'analysis', validation.data.messageType || 'unknown']
  });

  await client.createArtifact({
    sessionId,
    type: 'validation-report',
    name: 'validation-result.json',
    mimeType: 'application/json',
    encoding: 'utf8',
    content: JSON.stringify(validation.data, null, 2),
    tags: ['edifact', 'validation', validation.data.messageType || 'unknown']
  });

  console.log('✓ Artifacts saved');
  console.log('Done!');
}

// Verarbeite MSCONS-Nachricht
processEdifactMessage('./data/mscons-sample.edi').catch(console.error);
```

## Unterstützte Nachrichtentypen

Der EDIFACT Analyzer unterstützt alle gängigen Nachrichtentypen der deutschen Energiewirtschaft:

- **UTILMD** - Stammdatenänderung
- **MSCONS** - Zählerstandsgangdaten
- **ORDERS** - Bestellung
- **PRICAT** - Preisliste
- **INVOIC** - Rechnung
- **APERAK** - Anwendungsbestätigung
- **CONTRL** - Technische Bestätigung

## Fehlerbehandlung

```typescript
import { WilliMakoError } from '@stromhaltig/willi-mako-client';

try {
  const result = await client.analyzeEdifactMessage({ message: invalidMessage });
} catch (error) {
  if (error instanceof WilliMakoError) {
    console.error('API Error:', error.status);
    console.error('Details:', error.body);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Best Practices

1. **Validierung vor Modifikation**: Validieren Sie Nachrichten immer vor der Modifikation
2. **Chat-Historie**: Nutzen Sie die Chat-Historie für kontextbewusste Folgefragen
3. **Artefakt-Speicherung**: Speichern Sie Analyse-Ergebnisse als Artefakte für Audit-Trails
4. **Batch-Verarbeitung**: Nutzen Sie Sessions für die Verarbeitung mehrerer Nachrichten
5. **Fehlerbehandlung**: Implementieren Sie robuste Fehlerbehandlung für Produktionsumgebungen

## Weitere Ressourcen

- [API-Dokumentation](./API.md)
- [Beispiele](./EXAMPLES.md)
- [SDK-Referenz](../src/types.ts)
- [OpenAPI-Spezifikation](../schemas/openapi.json)
