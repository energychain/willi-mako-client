# Backend Streaming-Endpoint Analyse

**Datum:** 15. Dezember 2024
**Version:** willi-mako-client 0.9.3
**Status:** 🔴 KRITISCH - Streaming nicht implementiert

## 📋 Zusammenfassung

Das Backend-Team hat einen **kritischen Architektur-Hinweis** bezüglich des Chat-Endpoints kommuniziert:

- **Problem:** `POST /api/v2/chat` ist **synchron** und wartet auf vollständige AI-Verarbeitung (90+ Sekunden)
- **Folge:** Bei langen Anfragen (> 90-100 Sekunden) tritt ein **504 Gateway Timeout** durch Cloudflare auf
- **Lösung:** Es gibt einen **offiziellen Streaming-Endpoint** mit Server-Sent Events (SSE)

### Status im willi-mako-client SDK/CLI

| Komponente | Verwendet `/api/v2/chat` | Streaming implementiert | Status |
|------------|--------------------------|------------------------|---------|
| **SDK Core** (`src/index.ts`) | ✅ Ja (Zeile 362) | ❌ Nein | 🔴 Betroffen |
| **CLI** (`src/cli.ts`) | ✅ Ja (Zeile 219-244) | ❌ Nein | 🔴 Betroffen |
| **MCP Server** (`src/demos/mcp-server.ts`) | ✅ Ja (indirekt) | ❌ Nein | 🔴 Betroffen |
| **Web Dashboard** (`src/demos/web-dashboard.ts`) | ✅ Ja (Zeile 201-225) | ❌ Nein | 🔴 Betroffen |
| **Examples** (`examples/`) | ✅ Ja | ❌ Nein | 🔴 Betroffen |
| **Dokumentation** | ❌ Keine Warnung | ❌ Keine SSE-Docs | 🔴 Unvollständig |

---

## 🔍 Detailanalyse

### 1. SDK Core (`src/index.ts`)

**Zeilen 356-368:**
```typescript
/**
 * Sends a conversational message to the Willi-Mako chat endpoint.
 */
public async chat(payload: ChatRequest): Promise<ChatResponse> {
  return this.request<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
```

**Problem:**
- Verwendet den synchronen `/api/v2/chat` Endpoint (der intern an `/api/v2/chat` routet)
- Keine Timeout-Behandlung
- Bei langen AI-Verarbeitungen (Reasoning, RAG mit vielen Quellen) → 504 Timeout

**Verfügbare Session-Daten:**
- `legacyChatId` ist in `SessionEnvelope` vorhanden (Zeile 85 in `types.ts`)
- Kann für Streaming-Endpoint verwendet werden: `/api/chat/chats/{legacyChatId}/messages/stream`

---

### 2. CLI (`src/cli.ts`)

**Zeilen 219-244:**
```typescript
chat
  .command('send')
  .description('Send a message to the conversational Willi-Mako endpoint')
  .requiredOption('-s, --session <sessionId>', 'Session identifier used for the conversation')
  .requiredOption('-m, --message <message>', 'Message content to send to the assistant')
  // ...
  .action(async (options) => {
    const client = await createClient({ requireToken: true });
    const payload: ChatRequest = {
      sessionId: options.session,
      message: options.message,
      // ...
    };
    const response = await client.chat(payload); // ← SYNCHRON!
    outputJson(response);
  });
```

**Problem:**
- CLI nutzt die synchrone `client.chat()` Methode
- Benutzer haben keine Möglichkeit, Streaming zu aktivieren
- Keine Progress-Anzeige bei langen Anfragen
- CLI hängt bis zu 90+ Sekunden ohne Feedback

---

### 3. Web Dashboard (`src/demos/web-dashboard.ts`)

**Zeilen 201-225:**
```typescript
if (req.method === 'POST' && url.pathname === '/chat') {
  try {
    const payload = (await parseJsonBody(req)) as {
      sessionId?: string;
      message?: string;
      contextSettings?: Record<string, unknown>;
      timelineId?: string;
    } | null;
    // ...
    const response = await client.chat({
      sessionId: payload.sessionId,
      message: payload.message,
      // ...
    });
    sendJson(res, 200, response);
  } catch (error) {
    handleApiError(res, error);
  }
  return;
}
```

**Problem:**
- Browser-basiertes UI wartet synchron auf Response
- Keine Progress-Updates für User
- Bei Timeout erscheint nur generischer Error
- Schlechte UX bei komplexen Fragen

**Client-Code (Zeile 1710-1738):**
```typescript
attachFormHandler('chat-form', async (formData) => {
  const sessionId = resolveSessionId(formData.get('sessionId'));
  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      message: formData.get('message'),
      // ...
    })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? 'Nachricht konnte nicht gesendet werden');
  }
  return { outputId: 'chat-output', data };
}, 'chat-output');
```

---

### 4. MCP Server (`src/demos/mcp-server.ts`)

**Zeilen 710-733:**
```typescript
registerTool(
  'willi-mako-chat',
  {
    title: 'Willi-Mako chat',
    description: 'Consult the energy-market assistant...',
    inputSchema: {
      sessionId: z.string().describe('Session identifier (UUID).').optional(),
      message: z.string().describe('Message content to send to the assistant.'),
      // ...
    }
  },
  async (input: Record<string, unknown>, extra?: RequestContext) =>
    withClient(extra, async (clientInstance, transportSessionId) => {
      // ...
      const response = await clientInstance.chat(payload); // ← SYNCHRON!
      return respond({ ...response, sessionId: activeSessionId });
    })
);
```

**Problem:**
- MCP-Tools nutzen ebenfalls die synchrone Methode
- LLM-Clients (Claude, GPT) müssen lange warten
- Timeout kann MCP-Connection unterbrechen
- Keine Stream-Events für Tool-Progress

---

### 5. Dokumentation

**`docs/API.md` (Zeilen 116-132):**
```markdown
### `chat(payload)`

Sends a conversational message to the Willi-Mako assistant.

```typescript
const reply = await client.chat({
  sessionId,
  message: 'Welche MSCONS-Anomalien wurden entdeckt?'
});
```

Optional fields:
- `contextSettings` – temporary override of context for the message.
- `timelineId` – attach events to a shared timeline.

Returns a `ChatResponse` with assistant reply and metadata.
```

**Problem:**
- **Keine Warnung** über synchrones Verhalten
- Keine Erwähnung von Timeout-Risiken
- Keine Alternative (Streaming) dokumentiert

**`docs/TROUBLESHOOTING.md`:**
- Erwähnt nur allgemeine Timeouts (Zeile 52-67)
- Kein Hinweis auf Chat-spezifische 504-Errors
- Keine Streaming-Lösung vorgeschlagen

---

## ✅ Was funktioniert bereits

### 1. Session-Management
- `createSession()` gibt `legacyChatId` zurück ✅
- Dieser kann direkt für Streaming verwendet werden ✅

**Beispiel:**
```typescript
const session = await client.createSession();
console.log(session.data.legacyChatId); // UUID verfügbar
```

### 2. Type-Support
`legacyChatId` ist bereits in TypeScript-Types definiert:

**`src/types.ts` Zeile 85:**
```typescript
export interface SessionEnvelope {
  sessionId: string;
  userId: string;
  legacyChatId?: string; // ✅ Vorhanden!
  workspaceContext: Record<string, unknown>;
  // ...
}
```

---

## 🚨 Was fehlt

### 1. Streaming-Methode im SDK

**Benötigt:** `chatStreaming()` Methode

```typescript
/**
 * Sends a message via Server-Sent Events (SSE) streaming.
 * Recommended for long-running AI operations (> 90s).
 *
 * @param chatId - legacyChatId from session creation
 * @param payload - Message content and context
 * @param onProgress - Callback for progress events
 * @returns Final completion event with message data
 */
public async chatStreaming(
  chatId: string,
  payload: {
    content: string;
    contextSettings?: Record<string, unknown>;
  },
  onProgress?: (event: StreamEvent) => void
): Promise<StreamEvent>
```

**Stream-Event Types:**
```typescript
export interface StreamEvent {
  type: 'status' | 'progress' | 'complete' | 'error';
  message?: string;
  progress?: number;
  data?: {
    userMessage: any;
    assistantMessage: any;
  };
}
```

### 2. CLI-Support für Streaming

**Benötigt:** `--stream` Flag

```bash
# Aktuell (synchron, Timeout-anfällig):
willi-mako chat send -s $SESSION_ID -m "Lange Frage..."

# Neu (streaming mit Progress):
willi-mako chat send -s $SESSION_ID -m "Lange Frage..." --stream
⏳ Starte Anfrage... (0%)
⏳ Durchsuche Wissensdatenbank... (30%)
⏳ Generiere Antwort... (75%)
✅ Fertig! (100%)
```

### 3. Web-Dashboard Streaming UI

**Benötigt:**
- SSE-Client im Browser
- Progress-Bar während Verarbeitung
- Echtzeit-Status-Updates

### 4. MCP-Tool für Streaming

**Benötigt:** Separates Tool `willi-mako-chat-streaming`

```typescript
registerTool(
  'willi-mako-chat-streaming',
  {
    title: 'Willi-Mako streaming chat',
    description: 'Chat with progress updates via SSE (recommended for long operations)',
    inputSchema: {
      sessionId: z.string().optional(),
      message: z.string(),
      reportProgress: z.boolean().default(true).optional()
    }
  },
  async (input, extra) => {
    // SSE Implementation mit Progress-Streaming
  }
);
```

### 5. Dokumentation

**Benötigt:**

#### `docs/API.md`
- Warnung bei `chat()` Methode
- Neue Sektion für `chatStreaming()`
- Migration-Guide

#### `docs/TROUBLESHOOTING.md`
- Sektion "Chat Timeouts (504)"
- Empfehlung für Streaming bei langen Anfragen

#### `docs/EXAMPLES.md`
- Code-Beispiel für Streaming-Chat
- Vergleich synchron vs. streaming

#### Neues Dokument: `docs/STREAMING.md`
- Vollständige SSE-Dokumentation
- Event-Typen und Handling
- Best Practices

---

## 📊 Impact-Assessment

### Betroffene User-Szenarien

| Szenario | Dauer | Timeout-Risiko | Impact |
|----------|-------|----------------|---------|
| Einfache Frage ("Was ist UTILMD?") | 5-15s | 🟢 Niedrig | Keine Probleme |
| Semantic Search + Chat | 30-60s | 🟡 Mittel | Grenzwertig |
| Reasoning mit vielen Quellen | 90-180s | 🔴 Hoch | **Garantierter Timeout** |
| Blog-Content-Transformation | 120-300s | 🔴 Sehr hoch | **Immer Timeout** |
| Komplexe EDIFACT-Analyse | 60-120s | 🔴 Hoch | Oft Timeout |

### Betroffene Integrationen

1. **Blog-Content-Transformation** (Original Use-Case vom Backend-Team)
   - Status: 🔴 **NICHT FUNKTIONSFÄHIG**
   - Problem: 13:36:12 → 13:37:42 (90s) → 504 Timeout

2. **CI/CD Pipelines mit Chat-Befehlen**
   - Status: 🟡 Risiko bei komplexen Fragen

3. **Interaktive CLI-Nutzung**
   - Status: 🟡 Schlechte UX (Warten ohne Feedback)

4. **Claude/GPT MCP-Integration**
   - Status: 🔴 Connection-Abbrüche bei langen Anfragen

5. **Web-Dashboard für Endbenutzer**
   - Status: 🟡 Schlechte UX, aber funktioniert meist

---

## 🎯 Empfohlene Maßnahmen

### Phase 1: Core Implementation (KRITISCH)
**Priorität:** 🔴 HOCH
**Aufwand:** ~2-3 Tage

- [ ] Streaming-Methode in `src/index.ts` implementieren
- [ ] Stream-Event Types in `src/types.ts` hinzufügen
- [ ] Tests für Streaming-Endpoint schreiben
- [ ] Beispiel-Code in `examples/streaming-chat.ts`

### Phase 2: CLI & Docs (WICHTIG)
**Priorität:** 🟡 MITTEL
**Aufwand:** ~1-2 Tage

- [ ] CLI `--stream` Flag implementieren
- [ ] Progress-Output im Terminal
- [ ] Dokumentation aktualisieren:
  - [ ] Warnung in `docs/API.md`
  - [ ] `docs/STREAMING.md` erstellen
  - [ ] Troubleshooting erweitern
- [ ] README.md mit Best Practices

### Phase 3: Advanced Features (OPTIONAL)
**Priorität:** 🟢 NIEDRIG
**Aufwand:** ~2-3 Tage

- [ ] Web-Dashboard Streaming UI
- [ ] MCP Streaming-Tool
- [ ] Automatische Fallback-Logik (sync → stream bei Timeout)
- [ ] Retry-Mechanismus mit Streaming

### Phase 4: Migration (LANGFRISTIG)
**Priorität:** 🟢 NIEDRIG
**Aufwand:** Kontinuierlich

- [ ] Alte `chat()` als deprecated markieren
- [ ] Migration-Notices in Releases
- [ ] Breaking Change in v1.0.0

---

## 📝 Code-Snippets für Implementation

### SDK Core (`src/index.ts`)

```typescript
/**
 * Sends a message via Server-Sent Events (SSE) streaming.
 * Recommended for long-running AI operations (> 90 seconds).
 *
 * @param chatId - legacyChatId from session creation
 * @param payload - Message content and context settings
 * @param onProgress - Optional callback for progress events
 * @returns Final completion event with message data
 *
 * @example
 * ```typescript
 * const session = await client.createSession();
 * const result = await client.chatStreaming(
 *   session.data.legacyChatId!,
 *   { content: 'Lange Frage...' },
 *   (event) => console.log(`${event.message} (${event.progress}%)`)
 * );
 * console.log(result.data.assistantMessage.content);
 * ```
 */
public async chatStreaming(
  chatId: string,
  payload: {
    content: string;
    contextSettings?: Record<string, unknown>;
  },
  onProgress?: (event: StreamEvent) => void
): Promise<StreamEvent> {
  const url = `${this.baseUrl.replace('/api/v2', '/api/chat')}/chats/${encodeURIComponent(chatId)}/messages/stream`;

  const response = await this.fetchImpl(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new WilliMakoError(
      `Streaming request failed: ${response.statusText}`,
      response.status,
      errorText
    );
  }

  if (!response.body) {
    throw new WilliMakoError('Response body is null', 500, null);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalEvent: StreamEvent | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');

      // Keep last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: StreamEvent = JSON.parse(line.slice(6));

            // Call progress callback
            if (onProgress) {
              onProgress(event);
            }

            // Store final event
            if (event.type === 'complete') {
              finalEvent = event;
            }

            // Handle errors
            if (event.type === 'error') {
              throw new WilliMakoError(
                event.message || 'Stream error',
                500,
                event
              );
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE event:', line, parseError);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalEvent) {
    throw new WilliMakoError('Stream ended without complete event', 500, null);
  }

  return finalEvent;
}

/**
 * High-level helper for streaming chat with automatic session management.
 *
 * @example
 * ```typescript
 * const response = await client.ask(
 *   'Erkläre GPKE im Detail',
 *   { companiesOfInterest: ['Enerchy'] },
 *   (status, progress) => console.log(`${status} (${progress}%)`)
 * );
 * console.log(response.content);
 * ```
 */
public async ask(
  question: string,
  contextSettings?: Record<string, unknown>,
  onProgress?: (status: string, progress: number) => void
): Promise<any> {
  const session = await this.createSession();
  const chatId = session.data.legacyChatId;

  if (!chatId) {
    throw new WilliMakoError('Session has no legacyChatId', 500, session);
  }

  const result = await this.chatStreaming(
    chatId,
    { content: question, contextSettings },
    (event) => {
      if ((event.type === 'status' || event.type === 'progress') && onProgress && event.message) {
        onProgress(event.message, event.progress || 0);
      }
    }
  );

  return result.data?.assistantMessage;
}
```

### Types (`src/types.ts`)

```typescript
/**
 * Stream event types from SSE endpoint
 */
export type StreamEventType = 'status' | 'progress' | 'complete' | 'error';

/**
 * Individual event received from the streaming endpoint
 */
export interface StreamEvent {
  /** Event type indicating the stage of processing */
  type: StreamEventType;
  /** Human-readable status message */
  message?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Final data payload (only in 'complete' events) */
  data?: {
    userMessage: {
      id: string;
      role: 'user';
      content: string;
      created_at: string;
    };
    assistantMessage: {
      id: string;
      role: 'assistant';
      content: string;
      metadata?: {
        processingTime?: number;
        modelUsed?: string;
        sourcesCount?: number;
        [key: string]: unknown;
      };
      created_at: string;
    };
  };
}
```

### CLI (`src/cli.ts`)

```typescript
chat
  .command('send')
  .description('Send a message to the conversational Willi-Mako endpoint')
  .requiredOption('-s, --session <sessionId>', 'Session identifier')
  .requiredOption('-m, --message <message>', 'Message content')
  .option('--stream', 'Use streaming endpoint (recommended for long operations)')
  .option('--context <json>', 'Context settings', parseJsonOptional)
  .option('--timeline <uuid>', 'Timeline identifier')
  .action(async (options) => {
    const client = await createClient({ requireToken: true });

    if (options.stream) {
      // Get legacyChatId from session
      const session = await client.getSession(options.session);
      const chatId = session.data.legacyChatId;

      if (!chatId) {
        console.error('❌ Session has no legacyChatId for streaming');
        process.exit(1);
      }

      console.log('📡 Using streaming endpoint...');

      const result = await client.chatStreaming(
        chatId,
        {
          content: options.message,
          contextSettings: options.context as Record<string, unknown> | undefined
        },
        (event) => {
          if (event.type === 'status' || event.type === 'progress') {
            console.log(`⏳ ${event.message} (${event.progress || 0}%)`);
          }
        }
      );

      console.log('✅ Complete!');
      outputJson(result);
    } else {
      // Legacy synchronous chat
      const payload: ChatRequest = {
        sessionId: options.session,
        message: options.message,
        contextSettings: options.context as Record<string, unknown> | undefined,
        timelineId: options.timeline ?? undefined
      };

      const response = await client.chat(payload);
      outputJson(response);
    }
  });
```

---

## 🔗 Referenzen

### Backend-Dokumentation
- Endpoint: `POST /api/chat/chats/{chatId}/messages/stream`
- Response: `Content-Type: text/event-stream`
- Events: `status`, `progress`, `complete`, `error`

### Verwandte Issues
- Original Backend-Hinweis: Blog-Content-Transformation Timeout (13:36:12 → 13:37:42)
- Cloudflare Timeout: ~100 Sekunden für synchrone Requests

### Zu prüfen
- [ ] Welche anderen Endpoints haben ähnliche Probleme?
- [ ] Gibt es Streaming für `generateReasoning()`?
- [ ] Wie verhält sich `semanticSearch()` bei großen Datenmengen?

---

## 🏁 Nächste Schritte

1. **Sofort:** Team-Meeting zur Priorisierung
2. **Diese Woche:** Phase 1 Implementation (Streaming SDK Core)
3. **Nächste Woche:** Phase 2 (CLI & Docs)
4. **Optional:** Phase 3 & 4 je nach User-Feedback

---

**Erstellt:** 2024-12-15
**Autor:** GitHub Copilot (Analyse des willi-mako-client Repositories)
**Status:** Ready for Review
