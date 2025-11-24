# Structured Data API (v0.9.2)

Die Structured Data API erweitert Willi-Mako um strukturierte Datenabfragen aus verschiedenen Data Providern. Diese Funktion wurde in Version 0.9.2 eingeführt und ermöglicht den Zugriff auf Echtzeitdaten wie MaStR-Installationen, Energiepreise, Netzerzeugungsdaten und mehr.

## Übersicht

### Verfügbare Capabilities

Die folgenden Capabilities stehen zur Verfügung:

1. **`market-partner-search`** - Suche nach Marktpartnern (BDEW/EIC-Codes)
2. **`mastr-installations-query`** - Abfrage von Anlagen aus dem Marktstammdatenregister (MaStR)
3. **`energy-market-prices`** - Aktuelle Energiemarktpreise
4. **`grid-production-data`** - Netzerzeugungsdaten
5. **`green-energy-forecast`** - Prognosen für erneuerbare Energien

### Zwei Abfragemodi

Die API unterstützt zwei verschiedene Modi für Datenabfragen:

#### 1. Explizite Capability mit Parametern

```typescript
const result = await client.structuredDataQuery({
  capability: 'mastr-installations-query',
  parameters: {
    type: 'solar',
    bundesland: 'Bayern',
    limit: 100
  }
});
```

#### 2. Natural Language mit Intent Resolution

```typescript
const result = await client.structuredDataQuery({
  query: 'Wie viele Solaranlagen gibt es in Bayern?'
});
```

Im Natural Language Modus analysiert die KI automatisch:
- Die Benutzerabsicht (Intent)
- Welche Capability benötigt wird
- Welche Parameter aus der Anfrage extrahiert werden können
- Mit welcher Konfidenz die Interpretation erfolgte

## SDK-Verwendung

### Installation

```bash
npm install willi-mako-client
```

### Initialisierung

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient({
  token: process.env.WILLI_MAKO_TOKEN
});
```

### Datenabfrage

```typescript
// Explizite Abfrage
const solar = await client.structuredDataQuery({
  capability: 'mastr-installations-query',
  parameters: {
    type: 'solar',
    bundesland: 'Bayern',
    limit: 10
  },
  options: {
    timeout: 5000,
    bypassCache: false
  }
});

console.log(`Provider: ${solar.metadata.providerId}`);
console.log(`Execution time: ${solar.metadata.executionTimeMs}ms`);
console.log(`Cache hit: ${solar.metadata.cacheHit}`);
console.log(solar.data);

// Natural Language Abfrage
const nlResult = await client.structuredDataQuery({
  query: 'Zeige mir die aktuellen Strompreise an der Börse'
});

if (nlResult.metadata.intentResolution) {
  console.log(`Detected capability: ${nlResult.metadata.intentResolution.resolvedCapability}`);
  console.log(`Confidence: ${(nlResult.metadata.intentResolution.confidence * 100).toFixed(1)}%`);
  console.log(`Reasoning: ${nlResult.metadata.intentResolution.reasoning}`);
}
```

### Intent Resolution (Dry-Run)

Testen Sie die Intent Detection ohne Abfrage auszuführen:

```typescript
const intent = await client.resolveIntent({
  query: 'Wie viele Windkraftanlagen gibt es in Schleswig-Holstein?'
});

console.log(`Suggested capability: ${intent.data.suggestedCapability}`);
console.log(`Confidence: ${(intent.data.confidence * 100).toFixed(1)}%`);
console.log(`Parameters:`, intent.data.suggestedParameters);

// Alle erkannten Capabilities
for (const cap of intent.data.detectedCapabilities) {
  console.log(`- ${cap.capability} (${(cap.confidence * 100).toFixed(1)}%)`);
}

// Verfügbare Capabilities mit Beispielen
for (const cap of intent.data.availableCapabilities) {
  console.log(`\n${cap.capability} (${cap.providerId}):`);
  console.log(`Examples: ${cap.examples.join(', ')}`);
}
```

### Provider Management

```typescript
// Alle Provider auflisten
const providers = await client.getProviders();

console.log(`Total providers: ${providers.data.stats.totalProviders}`);
console.log(`Capabilities: ${providers.data.stats.capabilities.join(', ')}`);

for (const provider of providers.data.providers) {
  console.log(`\n${provider.displayName} (${provider.id})`);
  console.log(`  Version: ${provider.version}`);
  console.log(`  Status: ${provider.healthy ? 'healthy' : 'degraded'}`);
  console.log(`  Capabilities: ${provider.capabilities.join(', ')}`);
}

// Health-Status prüfen
const health = await client.getProvidersHealth();

console.log(`Overall: ${health.data.overall}`);
for (const provider of health.data.providers) {
  const status = provider.healthy ? '✅' : '❌';
  console.log(`${status} ${provider.providerId}`);
  if (provider.errorMessage) {
    console.log(`  Error: ${provider.errorMessage}`);
  }
}
```

## CLI-Verwendung

### Datenabfrage

```bash
# Natural Language Abfrage
willi-mako data query --query "Wie viele Solaranlagen gibt es in Bayern?"

# Explizite Capability
willi-mako data query \
  --capability mastr-installations-query \
  --parameters '{"type":"solar","bundesland":"Bayern","limit":100}'

# Mit Optionen
willi-mako data query \
  --query "Zeige mir die Strompreise" \
  --timeout 10000 \
  --bypass-cache

# JSON-Output
willi-mako data query --query "Windkraft in Deutschland" --json
```

### Intent Resolution

```bash
willi-mako data resolve-intent --query "Zeige mir die aktuellen Strompreise"
```

### Provider Management

```bash
# Alle Provider auflisten
willi-mako data providers

# JSON-Output
willi-mako data providers --json

# Health-Status prüfen
willi-mako data health
```

## MCP-Server Integration

Die Structured Data API ist vollständig in den MCP-Server integriert:

### Verfügbare Tools

1. **`willi-mako-structured-data-query`**
   - Führt Datenabfragen aus (beide Modi)
   - Input: `capability` + `parameters` ODER `query`
   - Optional: `options.timeout`, `options.bypassCache`

2. **`willi-mako-resolve-intent`**
   - Analysiert Natural Language Queries
   - Input: `query`
   - Output: Detected capabilities, confidence, reasoning

3. **`willi-mako-get-providers`**
   - Listet alle registrierten Provider
   - Output: Provider info, capabilities, health status

4. **`willi-mako-get-providers-health`**
   - Prüft Health-Status aller Provider
   - Output: Overall status, individual provider health

### Verwendung in Claude/MCP

```
User: Wie viele Solaranlagen gibt es in Bayern?

Claude verwendet automatisch: willi-mako-structured-data-query
  Input: { "query": "Wie viele Solaranlagen gibt es in Bayern?" }

Response enthält:
- Daten vom Provider (z.B. Anzahl der Anlagen)
- Intent Resolution (erkannte Capability, Konfidenz, Parameter)
- Metadata (Provider, Execution Time, Cache Status)
```

## Anwendungsfälle

### 1. Energiewendeanalyse

```typescript
// Anzahl der Solaranlagen pro Bundesland
const solar = await client.structuredDataQuery({
  query: 'Wie viele Solaranlagen gibt es in jedem Bundesland?'
});

// Windkraftausbau
const wind = await client.structuredDataQuery({
  capability: 'mastr-installations-query',
  parameters: {
    type: 'wind',
    bundesland: 'Schleswig-Holstein',
    orderBy: 'installation_date',
    limit: 1000
  }
});
```

### 2. Marktanalysen

```typescript
// Aktuelle Strompreise
const prices = await client.structuredDataQuery({
  query: 'Zeige mir die aktuellen Börsenstrompreise'
});

// Netzerzeugung
const production = await client.structuredDataQuery({
  capability: 'grid-production-data',
  parameters: {
    resolution: 'hourly',
    startDate: '2025-11-01',
    endDate: '2025-11-24'
  }
});
```

### 3. Prognosen

```typescript
// Erneuerbare Energien Forecast
const forecast = await client.structuredDataQuery({
  capability: 'green-energy-forecast',
  parameters: {
    region: 'Deutschland',
    horizon: '24h',
    energyType: ['solar', 'wind']
  }
});
```

### 4. Integration mit Chat

Die Structured Data API ist in die Chat-Funktionen integriert. Fragen wie:

- "Wie viele Solaranlagen gibt es in Bayern?"
- "Zeige mir die aktuellen Strompreise"
- "Wie hoch ist die Windkrafteinspeisung heute?"

werden automatisch mit Echtzeitdaten angereichert.

## Best Practices

### 1. Intent Resolution nutzen

Bevor Sie eine Abfrage ausführen, testen Sie mit `resolveIntent()`:

```typescript
const intent = await client.resolveIntent({ query: userQuery });

if (intent.data.confidence < 0.7) {
  console.warn('Low confidence, consider clarifying the query');
  // Zeige Nutzer alternative Capabilities
}
```

### 2. Caching beachten

```typescript
// Für Echtzeitdaten Cache umgehen
const liveData = await client.structuredDataQuery({
  query: 'Aktuelle Strompreise',
  options: { bypassCache: true }
});

// Für historische Daten Cache nutzen (Standard)
const historical = await client.structuredDataQuery({
  capability: 'mastr-installations-query',
  parameters: { /* ... */ }
  // Cache wird automatisch genutzt
});
```

### 3. Timeout anpassen

Für große Abfragen:

```typescript
const bigQuery = await client.structuredDataQuery({
  capability: 'mastr-installations-query',
  parameters: { limit: 10000 },
  options: { timeout: 30000 } // 30 Sekunden
});
```

### 4. Provider Health überwachen

```typescript
const health = await client.getProvidersHealth();

if (health.data.overall === 'degraded') {
  console.warn('Some providers are unhealthy');
  // Alternative Datenquellen nutzen oder Nutzer informieren
}
```

## Fehlerbehandlung

```typescript
try {
  const result = await client.structuredDataQuery({
    query: 'unclear query xyz'
  });
} catch (error) {
  if (error.status === 400 && error.body?.error?.code === 'INTENT_UNCLEAR') {
    console.error('Could not understand query. Try being more specific.');

    // Intent Resolution zeigt verfügbare Capabilities
    const intent = await client.resolveIntent({ query: 'unclear query' });
    console.log('Available capabilities:', intent.data.availableCapabilities);
  } else if (error.status === 404) {
    console.error('No provider available for this capability');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Weitere Informationen

- [API-Dokumentation](https://energychain.github.io/willi-mako-client/)
- [OpenAPI-Spezifikation](https://stromhaltig.de/api/v2/openapi.json)
- [Beispiele](../examples/structured-data-query.ts)
- [GitHub Repository](https://github.com/energychain/willi-mako-client)
