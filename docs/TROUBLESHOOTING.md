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
