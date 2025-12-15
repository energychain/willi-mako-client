# Troubleshooting Guide

This guide lists common issues encountered when using the Willi-Mako Client SDK and the CLI, along with suggested remedies.

---

## Table of Contents

- [Installation Issues](#installation-issues)
- [Authentication Problems](#authentication-problems)
- [Network & API Errors](#network--api-errors)
- [Sandbox Job Failures](#sandbox-job-failures)
- [Artifact Upload Issues](#artifact-upload-issues)
- [CLI Pitfalls](#cli-pitfalls)
- [Debugging Tips](#debugging-tips)
- [Getting Help](#getting-help)

---

## Installation Issues

### `ERR_PNPM_NO_MATCHING_VERSION` or similar
- Ensure you are using a public npm registry (`npm config get registry`).
- The package is published as `willi-mako-client`; check scope and spelling.

### `node: this package requires Node.js >= 18`
- Upgrade Node.js to version 18 or higher. The SDK relies on native `fetch` and modern ESM support.

---

## Authentication Problems

### `401 Unauthorized`
- Confirm that `WILLI_MAKO_TOKEN` is set and valid.
- Tokens are tenant-specific; verify you are using the correct environment (productive vs. sandbox).
- Rotated credentials? Refresh the token from the Willi-Mako portal and call `client.setToken(newToken)`.
- Verwenden Sie `willi-mako auth login` nur aus vertrauenswürdigen Umgebungen und prüfen Sie, ob `--persist` gesetzt ist, wenn Folgeaufrufe unmittelbar das Token benötigen.

### Token Injection in CI/CD
- Store the token as a secret environment variable (e.g., GitHub Actions `secrets.WILLI_MAKO_TOKEN`).
- Do not hardcode tokens in source control.

---

## Network & API Errors

### `WilliMakoError: Request failed`
- Inspect `error.status` and `error.body` for details.
- 4xx errors often indicate validation problems; 5xx errors may mean temporary service issues.
- Use exponential backoff when retrying sandbox job polling.

### `fetch failed` or timeouts
- Check firewall/proxy settings; the SDK uses HTTPS connections to `https://stromhaltig.de`.
- For corporate networks, provide a custom `fetch` implementation that handles proxies.

### `504 Gateway Timeout` with `chat()` method

**Symptom:** Long-running chat operations fail after ~90-100 seconds with 504 error.

**Cause:** The synchronous `chat()` endpoint waits for complete AI processing. Cloudflare enforces a ~100-second timeout for synchronous HTTP requests.

**Solution:** Use the streaming endpoint instead:

#### Option 1: High-Level Helper (Recommended)
```typescript
const response = await client.ask(
  'Complex question requiring extensive processing...',
  undefined,
  (status, progress) => console.log(`${progress}%: ${status}`)
);
```

#### Option 2: Direct Streaming
```typescript
const session = await client.createSession();
const result = await client.chatStreaming(
  session.data.legacyChatId!,
  { content: 'Complex question...' },
  (event) => console.log(event.message)
);
```

#### CLI with Streaming
```bash
willi-mako chat send \
  --session $SESSION_ID \
  --message "Complex question" \
  --stream
```

**When this affects you:**
- Complex reasoning tasks (> 90 seconds)
- Blog content transformation (120-300 seconds)
- Large EDIFACT analysis (60-120 seconds)
- Multi-source research queries (90-180 seconds)

**See also:** [Streaming Guide](./STREAMING.md) for detailed documentation.

---

## Sandbox Job Failures

### Status remains `queued`
- Sandbox workers may be busy; poll with increasing delays (e.g., 1s, 2s, 4s).
- Verify the session ID exists and has execution rights.

### Status = `failed`
- Inspect `job.data.job.result?.stderr` and `job.data.job.result?.error` for stack traces.
- Ensure your code does not rely on unavailable Node.js modules (sandbox is restricted).
- Respect `timeoutMs` limits (500–60000 ms).

### `metadata` not persisted
- `metadata` must be JSON-serializable; avoid functions or circular references.

---

## Artifact Upload Issues

### `413 Payload Too Large`
- Compress artifacts or switch to `encoding: 'base64'` for binary data.
- Split large datasets into multiple artifacts.

### `409 Conflict`
- Artifact name collisions can occur if the API enforces unique names per session. Append timestamps or version tags.

### Content encoding problems
- Ensure `mimeType` matches actual content (e.g., `application/json`).
- When using `encoding: 'utf8'`, send plain text. For binary data, use `base64` and encode the content first.

---

## CLI Pitfalls

### `willi-mako: command not found`
- Install dependencies (`npm install`) and run `npm run build` before using the local CLI.
- Use `npx willi-mako-client --help` to run without installing globally.

### `A bearer token is required`
- Pass `--token <token>` or export the `WILLI_MAKO_TOKEN` environment variable.

### Reading from stdin hangs
- Ensure you send EOF (`Ctrl+D` on Linux/macOS) when piping data interactively.

### `Error [ERR_REQUIRE_ESM]` when starting via PM2
- Ab Version 0.3 setzt der CLI-Einstiegspunkt auf native ES Modules. Globale Loader wie PM2 versuchen jedoch standardmäßig, das Skript per `require()` zu laden und schlagen dadurch fehl.
- Installieren Sie mindestens Version 0.3.4 (oder neuer), die ein CommonJS-kompatibles Wrapper-Skript (`bin/willi-mako.cjs`) bereitstellt.
- Alternativ können Sie das Wrapper-Skript direkt angeben: `pm2 start --name willi-mako-mcp $(npm root -g)/willi-mako-client/bin/willi-mako.cjs -- mcp`.

---

## Debugging Tips

- Enable verbose logging around HTTP calls by wrapping `fetch` or using request interceptors in your application.
- Capture correlation IDs returned by the API to reference support tickets.
- Store artifacts for every critical step to create a reproducible audit trail.

---

## Getting Help

If the issue persists:

1. Check the [README](../README.md) and [API documentation](./API.md).
2. Search existing [GitHub issues](https://github.com/energychain/willi-mako-client/issues).
3. Create a new issue with reproduction steps.
4. Contact STROMDAO: [dev@stromdao.com](mailto:dev@stromdao.com).

Provide:
- SDK version (`npm ls willi-mako-client`)
- Node.js version (`node -v`)
- Error output or logs (sanitize sensitive data)
- Details about the affected edi@energy message or ETL workflow

We’re committed to helping Lieferanten, Netzbetreiber, und Messstellenbetreiber operate smoothly—don’t hesitate to reach out.
