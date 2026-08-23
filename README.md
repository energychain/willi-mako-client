# willi-mako-client

Ground-up TypeScript client for the current [Willi Mako](https://willi.cernion.de) application API.

This version intentionally replaces the former legacy client. The API behind `willi.cernion.de` is fundamentally different: authentication uses a session issued by magic-link verification and transported as the `wm_sid` cookie, not the former legacy API workflow.

## Ecosystem role

Willi Mako is the market-communication and energy-domain assistant surface in the broader STROMDAO/Cernion ecosystem. The hosted application at `willi.cernion.de` gives humans a case-file based expert workflow for German energy market communication, while this package provides the developer-facing access layer for automation and integration.

In that landscape:

- **Willi Mako** is the human-facing fachlicher assistant for MaKo/EDIFACT questions, case files, reviews, Markdown case-file exports, mandant/team administration, and AVV onboarding.
- **willi-mako-client** is the public TypeScript SDK and CLI for using the current Willi Mako application API from terminals, scripts, RAG pipelines, automation agents, and Node.js applications.
- **Cernion Energy Tools** is the wider microservice and API ecosystem for energy-market, regulatory and operational workflows. It can consume Willi-Mako-derived knowledge through explicit integrations, but this client intentionally stays focused on the Willi Mako app API instead of becoming a general Cernion SDK.
- **STROMDAO GmbH** maintains the package and the surrounding open-source/product ecosystem. The package keeps the existing `energychain/willi-mako-client` identity while making the major-version break explicit.

The intended architecture is small and composable: use this client for Willi Mako case-file workflows; use Cernion Energy Tools for broader Cernion service orchestration; connect the two through explicit, typed integration points rather than hidden legacy API assumptions. Public examples use synthetic or generic market-communication questions; real operator, customer, mandant, or production case data should stay in private systems.

## Install

```bash
npm install willi-mako-client
```

## Basic usage

```ts
import { MemoryCookieStore, WilliMakoClient } from 'willi-mako-client';

const cookies = new MemoryCookieStore();
const client = new WilliMakoClient({ cookieStore: cookies });

await client.requestMagicLink({ email: 'you@example.com' });
await client.verifyMagicLink({ token: '<token-from-email-link>' });

const me = await client.currentUser();
const sessions = await client.listSessions();
```

## CLI usage

Build the local checkout first when running from the repository:

```bash
npm run build
node bin/willi-mako.cjs request-link you@example.com
node bin/willi-mako.cjs login 'https://willi.cernion.de/auth/verify?token=...'
node bin/willi-mako.cjs me
```

The login command accepts either the full magic-link URL or the raw token. It stores the authenticated `wm_sid` session value in `~/.config/willi-mako/session.json` on Linux/macOS, or `%APPDATA%/willi-mako/session.json` on Windows. Override the session with `WILLI_MAKO_SESSION_ID` or the file location with `WILLI_MAKO_SESSION_FILE`. Subsequent CLI/API calls send this value only as the `wm_sid` cookie and only to the configured Willi Mako origin.

### Case-file chat from the CLI

Create a new case file and print the assistant answer directly:

```bash
node bin/willi-mako.cjs start "Was wird mit einer ORDERS angefordert?"
```

Continue in the last case file:

```bash
node bin/willi-mako.cjs chat "Und wie grenzt sich das von UTILMD ab?"
# quoting is optional when a current case file is saved:
node bin/willi-mako.cjs chat Und wie grenzt sich das von UTILMD ab?
```

Continue in a specific case file:

```bash
node bin/willi-mako.cjs chat '<sessionId>' "Bitte fasse die Fallakte zusammen."
node bin/willi-mako.cjs chat --session-id '<sessionId>' Bitte fasse die Fallakte zusammen.
```

Open a human-oriented interactive shell. Commands are submitted with Enter; type `/help` or `/` and press Enter to show the available actions.

```bash
node bin/willi-mako.cjs interactive
```

Inside interactive mode:

```text
willi> /
Aktionen:
  / oder /help        Diese Hilfe anzeigen
  /session            Aktuelle Fallakte anzeigen
  /cases              Fallakten auflisten
  /use <nr|id>        Zu einer Fallakte aus /cases oder per ID wechseln
  /new <text>         Neue Fallakte starten
  /show               Aktuelle Fallakte als JSON anzeigen
  /save [path]        Markdown-Karte der aktuellen Fallakte speichern
  /card               Markdown-Karte der aktuellen Fallakte anzeigen
  /review             Review-Markdown der aktuellen Fallakte anzeigen
  /exit oder /quit    Interaktiven Chat beenden

Aktuelle Fallakte: noch keine Fallakte gewählt
willi> /cases
willi> /use 2
willi> Was war hier der letzte Stand?
willi> /new Was wird mit einer PRICAT übertragen?
willi> /session
willi> /exit
```

By default, `start`, `chat`, `turn`, and `interactive` print the assistant text/Markdown for humans. In an interactive terminal the CLI renders common Markdown affordances: `**bold**` becomes ANSI bold, inline code is highlighted, and Markdown pipe tables are converted to aligned box-drawing tables. Case and turn IDs are written to stderr. Use `NO_COLOR=1` to disable ANSI styling, `--json` when scripting against the raw API envelope, or `--no-wait` when you only want the immediate `{ sessionId, turnId }` response.

Example interactive output:

```text
willi> Was wird mit einer MSCONS übertragen?
Die MSCONS überträgt Messwerte, Zählerstände und Energiemengen.

┌──────────────┬────────────────────────────┐
│ Kategorie    │ Inhalt                     │
├──────────────┼────────────────────────────┤
│ Zählerstand  │ Ablese- und Ersatzwerte    │
│ Lastgang     │ 15- oder 60-Minuten-Werte  │
└──────────────┴────────────────────────────┘
```

Useful commands:

```bash
node bin/willi-mako.cjs sessions
node bin/willi-mako.cjs session '<sessionId>'
node bin/willi-mako.cjs turn '<turnId>'
node bin/willi-mako.cjs turn '<turnId>' --json
node bin/willi-mako.cjs tool 'Was wird mit einer MSCONS übertragen?'
node bin/willi-mako.cjs tool 'Bitte im bestehenden Fall weiterarbeiten' --session-id '<sessionId>'
node bin/willi-mako.cjs save '<sessionId>' './fallakte.md'
node bin/willi-mako.cjs card '<sessionId>'
node bin/willi-mako.cjs review '<sessionId>'
node bin/willi-mako.cjs logout
```

After package installation or `npm link`, the `willi-mako` binary can be used directly instead of `node bin/willi-mako.cjs`.

### CLI as a RAG tool

For RAG orchestrators or other automation, prefer the `tool` command. It always writes one JSON object to stdout with `sessionId`, `turnId`, `answer`, and the raw `response`/`turn` envelopes:

```bash
node bin/willi-mako.cjs tool 'Was wird mit einer MSCONS übertragen?'
node bin/willi-mako.cjs tool 'Bitte prüfe den nächsten Punkt' --session-id '<sessionId>'
```

This command reuses the saved login session, so wrappers normally only need to manage the question text and optionally a case-file session id.

### Node.js application usage

Use `sessionId` for non-browser applications when you have already stored the `wm_sid` value from magic-link verification. The client sends it back as the `wm_sid` cookie and suppresses credentials for absolute cross-origin URLs. The high-level methods expose concrete TypeScript response interfaces, so Node.js callers can access `sessionId`, `turnId`, `sessions`, `members`, usage counters, and AVV metadata without casting from a generic envelope:

```ts
import {
  WilliMakoClient,
  type CoachStartResponse,
  type CoachTurnResponse,
  type MandantMembersResponse,
  type MandantUsageResponse,
  type SessionListResponse
} from 'willi-mako-client';

const client = new WilliMakoClient({
  sessionId: process.env.WILLI_MAKO_SESSION_ID
});

const started: CoachStartResponse = await client.startCoach({ text: 'Was wird mit einer ORDERS angefordert?' });
const { sessionId, turnId } = started;

const sessions: SessionListResponse = await client.listSessions();
console.log(`Fallakten: ${sessions.sessions.length}`);

const members: MandantMembersResponse = await client.listMandantMembers();
console.log(`Mandantenmitglieder: ${members.members.map((member) => member.email).join(', ')}`);

const usage: MandantUsageResponse = await client.getMandantUsage();
console.log(`Coach-Turns gesamt: ${usage.totalTurns}`);

let turn: CoachTurnResponse;
do {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  turn = await client.getCoachTurn(turnId);
  const status = turn.status ?? '';
  if (['done', 'completed', 'failed', 'error'].includes(status)) {
    break;
  }
} while (!turn.result?.assistant);

console.log(turn.result?.assistant);

await client.sendCoachMessage({
  sessionId,
  text: 'Bitte in derselben Fallakte weiterarbeiten.'
});
```

## Endpoint coverage

The client maps the current OpenAPI endpoint groups:

- auth: request link, token peek, verify, current user, logout
- mandant/team: invite, switch, members, usage, AVV record
- AVV onboarding
- coaching: start, message, get turn
- sessions/case files: list, get, markdown exports, close, live-coaching toggle
- review session
- raw OpenAPI fetch

## OpenAPI files

- Sanitized fetched app schema: `schemas/willi-cernion-openapi.json`
- Normalized tooling schema: `schemas/openapi.json`

The fetch/normalization scripts keep the public app schema on the cookie-auth contract and remove bearer-auth/session-token generator hints that belong outside this public client surface. The normalization script also fixes nested `$defs` references that appear in the current OpenAPI and are not accepted by common code generators.

```bash
npm run fetch:openapi
npm run normalize:openapi
```

## Verification

```bash
npm run build
npm run typecheck
npm test
```

## Migration note

This is not a rework of the old client. Legacy scripts, demos and old API assumptions were removed so the package can represent the current `willi.cernion.de` application API cleanly.
