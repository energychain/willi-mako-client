# Streaming Chat – Server-Sent Events (SSE) Guide

> ⚠️ **IMPORTANT UPDATE (API v1.0.1):** The backend currently has a heartbeat issue during AI processing.
> See [Known Issues](#known-issues) below for workarounds.

This guide explains how to use the streaming chat endpoint to avoid timeout issues and get real-time progress updates during long-running AI operations.

---

## Table of Contents

- [Why Streaming?](#why-streaming)
- [Known Issues](#known-issues)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [`chatStreaming()`](#chatstreaming)
  - [`ask()` Helper](#ask-helper)
- [Event Types](#event-types)
- [Use Cases](#use-cases)
- [Migration Guide](#migration-guide)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Why Streaming?

### The Problem

The synchronous chat endpoint (`POST /api/v2/chat`) waits for complete AI processing before returning a response. This causes issues for long-running operations:

```
POST /api/v2/chat
  └─> AI Processing (Reasoning, RAG, LLM)
      └─> Response (or 504 after ~90-100 seconds)
```

**Cloudflare enforces a ~100-second timeout** for synchronous requests, causing **504 Gateway Timeout** errors for:
- Complex reasoning tasks (> 90s)
- Blog content transformation (120-300s)
- Large EDIFACT analysis (60-120s)
- Multi-source research queries (90-180s)

### The Solution

The streaming endpoint (`POST /api/chat/chats/{chatId}/messages/stream`) uses **Server-Sent Events (SSE)** to provide real-time progress updates:

✅ No Cloudflare timeouts (**when heartbeats are active**)
✅ Real-time progress updates
✅ Better user experience
✅ Handles operations of any duration

---

## Known Issues

### Backend Heartbeat Problem (as of API v1.0.1)

**Current Limitation:**
The backend streaming endpoint does NOT send heartbeat events during AI processing (90+ seconds). This causes Cloudflare to kill the SSE connection after ~100 seconds, resulting in the same 504 timeout as the synchronous endpoint.

**Why SSE alone doesn't help:**
SSE only prevents Cloudflare timeouts when the server sends data regularly (e.g., every 30 seconds). Currently, the backend code blocks like this:

```javascript
sendSSE({ message: 'Generiere Antwort...', progress: 50 });
await advancedReasoningService.generateReasonedResponse(...); // ← 90+ seconds WITHOUT events!
```

**Backend Fix in Progress:**
- **Option A (Quick-Fix):** Heartbeat timer that sends an event every 30 seconds
- **Option B (Proper Fix):** Extend `advancedReasoningService` with progress callbacks

**Workarounds (until backend fix is deployed):**

1. **Use Direct API Access** (Recommended):
   ```typescript
   const client = new WilliMakoClient({
     baseUrl: 'https://api.stromhaltig.de/api/v2', // No Cloudflare proxy
     accessToken: 'your-token'
   });
   ```

2. **Use Synchronous Endpoint for Quick Queries** (< 90s):
   ```typescript
   const response = await client.chat({
     sessionId: session.data.sessionId,
     message: 'Quick question about GPKE'
   });
   ```

3. **Wait for Backend Update:**
   Monitor the API changelog at https://stromhaltig.de/api/v2/openapi.json

**Status:** ⚠️ Backend fix required – Client SDK is correctly implemented

---

## Quick Start

### Option 1: High-Level `ask()` Helper (Recommended)

```typescript
import { WilliMakoClient } from '@stromhaltig/willi-mako-client';

const client = new WilliMakoClient({
  token: process.env.WILLI_MAKO_TOKEN
});

// Automatic session management + streaming
const response = await client.ask(
  'Erkläre den GPKE-Prozess im Detail',
  { companiesOfInterest: ['Enerchy'] },
  (status, progress) => {
    console.log(`${status} (${progress}%)`);
  }
);

console.log(response.content);
```

### Option 2: Direct `chatStreaming()` Method

```typescript
// Create session first
const session = await client.createSession();
const chatId = session.data.legacyChatId!;

// Send message with progress updates
const result = await client.chatStreaming(
  chatId,
  {
    content: 'Analyse GPKE-Prozess',
    contextSettings: { preferredTopics: ['GPKE'] }
  },
  (event) => {
    if (event.type === 'progress') {
      console.log(`⏳ ${event.progress}% - ${event.message}`);
    }
  }
);

console.log(result.data.assistantMessage.content);
```

### CLI Usage

```bash
# Create session
SESSION_ID=$(willi-mako sessions create | jq -r '.data.sessionId')

# Use streaming endpoint
willi-mako chat send \
  --session $SESSION_ID \
  --message "Erkläre GPKE im Detail" \
  --stream

# Output:
# 📡 Using streaming endpoint...
# ⏳ [████░░░░░░░░░░░░░░░░] 20% - Durchsuche Wissensdatenbank...
# ⏳ [████████████░░░░░░░░] 60% - Generiere Antwort...
# ⏳ [████████████████████] 100% - Fertig!
# ✅ Complete!
```

---

## API Reference

### `chatStreaming()`

Sends a message via Server-Sent Events (SSE) streaming.

```typescript
public async chatStreaming(
  chatId: string,
  payload: StreamingChatRequest,
  onProgress?: (event: StreamEvent) => void
): Promise<StreamEvent>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `chatId` | `string` | ✅ | Legacy chat ID from session creation |
| `payload.content` | `string` | ✅ | Message to send |
| `payload.contextSettings` | `Record<string, unknown>` | ❌ | Context override |
| `onProgress` | `(event: StreamEvent) => void` | ❌ | Progress callback |

**Returns:** `Promise<StreamEvent>` with `type: 'complete'`

**Example:**
```typescript
const session = await client.createSession();
const result = await client.chatStreaming(
  session.data.legacyChatId!,
  { content: 'Question here' },
  (event) => {
    console.log(`${event.type}: ${event.message}`);
  }
);
```

---

### `ask()` Helper

High-level convenience method with automatic session management.

```typescript
public async ask(
  question: string,
  contextSettings?: Record<string, unknown>,
  onProgress?: (status: string, progress: number) => void
): Promise<unknown>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | `string` | ✅ | Question or message |
| `contextSettings` | `Record<string, unknown>` | ❌ | Context settings |
| `onProgress` | `(status: string, progress: number) => void` | ❌ | Simple progress callback |

**Returns:** Assistant message object with `content` and `metadata`

**Example with Progress Bar:**
```typescript
const response = await client.ask(
  'Erkläre GPKE',
  undefined,
  (status, progress) => {
    const bars = Math.round(progress / 5);
    const progressBar = '█'.repeat(bars) + '░'.repeat(20 - bars);
    console.log(`[${progressBar}] ${progress}% - ${status}`);
  }
);
```

---

## Event Types

The streaming endpoint sends different event types via SSE:

### 1. `status` – General Status Update

```json
{
  "type": "status",
  "message": "Durchsuche Wissensdatenbank...",
  "progress": 30
}
```

**Typical messages:**
- "Starte Anfrage..."
- "Speichere Nachricht..."
- "Lade Kontext..."
- "Durchsuche Wissensdatenbank..."
- "Generiere Antwort..."

### 2. `progress` – Progress Update

```json
{
  "type": "progress",
  "message": "Analysiere Quellen...",
  "progress": 50
}
```

### 3. `complete` – Processing Finished

```json
{
  "type": "complete",
  "message": "Fertig!",
  "progress": 100,
  "data": {
    "userMessage": {
      "id": "msg-user-1",
      "role": "user",
      "content": "Erkläre GPKE",
      "created_at": "2025-12-15T14:00:00.000Z"
    },
    "assistantMessage": {
      "id": "msg-assistant-1",
      "role": "assistant",
      "content": "Der GPKE-Prozess...",
      "metadata": {
        "processingTime": 145230,
        "modelUsed": "gpt-4",
        "sourcesCount": 12
      },
      "created_at": "2025-12-15T14:02:25.230Z"
    }
  }
}
```

### 4. `error` – Error Occurred

```json
{
  "type": "error",
  "message": "Chat nicht gefunden"
}
```

---

## Use Cases

### 1. Complex Reasoning Tasks

```typescript
const response = await client.ask(
  'Analysiere die rechtlichen Grundlagen des Lieferantenwechselprozesses nach GPKE und erkläre die Rolle der verschiedenen Marktteilnehmer.',
  { preferredTopics: ['GPKE', 'Lieferantenwechsel'] },
  (status, progress) => console.log(`${progress}%: ${status}`)
);
```

**Duration:** 90-180 seconds
**Without streaming:** 504 Timeout ❌
**With streaming:** Works perfectly ✅

---

### 2. Blog Content Transformation

```typescript
async function transformBlogContent(content: string) {
  const client = new WilliMakoClient({ token: process.env.WILLI_MAKO_TOKEN });

  const response = await client.ask(
    `Du bist ein Enerchy Content-Analyst. Transformiere folgenden Blog-Content: ${content}`,
    { companiesOfInterest: ['Enerchy'] },
    (status, progress) => {
      console.log(`Transformation: ${progress}%`);
    }
  );

  return response.content;
}
```

**Duration:** 120-300 seconds
**Without streaming:** 504 Timeout after ~90s ❌
**With streaming:** Works perfectly ✅

---

### 3. Large EDIFACT Analysis

```typescript
const session = await client.createSession();
const result = await client.chatStreaming(
  session.data.legacyChatId!,
  {
    content: 'Analysiere diese UTILMD-Nachricht im Detail und prüfe auf Compliance-Verstöße',
    contextSettings: { preferredTopics: ['EDIFACT', 'UTILMD'] }
  },
  (event) => {
    if (event.type === 'progress') {
      console.log(`Analyse: ${event.progress}%`);
    }
  }
);
```

**Duration:** 60-120 seconds
**Without streaming:** Frequent timeouts ❌
**With streaming:** Works reliably ✅

---

## Migration Guide

### Before (Synchronous – Timeout Issues)

```typescript
// ❌ Problematic for long operations
const session = await client.createSession();
const response = await client.chat({
  sessionId: session.data.sessionId,
  message: 'Complex question requiring extensive processing...'
});
// → 504 Gateway Timeout after ~90 seconds
```

### After (Streaming – Works Always)

**Option A: High-Level Helper**
```typescript
// ✅ Automatic session + streaming
const response = await client.ask(
  'Complex question requiring extensive processing...',
  undefined,
  (status, progress) => console.log(`${progress}%: ${status}`)
);
```

**Option B: Direct Streaming**
```typescript
// ✅ Manual session + streaming
const session = await client.createSession();
const result = await client.chatStreaming(
  session.data.legacyChatId!,
  { content: 'Complex question...' },
  (event) => console.log(event.message)
);
```

---

## Best Practices

### 1. When to Use Streaming

**Use streaming for:**
- ✅ Questions expected to take > 30 seconds
- ✅ Complex reasoning tasks
- ✅ Multi-source research
- ✅ Blog content transformation
- ✅ Large EDIFACT analysis
- ✅ Production applications

**Synchronous is OK for:**
- ✅ Simple questions (< 30s expected)
- ✅ Quick lookups
- ✅ Development/testing with simple queries

### 2. Progress Callbacks

**Minimal Progress Logging:**
```typescript
const response = await client.ask(
  'Question',
  undefined,
  (status, progress) => console.log(`${progress}%`)
);
```

**Detailed Progress with Visual Feedback:**
```typescript
const response = await client.ask(
  'Question',
  undefined,
  (status, progress) => {
    const bars = Math.round(progress / 5);
    const progressBar = '█'.repeat(bars) + '░'.repeat(20 - bars);
    console.log(`[${progressBar}] ${progress}% - ${status}`);
  }
);
```

**No Progress Callback (Silent):**
```typescript
const response = await client.ask('Question');
// Works fine, just no progress updates
```

### 3. Error Handling

```typescript
try {
  const response = await client.chatStreaming(chatId, { content: 'Question' });
  console.log(response.data.assistantMessage.content);
} catch (error) {
  if (error instanceof WilliMakoError) {
    console.error(`Error ${error.status}:`, error.message);
    console.error('Body:', error.body);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### 4. Session Management

**Short-lived (one question):**
```typescript
// Use ask() helper - session is created and cleaned automatically
const response = await client.ask('Question');
```

**Long-lived (multiple questions):**
```typescript
// Create session once, reuse chatId
const session = await client.createSession();
const chatId = session.data.legacyChatId!;

const result1 = await client.chatStreaming(chatId, { content: 'Question 1' });
const result2 = await client.chatStreaming(chatId, { content: 'Question 2' });

// Clean up when done
await client.deleteSession(session.data.sessionId);
```

---

## Troubleshooting

### "Response body is null"

**Cause:** Browser/environment doesn't support streaming
**Solution:** Upgrade to Node.js >= 18 or use a modern browser

```typescript
// Check if streaming is supported
if (typeof ReadableStream === 'undefined') {
  console.error('Streaming not supported in this environment');
}
```

### "Session has no legacyChatId"

**Cause:** Session was created with an older API version
**Solution:** Create a new session

```typescript
const session = await client.createSession();
if (!session.data.legacyChatId) {
  console.error('Please create a new session');
}
```

### Events Not Coming Through

**Check Response Headers:**
```typescript
const response = await fetch(url, options);
console.log(response.headers.get('Content-Type'));
// Should be: "text/event-stream"
```

**Check Response Status:**
```typescript
console.log(response.status); // Should be 200
```

### Stream Ends Without Complete Event

**Cause:** Network interruption or backend error
**Solution:** Retry with exponential backoff

```typescript
async function retryStreaming(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.chatStreaming(...);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

---

## See Also

- [API Reference](./API.md) – Full SDK documentation
- [Examples](./EXAMPLES.md) – More code examples
- [Troubleshooting](./TROUBLESHOOTING.md) – Common issues

---

**Version:** 1.0.0
**Last Updated:** December 15, 2025
