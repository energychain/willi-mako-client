# Release Notes: Version 1.0.0 🎉

**Release Date:** December 15, 2025

## 🎊 First Stable Production Release!

We're excited to announce the first stable release of `willi-mako-client`! This marks the SDK as production-ready for energy market communication workflows in the German energy sector.

---

## 🌟 Headline Feature: Streaming Chat

### The Problem We Solved

Previously, complex AI operations would fail with **504 Gateway Timeout** after ~90 seconds due to Cloudflare's synchronous request limits. This affected:

- ❌ Complex reasoning tasks
- ❌ Blog content transformation
- ❌ Large EDIFACT analysis
- ❌ Multi-source research queries

### The Solution: Server-Sent Events (SSE)

We've implemented a complete streaming chat solution that:

✅ **Works for operations taking 3-6 minutes**
✅ **Provides real-time progress updates**
✅ **Delivers better user experience**
✅ **Avoids all timeout issues**

---

## 🚀 New Features

### 1. Streaming Methods

#### `chatStreaming(chatId, payload, onProgress?)`

Send messages via Server-Sent Events with real-time progress tracking:

```typescript
const session = await client.createSession();
const result = await client.chatStreaming(
  session.data.legacyChatId!,
  { content: 'Erkläre den GPKE-Prozess im Detail' },
  (event) => {
    console.log(`⏳ ${event.progress}% - ${event.message}`);
  }
);
```

#### `ask(question, contextSettings?, onProgress?)`

High-level helper with automatic session management:

```typescript
const response = await client.ask(
  'Was sind die Unterschiede zwischen UTILMD und MSCONS?',
  { companiesOfInterest: ['Enerchy'] },
  (status, progress) => console.log(`${progress}%: ${status}`)
);
```

### 2. CLI Streaming Support

```bash
# Add --stream flag for long operations
willi-mako chat send \
  --session $SESSION_ID \
  --message "Complex question requiring deep analysis" \
  --stream

# Output with visual progress:
# 📡 Using streaming endpoint...
# ⏳ [████░░░░░░░░░░░░░░░░] 20% - Durchsuche Wissensdatenbank...
# ⏳ [████████████░░░░░░░░] 60% - Generiere Antwort...
# ⏳ [████████████████████] 100% - Fertig!
# ✅ Complete!
```

### 3. New TypeScript Types

```typescript
// Stream event types
export type StreamEventType = 'status' | 'progress' | 'complete' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  message?: string;
  progress?: number;
  data?: {
    userMessage: { ... };
    assistantMessage: { ... };
  };
}

export interface StreamingChatRequest {
  content: string;
  contextSettings?: Record<string, unknown>;
}
```

---

## 📚 Documentation

### New Documentation

- **[`docs/STREAMING.md`](./docs/STREAMING.md)** – Complete guide to streaming chat with SSE
- **[`BACKEND_STREAMING_ANALYSIS.md`](./BACKEND_STREAMING_ANALYSIS.md)** – Technical analysis of backend streaming architecture

### Updated Documentation

- **[`docs/API.md`](./docs/API.md)** – New sections for streaming methods, warnings on sync `chat()`
- **[`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md)** – New section on 504 timeout issues
- **[`README.md`](./README.md)** – Streaming best practices and quick start

### New Examples

- **[`examples/streaming-chat.ts`](./examples/streaming-chat.ts)** – 4 comprehensive examples:
  1. Basic streaming with progress updates
  2. High-level `ask()` helper
  3. Synchronous vs streaming comparison
  4. Error handling patterns

---

## 🔄 Migration Guide

### From 0.9.x to 1.0.0

**Good News:** No breaking changes! Your existing code continues to work.

### Recommended Updates

Replace synchronous chat calls with streaming for long operations:

**Before:**
```typescript
const response = await client.chat({
  sessionId,
  message: 'Complex question...'
});
// ❌ May timeout after ~90 seconds
```

**After (Option 1 – Recommended):**
```typescript
const response = await client.ask(
  'Complex question...',
  undefined,
  (status, progress) => console.log(`${progress}%`)
);
// ✅ Works perfectly, even for 3-6 minute operations
```

**After (Option 2 – Manual Session Management):**
```typescript
const session = await client.createSession();
const result = await client.chatStreaming(
  session.data.legacyChatId!,
  { content: 'Complex question...' },
  (event) => console.log(event.message)
);
// ✅ Full control over session lifecycle
```

### CLI Migration

Simply add `--stream` flag to existing commands:

```bash
# Before (may timeout)
willi-mako chat send --session $ID --message "Long question"

# After (recommended)
willi-mako chat send --session $ID --message "Long question" --stream
```

---

## 📊 Performance Impact

### Timeout Scenarios (Before vs After)

| Scenario | Duration | v0.9.x | v1.0.0 |
|----------|----------|--------|--------|
| Simple question | 5-15s | ✅ Works | ✅ Works |
| Complex reasoning | 90-180s | ❌ Timeout | ✅ Works |
| Blog transformation | 120-300s | ❌ Timeout | ✅ Works |
| Large EDIFACT analysis | 60-120s | ⚠️ Sometimes fails | ✅ Works |

### User Experience Improvements

- **Before:** Wait 90 seconds → Timeout error → Retry → Frustration
- **After:** See progress → "60% - Generiere Antwort..." → Complete → Satisfaction

---

## 🎯 Use Cases Perfect for Streaming

1. **Complex Reasoning Tasks**
   - Multi-step analysis across GPKE, WiM, GeLi Gas processes
   - Duration: 90-180 seconds
   - **Now works reliably with streaming!**

2. **Blog Content Transformation**
   - AI-powered content analysis and transformation
   - Duration: 120-300 seconds
   - **Original problem case from backend team – now solved!**

3. **Large EDIFACT Analysis**
   - Detailed validation and compliance checks
   - Duration: 60-120 seconds
   - **Now always succeeds with streaming!**

4. **Multi-Source Research**
   - Comprehensive analysis across regulations and standards
   - Duration: 90-180 seconds
   - **No more timeouts!**

---

## 🔒 Stability & Production Readiness

### What Makes 1.0.0 Stable?

- ✅ **Comprehensive test coverage** for streaming functionality
- ✅ **Production-tested** backend streaming endpoint
- ✅ **Complete documentation** with use cases and migration guides
- ✅ **No breaking changes** planned for 1.x series
- ✅ **Backward compatible** with all 0.9.x code

### Versioning Commitment

Following Semantic Versioning:
- **1.x.y** – Bug fixes, new features (backward compatible)
- **2.0.0** – Only if breaking changes are unavoidable

---

## 🙏 Acknowledgments

Special thanks to:
- **Backend Team** for the detailed streaming architecture analysis
- **Early Adopters** who reported timeout issues
- **Community Contributors** for testing and feedback

---

## 🚀 Getting Started

### Installation

```bash
npm install willi-mako-client
```

### Quick Test

```bash
export WILLI_MAKO_TOKEN="your-token"

# Try the streaming example
npm run example:streaming

# Or use the CLI
SESSION_ID=$(willi-mako sessions create | jq -r '.data.sessionId')
willi-mako chat send \
  --session $SESSION_ID \
  --message "Erkläre den GPKE-Prozess im Detail" \
  --stream
```

---

## 📖 Resources

- **Documentation:** [`docs/`](./docs/)
- **Examples:** [`examples/`](./examples/)
- **Streaming Guide:** [`docs/STREAMING.md`](./docs/STREAMING.md)
- **API Reference:** [`docs/API.md`](./docs/API.md)
- **Troubleshooting:** [`docs/TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md)

---

## 💬 Support & Community

- **Issues:** [GitHub Issues](https://github.com/energychain/willi-mako-client/issues)
- **Community:** [COMMUNITY.md](./COMMUNITY.md)
- **Sponsorship:** [SPONSORSHIP.md](./docs/SPONSORSHIP.md)

---

## 🎉 Thank You!

Thank you for using willi-mako-client! We're excited to see what you build with the new streaming capabilities.

**Happy Coding!** 🚀

---

*For a complete list of changes, see [CHANGELOG.md](./CHANGELOG.md)*
