# Polling Support (v1.0.2+)

## Overview

Starting with API v1.0.2, Willi-Mako supports **polling-based chat workflows** as an alternative to streaming. This approach is ideal for environments where:

- Server-Sent Events (SSE) are not supported or blocked
- Simpler error handling is preferred
- You want to avoid stream complexity

## Polling Endpoints

### 1. Get Chat Status

Retrieve the current processing status of a chat session:

```typescript
const status = await client.getChatStatus(chatId);
console.log(status.data.status); // 'idle' | 'processing' | 'completed' | 'error'
```

**Response:**
```typescript
{
  success: true,
  data: {
    chatId: string;
    status: 'idle' | 'processing' | 'completed' | 'error';
    estimatedProgress?: number;  // 0-100
    lastUserMessage?: { id, content, createdAt };
    lastAssistantMessage?: { id, content, createdAt, metadata };
    error?: string;  // Present only if status === 'error'
  }
}
```

### 2. Get Latest Response

Lightweight endpoint that returns only the latest assistant message:

```typescript
const response = await client.getLatestResponse(chatId);
if (response.data) {
  console.log(response.data.content);
}
```

**Response:**
```typescript
{
  success: boolean;
  data: {
    id: string;
    content: string;
    createdAt: string;
    metadata?: any;
  } | null;
  message?: string;  // "No response yet" if data is null
}
```

## High-Level Polling Method

The `chatWithPolling()` method provides a complete polling workflow with progress tracking:

```typescript
const response = await client.chatWithPolling(
  sessionId,
  'Erkläre mir GPKE §13',
  (status, progress) => {
    console.log(`${status} - ${progress}%`);
  },
  2000,   // Poll interval (ms) - default: 2000
  300000  // Max poll time (ms) - default: 300000 (5 min)
);

console.log(response.content);
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `sessionId` | string | Required | Active session ID |
| `message` | string | Required | User message to send |
| `onProgress` | function | undefined | Callback for progress updates: `(status: string, progress: number) => void` |
| `pollInterval` | number | 2000 | Milliseconds between status checks |
| `maxPollTime` | number | 300000 | Maximum polling duration before timeout |

### Behavior

1. **Send message** - Attempts to send message via standard chat endpoint
2. **Handle timeout** - If the initial request times out (504), polling begins automatically
3. **Poll status** - Checks `getChatStatus()` at regular intervals
4. **Progress callback** - Invokes `onProgress` with status updates
5. **Return response** - Returns complete assistant message when `status === 'completed'`
6. **Error handling** - Throws `WilliMakoError` on errors or polling timeout

## Example: Manual Polling Loop

For custom polling logic:

```typescript
// Send message (may timeout, that's OK)
try {
  await client.chat({ sessionId, message: 'Meine Frage' });
} catch (error) {
  if (error.status !== 504) throw error; // Only ignore timeout
}

// Get chatId from session
const session = await client.getSession(sessionId);
const chatId = session.data.legacyChatId;

// Poll until completed
let status: any;
do {
  await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
  status = await client.getChatStatus(chatId);
  console.log(`Status: ${status.data.status} (${status.data.estimatedProgress || 0}%)`);
} while (status.data.status === 'processing');

if (status.data.status === 'completed') {
  console.log(status.data.lastAssistantMessage.content);
} else {
  console.error('Error:', status.data.error);
}
```

## CLI Support

Use polling in CLI with the `--poll` flag:

```bash
# Send message with polling (no streaming)
willi-mako chat send SESSION_ID "Erkläre UTILMD" --poll

# Custom poll interval
willi-mako chat send SESSION_ID "Frage" --poll --poll-interval 3000

# Custom timeout
willi-mako chat send SESSION_ID "Frage" --poll --poll-timeout 600000
```

## Comparison: Streaming vs. Polling

| Aspect | Streaming (SSE) | Polling |
|--------|-----------------|---------|
| **Latency** | Low (real-time events) | Higher (poll interval) |
| **Complexity** | Moderate (SSE handling) | Low (simple HTTP GET) |
| **Backend Load** | Low (one connection) | Moderate (repeated requests) |
| **Progress Updates** | Token-level (granular) | Status-level (coarse) |
| **Error Handling** | Stream-based | Standard HTTP |
| **Best For** | Interactive UIs, dashboards | Background jobs, simple clients |
| **Backend Support** | ✅ Heartbeat fix (v1.0.2+) | ✅ Native (v1.0.2+) |

**Recommendation:** Use **streaming** for interactive applications where real-time feedback matters. Use **polling** for batch jobs, scripts, or environments where SSE is problematic.

## Error Handling

Both polling methods throw `WilliMakoError` on failures:

```typescript
try {
  const response = await client.chatWithPolling(sessionId, message);
} catch (error) {
  if (error instanceof WilliMakoError) {
    switch (error.status) {
      case 408:
        console.error('Polling timeout exceeded');
        break;
      case 500:
        console.error('Chat processing failed:', error.data.error);
        break;
      default:
        console.error('Error:', error.message);
    }
  }
}
```

## See Also

- [STREAMING.md](./STREAMING.md) - Streaming-based chat workflows
- [API.md](./API.md) - Complete API reference
- [examples/polling-chat.ts](../examples/polling-chat.ts) - Working examples
