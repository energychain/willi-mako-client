# Release Notes: Version 1.0.1 📝

**Release Date:** December 15, 2025

## 🔧 Documentation & Transparency Update

This is a documentation-only release that provides transparency about a backend limitation discovered in API v1.0.1.

---

## ⚠️ Critical Information: Backend Heartbeat Issue

### What Changed

We've updated the SDK documentation to reflect a **backend limitation** in the streaming endpoint that was discovered after the v1.0.0 release.

**The Issue:**
The backend streaming endpoint (`/api/chat/chats/{chatId}/messages/stream`) currently does NOT send heartbeat events during AI processing (90+ seconds). This causes Cloudflare to terminate the SSE connection after ~100 seconds, resulting in 504 timeouts.

**Why This Happens:**
```javascript
// Backend code currently blocks without sending events:
sendSSE({ message: 'Generiere Antwort...', progress: 50 });
await advancedReasoningService.generateReasonedResponse(...); // ← 90+ seconds WITHOUT heartbeats!
```

SSE connections only prevent Cloudflare timeouts when the server sends data regularly (e.g., every 30 seconds).

---

## 🛠️ Workarounds (Until Backend Fix)

### 1. Use Direct API Access (Recommended)

Bypass Cloudflare by connecting directly to the API server:

```typescript
const client = new WilliMakoClient({
  baseUrl: 'https://api.stromhaltig.de/api/v2', // No Cloudflare proxy
  accessToken: 'your-token'
});
```

### 2. Use Synchronous Endpoint for Quick Queries

For operations under 90 seconds, the synchronous endpoint works fine:

```typescript
const response = await client.chat({
  sessionId: session.data.sessionId,
  message: 'Quick question about GPKE' // < 90 seconds
});
```

### 3. Wait for Backend Update

Monitor the API changelog at: https://stromhaltig.de/api/v2/openapi.json

---

## 📚 Documentation Updates

### Updated Files

1. **src/index.ts**
   - Added warning to `chatStreaming()` JSDoc
   - Added warning to `ask()` JSDoc
   - Explains backend issue and workarounds

2. **docs/STREAMING.md**
   - New "Known Issues" section
   - Detailed explanation of the problem
   - Comprehensive workaround instructions
   - Backend fix options documented

3. **CHANGELOG.md**
   - v1.0.1 entry with full context
   - Updated v1.0.0 entry with caveat

---

## 🔄 Backend Fix Required

The backend team needs to implement one of these solutions:

**Option A (Quick-Fix):**
Add a heartbeat timer that sends an SSE event every ~30 seconds:

```javascript
const heartbeatInterval = setInterval(() => {
  sendSSE({ type: 'heartbeat', message: 'Processing...', progress: 50 });
}, 30000);

try {
  const result = await advancedReasoningService.generateReasonedResponse(...);
  sendSSE({ type: 'complete', data: result });
} finally {
  clearInterval(heartbeatInterval);
}
```

**Option B (Proper Fix):**
Extend `advancedReasoningService` with progress callbacks:

```javascript
await advancedReasoningService.generateReasonedResponse({
  ...params,
  onProgress: (stage, percent) => {
    sendSSE({ type: 'progress', message: stage, progress: percent });
  }
});
```

---

## ✅ What's NOT Broken

**Important:** The client SDK is **correctly implemented**. All streaming code is production-ready and will work perfectly once the backend implements heartbeats.

- ✅ SSE connection handling
- ✅ Event parsing and callbacks
- ✅ Progress tracking
- ✅ Error handling
- ✅ CLI streaming support

**Status:** Waiting for backend deployment

---

## 📦 Installation

```bash
npm install willi-mako-client@1.0.1
# or
npm update willi-mako-client
```

---

## 🔗 Resources

- **OpenAPI v1.0.1:** https://stromhaltig.de/api/v2/openapi.json
- **Streaming Guide:** [docs/STREAMING.md](docs/STREAMING.md)
- **Full Changelog:** [CHANGELOG.md](CHANGELOG.md)
- **GitHub Repository:** https://github.com/energychain/willi-mako-client

---

## 🙏 Transparency Note

We believe in transparent communication about limitations. This release ensures all users are aware of the current backend constraint and have viable workarounds while the backend team works on a permanent fix.

The streaming feature remains valuable and production-ready – it just requires using direct API access (without Cloudflare) until heartbeats are implemented.

Thank you for your understanding and continued support!
