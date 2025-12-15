# Git Commit Template für v1.0.0 Release

Verwende diese Vorlage für den Commit:

```bash
git add .

git commit -m "feat: Add streaming chat support for v1.0.0 - First Stable Release

MAJOR FEATURES:
- Implement chatStreaming() method with Server-Sent Events (SSE)
- Add ask() high-level helper with automatic session management
- Add --stream flag to CLI with visual progress bar
- Full streaming documentation in docs/STREAMING.md

IMPROVEMENTS:
- Support operations up to 3-6 minutes without timeouts
- Real-time progress updates with status messages and percentages
- Better user experience for complex reasoning tasks
- Avoid 504 Gateway Timeout errors (Cloudflare ~100s limit)

DOCUMENTATION:
- New comprehensive docs/STREAMING.md guide
- Updated docs/API.md with warnings on sync chat()
- Enhanced docs/TROUBLESHOOTING.md with 504 timeout solutions
- Updated README.md with streaming best practices
- New examples/streaming-chat.ts with 4 use cases
- Complete CHANGELOG.md for v1.0.0
- Detailed RELEASE_1.0.0.md

BACKWARDS COMPATIBILITY:
- Zero breaking changes
- All existing code continues to work
- Synchronous chat() method still available
- Full backward compatibility with 0.9.x

TECHNICAL DETAILS:
- New TypeScript types: StreamEvent, StreamEventType, StreamingChatRequest
- SSE endpoint: POST /api/chat/chats/{chatId}/messages/stream
- Progress events: status, progress, complete, error
- Error handling for stream failures
- Automatic reader cleanup

PACKAGE UPDATES:
- Bump version: 0.9.3 → 1.0.0
- New keywords: streaming, sse, server-sent-events, real-time
- New npm script: example:streaming
- Updated description with streaming mention

USE CASES:
- Complex reasoning tasks (90-180s)
- Blog content transformation (120-300s)
- Large EDIFACT analysis (60-120s)
- Multi-source research queries (90-180s)

CLOSES: Backend streaming requirements
FIXES: #timeout-issues (504 Gateway Timeout)

Co-authored-by: GitHub Copilot <copilot@github.com>"

git tag -a v1.0.0 -m "Version 1.0.0 - First Stable Release

- Streaming chat support with SSE
- Real-time progress updates
- No more timeout issues
- Comprehensive documentation
- 100% backward compatible

See RELEASE_1.0.0.md for details"

# Review vor dem Push
git log -1 --stat
git diff HEAD~1

# Wenn alles OK:
git push origin main --tags
```

## Alternative: Conventional Commits Format

```bash
git commit -m "feat!: streaming chat support with SSE for v1.0.0" -m "
BREAKING CHANGE: None - fully backward compatible

Features:
* chatStreaming(chatId, payload, onProgress?): Send via SSE
* ask(question, contextSettings?, onProgress?): High-level helper
* CLI --stream flag with visual progress bar
* Real-time progress updates (status, progress, complete, error)

Improvements:
* Support operations up to 6 minutes (was: 90s)
* Avoid 504 Gateway Timeout errors
* Better UX with progress feedback

Documentation:
* docs/STREAMING.md - Complete SSE guide
* Updated docs/API.md with warnings
* Enhanced troubleshooting guide
* New streaming examples

See RELEASE_1.0.0.md for complete details
"
```

## NPM Publish Commands

```bash
# Ensure clean working directory
git status

# Build the package
npm run build

# Run tests (if available)
npm test

# Check package contents
npm pack --dry-run

# Login to npm (if needed)
npm login

# Publish to npm
npm publish

# Verify publication
npm info willi-mako-client
```

## GitHub Release

1. Go to: https://github.com/energychain/willi-mako-client/releases/new
2. Choose tag: v1.0.0
3. Title: "v1.0.0 - First Stable Release with Streaming Chat 🎉"
4. Description: Copy content from `RELEASE_1.0.0.md`
5. Check "Set as the latest release"
6. Publish release

## Announcement Template

### GitHub Discussions / Discord / Slack

```markdown
# 🎉 willi-mako-client v1.0.0 Released!

We're excited to announce the first stable production release!

## 🌟 Headline Feature: Streaming Chat

No more timeout issues! Complex operations now work for up to 6 minutes with real-time progress updates.

```typescript
const response = await client.ask(
  'Complex question...',
  undefined,
  (status, progress) => console.log(`${progress}%: ${status}`)
);
```

## ✨ What's New
- ✅ SSE streaming support
- ✅ Real-time progress updates
- ✅ CLI --stream flag
- ✅ Comprehensive documentation
- ✅ 100% backward compatible

📖 Read more: https://github.com/energychain/willi-mako-client/releases/tag/v1.0.0

🚀 Get started: `npm install willi-mako-client`
```

### Twitter / X

```
🎉 willi-mako-client v1.0.0 is here!

✨ Streaming chat with SSE
⚡ No more timeouts
📊 Real-time progress
🔄 100% backward compatible

Perfect for complex AI operations in German energy sector.

npm install willi-mako-client

https://github.com/energychain/willi-mako-client
```

### LinkedIn

```
Excited to announce willi-mako-client v1.0.0! 🎉

Our TypeScript SDK for energy market communication now features streaming chat support, eliminating timeout issues for complex AI operations.

Key improvements:
• Support for operations up to 6 minutes
• Real-time progress updates via Server-Sent Events
• Enhanced CLI with visual progress bars
• Comprehensive documentation
• Zero breaking changes

Perfect for German energy sector workflows involving EDIFACT, GPKE, and market communication processes.

Learn more: [GitHub Link]
```
