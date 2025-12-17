# Release 1.1.0 - OpenAI-Compatible Chat Completions

**Release Date:** December 17, 2025

## 🚀 New Features

### OpenAI-Compatible Chat Completions API

Die neue Version 1.1.0 des Backend-APIs bringt einen OpenAI-kompatiblen `/chat/completions` Endpoint, der eine nahtlose Integration mit bestehenden OpenAI-basierten Workflows ermöglicht.

**Highlights:**

- ✅ **Drop-in Replacement für OpenAI API** - Nur Base-URL und API-Key ändern
- ✅ **Automatische RAG-Enhancement** - Immer aktive QDrant-Suche über 5 Collections
- ✅ **Stateless Operation** - Keine Session erforderlich (aber optional unterstützt)
- ✅ **System Instructions Support** - via messages array (OpenAI-Format)
- ✅ **Collection Targeting** - Einschränkung auf spezifische Collections möglich
- ✅ **RAG Metadata Transparency** - Detaillierte Informationen über Retrieval-Prozess

### Client-Implementierung

**TypeScript/JavaScript SDK:**

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient({
  token: process.env.WILLI_MAKO_TOKEN
});

const response = await client.createChatCompletion({
  messages: [
    { role: 'system', content: 'Du bist ein Experte für Marktkommunikation.' },
    { role: 'user', content: 'Was ist der Unterschied zwischen UTILMD und MSCONS?' }
  ],
  temperature: 0.7,
  max_tokens: 2048
});

console.log(response.choices[0].message.content);
console.log(`RAG docs: ${response.x_rag_metadata.retrieved_documents}`);
```

**CLI:**

```bash
willi-mako chat completions \
  --message "Was ist der Unterschied zwischen UTILMD und MSCONS?" \
  --system "Du bist ein Experte für Marktkommunikation." \
  --temperature 0.7 \
  --max-tokens 2048
```

**MCP Server:**

Neues Tool `create-chat-completion` verfügbar für Model Context Protocol Integrationen.

### Python/OpenAI SDK Integration

```python
from openai import OpenAI

client = OpenAI(
    api_key="YOUR_WILLI_MAKO_TOKEN",
    base_url="https://stromhaltig.de/api/v2"
)

response = client.chat.completions.create(
    model="willi-mako-rag",
    messages=[
        {"role": "user", "content": "Was ist der Unterschied zwischen UTILMD und MSCONS?"}
    ]
)

print(response.choices[0].message.content)
print(f"RAG Docs: {response.x_rag_metadata['retrieved_documents']}")
```

## 📦 API Changes

### New Request Interface

```typescript
interface ChatCompletionRequest {
  messages: ChatCompletionMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  context_settings?: ChatCompletionContextSettings;
  session_id?: string;
}
```

### New Response Interface

```typescript
interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionUsage;
  x_rag_metadata: ChatCompletionRagMetadata;
  x_system_info: ChatCompletionSystemInfo;
}
```

## 🔧 Technical Details

### RAG-Prozess (immer aktiv)

```
Client Request (OpenAI Format)
        ↓
[/api/v2/chat/completions]
        ↓
1) Parse OpenAI-Format
   - Extract messages
   - Extract system instructions
   - Merge context_settings
        ↓
2) RAG Context Retrieval (IMMER AKTIV!)
   - Semantic search in QDrant
   - Collections: targetCollections oder DEFAULT: alle 5
        ↓
3) Context Merging
   - RAG-Results (primär)
   - User documents (wenn enabled)
   - System instructions
   - Conversation history
        ↓
4) LLM Generation
   - Enriched Context → LLM
   - Apply temperature, max_tokens
        ↓
5) Format Response (OpenAI-kompatibel)
   + x_rag_metadata Extension
        ↓
Client Response (OpenAI Format + Extensions)
```

## 📚 Documentation Updates

- Neue Beispiel-Datei: `examples/openai-compatible-chat.ts`
- CLI-Dokumentation erweitert: `willi-mako chat completions --help`
- MCP Server Instructions aktualisiert
- README mit OpenAI-Kompatibilitäts-Sektion

## 🔄 Migration Guide

### Von OpenAI zu Willi-Mako

**Vorher (OpenAI):**

```typescript
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

**Nachher (Willi-Mako):**

```typescript
const client = new OpenAI({
  apiKey: process.env.WILLI_MAKO_TOKEN,
  baseUrl: 'https://stromhaltig.de/api/v2'
});
```

**Das war's!** Der Rest des Codes bleibt identisch.

## 🎯 Use Cases

1. **OpenAI Migration** - Bestehende OpenAI-Integration ohne Code-Änderungen nutzen
2. **Externe Tools** - Jedes Tool, das OpenAI SDK nutzt, funktioniert automatisch
3. **Stateless Requests** - Kein Session-Management für einfache Anfragen
4. **Custom System Instructions** - Projekt-spezifische Anweisungen pro Request
5. **Collection Targeting** - Fokussierung auf relevante Wissensbereiche

## 🐛 Bug Fixes

- OpenAPI Schema auf Version 1.1.0 aktualisiert
- TypeScript Types für neue Endpoints hinzugefügt

## 🔗 Links

- Backend API Dokumentation: https://stromhaltig.de/api/v2/openapi.json
- Client Repository: https://github.com/energychain/willi-mako-client
- NPM Package: https://www.npmjs.com/package/willi-mako-client

## 🙏 Credits

Entwickelt für die deutsche Energiewirtschaft mit Fokus auf Marktkommunikation (GPKE, WiM, GeLi Gas), EDIFACT/edi@energy Standards, und Regulierung (EnWG, BNetzA).

---

**Next Steps:**
- Streaming Support für Chat Completions (Phase 2)
- Function Calling Support (zukünftig)
- Enhanced RAG Metrics und Explanability
