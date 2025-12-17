# 🎉 Release v1.0.2 - Heartbeat Fix + Polling Support

**Release Date:** December 15, 2025
**API Version:** v1.0.2
**Status:** ✅ Production Ready

---

## 🚀 What's New

### ✅ Backend Heartbeat Fix - Streaming Works Reliably!

The streaming endpoint (`chatStreaming()`) now sends **heartbeat events every 30 seconds** during AI processing. This solves the Cloudflare timeout issue documented in v1.0.1.

**Before (v1.0.1):**
```
User sends message → AI processes for 90+ seconds → Cloudflare times out → 504 error
```

**After (v1.0.2):**
```
User sends message → AI sends heartbeats every 30s → Connection stays alive → Response delivered
```

### 🆕 Polling Support - Simple Alternative to Streaming

For environments where Server-Sent Events (SSE) are problematic, v1.0.2 introduces **polling-based workflows**:

#### New Methods

1. **`getChatStatus(chatId)`** - Check processing status
   ```typescript
   const status = await client.getChatStatus(chatId);
   console.log(status.data.status); // 'processing' | 'completed' | 'error'
   console.log(status.data.estimatedProgress); // 0-100
   ```

2. **`getLatestResponse(chatId)`** - Get only latest message (lightweight)
   ```typescript
   const response = await client.getLatestResponse(chatId);
   console.log(response.data?.content);
   ```

3. **`chatWithPolling(sessionId, message, ...)`** - Complete polling workflow
   ```typescript
   const response = await client.chatWithPolling(
     sessionId,
     'Erkläre GPKE',
     (status, progress) => console.log(`${status}: ${progress}%`)
   );
   console.log(response.content);
   ```

#### New TypeScript Types

```typescript
type ChatStatus = 'idle' | 'processing' | 'completed' | 'error';

interface ChatStatusResponse {
  success: boolean;
  data: {
    chatId: string;
    status: ChatStatus;
    estimatedProgress?: number;
    lastUserMessage?: Message;
    lastAssistantMessage?: Message;
    error?: string;
  };
}

interface LatestResponseData {
  success: boolean;
  data: Message | null;
  message?: string;
}
```

---

## 📚 Documentation Updates

- **New Guide:** [docs/POLLING.md](./docs/POLLING.md) - Complete polling reference
- **New Example:** [examples/polling-chat.ts](./examples/polling-chat.ts) - Working demos
- **Updated:** [docs/STREAMING.md](./docs/STREAMING.md) - Heartbeat issue marked as SOLVED
- **Updated:** Method documentation in `src/index.ts` - Removed warnings, added polling references

---

## 🔄 Migration Guide

### If You Were Using v1.0.1 Streaming

**No changes required!** Streaming now works reliably thanks to the backend heartbeat fix. You can remove any workarounds you implemented (like using `api.stromhaltig.de` directly).

```typescript
// ✅ This now works reliably (v1.0.2+)
const result = await client.chatStreaming(
  chatId,
  { content: 'Complex question requiring 2+ minutes' },
  (event) => console.log(event.message)
);
```

### If You Want to Switch to Polling

Replace `chatStreaming()` with `chatWithPolling()`:

**Before (Streaming):**
```typescript
const session = await client.createSession();
const result = await client.chatStreaming(
  session.data.legacyChatId!,
  { content: 'Question' },
  (event) => console.log(`${event.message} (${event.progress}%)`)
);
```

**After (Polling):**
```typescript
const session = await client.createSession();
const result = await client.chatWithPolling(
  session.data.sessionId,
  'Question',
  (status, progress) => console.log(`${status}: ${progress}%`)
);
```

---

## 🆚 Streaming vs. Polling - Which to Use?

| Aspect | Streaming (SSE) | Polling |
|--------|-----------------|---------|
| **Latency** | ⚡ Real-time | 🕐 Poll interval delay |
| **Backend Load** | ✅ Low (one connection) | ⚠️ Moderate (repeated requests) |
| **Complexity** | 🔧 Moderate (SSE handling) | ✅ Low (simple HTTP GET) |
| **Progress Granularity** | 🎯 Token-level | 📊 Status-level |
| **Production Ready** | ✅ Yes (v1.0.2+) | ✅ Yes (v1.0.2+) |

**Recommendation:**
- **Use Streaming** for interactive UIs, dashboards, and real-time applications
- **Use Polling** for background jobs, scripts, or environments where SSE is blocked/problematic

---

## 🐛 Fixed Issues

- ✅ **Streaming Timeout** - Backend heartbeat prevents Cloudflare connection termination
- ✅ **Documentation** - Removed outdated warnings from streaming methods

---

## 📦 Installation

Update to v1.0.2:

```bash
npm update willi-mako-client
```

Or install directly:

```bash
npm install willi-mako-client@1.0.2
```

---

## 🎯 Example: Polling in Action

```typescript
import { WilliMakoClient } from 'willi-mako-client';

const client = new WilliMakoClient({ token: process.env.WILLI_TOKEN });

// Create session
const session = await client.createSession();

// Send message with polling and progress tracking
const response = await client.chatWithPolling(
  session.data.sessionId,
  'Erkläre den vollständigen GPKE-Prozess für einen Lieferantenwechsel',
  (status, progress) => {
    // Progress callback (optional)
    const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    process.stdout.write(`\r${bar} ${progress}% - ${status}`);
  },
  2000,   // Poll every 2 seconds
  300000  // Timeout after 5 minutes
);

console.log('\n\nResponse:', response.content);

// Cleanup
await client.deleteSession(session.data.sessionId);
```

**Output:**
```
████████████████████ 100% - completed

Response: Der GPKE-Prozess (Geschäftsprozesse zur Kundenbelieferung mit Elektrizität)
regelt den Lieferantenwechsel in Deutschland...
```

---

## 🔗 Resources

- **Polling Guide:** [docs/POLLING.md](./docs/POLLING.md)
- **Streaming Guide:** [docs/STREAMING.md](./docs/STREAMING.md)
- **API Reference:** [docs/API.md](./docs/API.md)
- **Examples:** [examples/](./examples/)
- **OpenAPI Spec:** [schemas/openapi.json](./schemas/openapi.json) (v1.0.2)

---

## 💬 Feedback

Have questions or feedback? Open an issue on GitHub or contribute to the project!

**Backend API:** https://stromhaltig.de/api/v2/openapi.json
**Client SDK:** https://github.com/your-repo/willi-mako-client

---

## 🙏 Thanks

Special thanks to the backend team for implementing the heartbeat fix and polling endpoints!

---

**Happy Coding! 🚀**
