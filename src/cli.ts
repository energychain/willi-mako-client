#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { WilliMakoClient, MemoryCookieStore, DEFAULT_BASE_URL } from './index.js';

interface StoredSession {
  baseUrl: string;
  sessionId: string;
  email?: string;
  mandantId?: string;
  mandantName?: string;
  createdAt: string;
  updatedAt: string;
  currentCaseId?: string;
}

function usage(): never {
  console.error(`Usage:
  willi-mako request-link <email>
  willi-mako token-peek <token-or-verify-url>
  willi-mako login <token-or-verify-url>
  willi-mako me
  willi-mako logout
  willi-mako session-token [--show-secret]
  willi-mako start <text> [--case-id <caseId>] [--no-wait|--json]
  willi-mako chat <message> [--session-id <sessionId>] [--no-wait|--json]
  willi-mako chat <sessionId> <message> [--no-wait|--json]
  willi-mako tool <question> [--session-id <sessionId>] [--wait-ms <ms>]
  willi-mako save [sessionId] [path]
  willi-mako interactive [sessionId]
  willi-mako sessions
  willi-mako session <sessionId>
  willi-mako card <sessionId>
  willi-mako review <sessionId>

Environment:
  WILLI_MAKO_BASE_URL defaults to ${DEFAULT_BASE_URL}
  WILLI_MAKO_SESSION_ID overrides the saved CLI session
  WILLI_MAKO_SESSION_FILE overrides the saved session path`);
  process.exit(2);
}

function sessionFilePath(): string {
  if (process.env.WILLI_MAKO_SESSION_FILE) {
    return process.env.WILLI_MAKO_SESSION_FILE;
  }
  if (process.platform === 'win32' && process.env.APPDATA) {
    return join(process.env.APPDATA, 'willi-mako', 'session.json');
  }
  const configHome = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(configHome, 'willi-mako', 'session.json');
}

function readStoredSession(): StoredSession | undefined {
  const file = sessionFilePath();
  if (!existsSync(file)) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Partial<StoredSession>;
    if (typeof parsed.sessionId === 'string' && parsed.sessionId.length > 0) {
      return parsed as StoredSession;
    }
  } catch {
    // Ignore unreadable/corrupt session files and fall back to unauthenticated mode.
  }
  return undefined;
}

function writeStoredSession(session: StoredSession): void {
  const file = sessionFilePath();
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, `${JSON.stringify(session, null, 2)}\n`, { mode: 0o600 });
}

function deleteStoredSession(): void {
  const file = sessionFilePath();
  if (existsSync(file)) {
    rmSync(file);
  }
}

function updateStoredCurrentCase(caseId: string | undefined): void {
  if (!caseId) {
    return;
  }
  const now = new Date().toISOString();
  const session: StoredSession = storedSession ?? {
    baseUrl: (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
    sessionId: sessionId ?? '',
    createdAt: now,
    updatedAt: now
  };
  if (!session.sessionId) {
    return;
  }
  writeStoredSession({ ...session, currentCaseId: caseId, updatedAt: now });
}

function extractToken(input: string): string {
  try {
    const url = new URL(input);
    return url.searchParams.get('token') || input;
  } catch {
    return input;
  }
}

function findString(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === 'string' && record[key].length > 0) {
      return record[key];
    }
  }
  if (record.data && typeof record.data === 'object') {
    return findString(record.data, keys);
  }
  return undefined;
}

function findAnswer(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const direct = findString(record, [
    'answer',
    'assistant',
    'assistantAnswer',
    'assistantMessage',
    'reply',
    'response',
    'resultText',
    'markdown'
  ]);
  if (direct) {
    return direct;
  }
  for (const key of ['result', 'data', 'turn', 'message', 'content']) {
    const nested = record[key];
    if (nested && typeof nested === 'object') {
      const found = findAnswer(nested);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function findStatus(value: unknown): string | undefined {
  return findString(value, ['status', 'state']);
}

function removeFlag(args: string[], flag: string): boolean {
  const index = args.indexOf(flag);
  if (index < 0) {
    return false;
  }
  args.splice(index, 1);
  return true;
}

function readRequiredFlagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) {
    return undefined;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  args.splice(index, 2);
  return value;
}

function readNumberFlag(args: string[], flag: string, fallback: number): number {
  const index = args.indexOf(flag);
  if (index < 0) {
    return fallback;
  }
  const raw = args[index + 1];
  args.splice(index, 2);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function turnIdFrom(value: unknown): string | undefined {
  return findString(value, ['turnId', 'id']);
}

async function waitForTurn(turnId: string, timeoutMs: number): Promise<unknown> {
  const startedAt = Date.now();
  let last: unknown;
  while (Date.now() - startedAt <= timeoutMs) {
    last = await client.getCoachTurn(turnId);
    const answer = findAnswer(last);
    const status = findStatus(last)?.toLowerCase();
    if (answer || ['completed', 'complete', 'done', 'failed', 'error'].includes(status ?? '')) {
      return last;
    }
    await sleep(1500);
  }
  return last;
}

function shouldUseAnsi(): boolean {
  return process.stdout.isTTY && !process.env.NO_COLOR;
}

function visibleLength(value: string): number {
  return value.replace(/\u001b\[[0-9;]*m/g, '').length;
}

function padRight(value: string, width: number): string {
  return value + ' '.repeat(Math.max(0, width - visibleLength(value)));
}

function splitMarkdownTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function renderInlineMarkdown(value: string, ansi: boolean): string {
  const bold = ansi ? '\u001b[1m$1\u001b[22m' : '$1';
  return value
    .replace(/`([^`]+)`/g, ansi ? '\u001b[36m$1\u001b[39m' : '$1')
    .replace(/\*\*([^*]+)\*\*/g, bold)
    .replace(/__([^_]+)__/g, bold);
}

function renderMarkdownTable(lines: string[], startIndex: number, ansi: boolean): { rendered: string[]; nextIndex: number } | undefined {
  if (startIndex + 1 >= lines.length || !lines[startIndex].includes('|') || !isMarkdownTableSeparator(lines[startIndex + 1])) {
    return undefined;
  }
  const rows: string[][] = [];
  rows.push(splitMarkdownTableRow(lines[startIndex]));
  let index = startIndex + 2;
  while (index < lines.length && lines[index].includes('|') && !/^\s*$/.test(lines[index])) {
    rows.push(splitMarkdownTableRow(lines[index]));
    index += 1;
  }
  const columnCount = Math.max(...rows.map((row) => row.length));
  const normalized = rows.map((row) => Array.from({ length: columnCount }, (_, cellIndex) => renderInlineMarkdown(row[cellIndex] ?? '', ansi)));
  const widths = Array.from({ length: columnCount }, (_, cellIndex) => Math.max(...normalized.map((row) => visibleLength(row[cellIndex]))));
  const top = `┌${widths.map((width) => '─'.repeat(width + 2)).join('┬')}┐`;
  const middle = `├${widths.map((width) => '─'.repeat(width + 2)).join('┼')}┤`;
  const bottom = `└${widths.map((width) => '─'.repeat(width + 2)).join('┴')}┘`;
  const renderedRows = normalized.map((row) => `│ ${row.map((cell, cellIndex) => padRight(cell, widths[cellIndex])).join(' │ ')} │`);
  return {
    rendered: [top, renderedRows[0], middle, ...renderedRows.slice(1), bottom],
    nextIndex: index
  };
}

function renderMarkdownForTerminal(markdown: string): string {
  const ansi = shouldUseAnsi();
  const lines = markdown.split(/\r?\n/);
  const rendered: string[] = [];
  for (let index = 0; index < lines.length;) {
    const table = renderMarkdownTable(lines, index, ansi);
    if (table) {
      rendered.push(...table.rendered);
      index = table.nextIndex;
      continue;
    }
    rendered.push(renderInlineMarkdown(lines[index], ansi));
    index += 1;
  }
  return rendered.join('\n');
}

async function printCoachResponse(response: unknown, options: { json: boolean; wait: boolean; waitMs: number }): Promise<void> {
  if (options.json || !options.wait) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }
  const caseId = findString(response, ['sessionId', 'caseId']);
  const turnId = turnIdFrom(response);
  if (caseId) {
    console.error(`Fallakte: ${caseId}`);
  }
  if (turnId) {
    console.error(`Turn: ${turnId}`);
    const turn = await waitForTurn(turnId, options.waitMs);
    const answer = findAnswer(turn);
    if (answer) {
      console.log(renderMarkdownForTerminal(answer));
      return;
    }
    console.log(JSON.stringify(turn ?? response, null, 2));
    return;
  }
  console.log(JSON.stringify(response, null, 2));
}

function mask(value: string): string {
  if (value.length <= 12) {
    return `${value.slice(0, 3)}…`;
  }
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

function parseStartArgs(args: string[]): { text: string; caseId?: string } {
  const textParts = [...args];
  const caseId = readRequiredFlagValue(textParts, '--case-id');
  const text = textParts.join(' ').trim();
  if (!text) {
    throw new Error('Missing text. Usage: willi-mako start <text> [--case-id <caseId>]');
  }
  return { text, caseId };
}

function looksLikeSessionIdentifier(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    || /^(case|session|coach)-[a-z0-9_-]+$/i.test(value)
    || /^[a-z0-9_-]{20,}$/i.test(value);
}

function parseChatArgs(args: string[]): { sessionId?: string; text: string } {
  const commandArgs = [...args];
  const explicitSessionId = readRequiredFlagValue(commandArgs, '--session-id');
  if (commandArgs.length === 0) {
    throw new Error('Missing message. Usage: willi-mako chat <message> or willi-mako chat <sessionId> <message>');
  }
  if (explicitSessionId) {
    return { sessionId: explicitSessionId, text: commandArgs.join(' ').trim() };
  }
  if (commandArgs.length > 1 && looksLikeSessionIdentifier(commandArgs[0])) {
    return { sessionId: commandArgs[0], text: commandArgs.slice(1).join(' ').trim() };
  }
  return { sessionId: storedSession?.currentCaseId, text: commandArgs.join(' ').trim() };
}

interface CaseListItem {
  id: string;
  title?: string;
  summary?: string;
  status?: string;
}

function interactiveHelp(currentCaseId: string | undefined): string {
  return `Aktionen:
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

Aktuelle Fallakte: ${currentCaseId ?? 'noch keine Fallakte gewählt'}

Alles andere wird als Nachricht an Willi-Mako gesendet.`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

function extractSessions(value: unknown): CaseListItem[] {
  const record = asRecord(value);
  if (!record) {
    return [];
  }
  const candidates = [record.sessions, record.data, record.items, record.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const sessions: CaseListItem[] = [];
      for (const item of candidate) {
        const itemRecord = asRecord(item);
        if (!itemRecord) {
          continue;
        }
        const id = findString(itemRecord, ['sessionId', 'caseId', 'id']);
        if (!id) {
          continue;
        }
        sessions.push({
          id,
          title: findString(itemRecord, ['title', 'name']),
          summary: findString(itemRecord, ['summary', 'lastMessage', 'preview']),
          status: findString(itemRecord, ['status', 'state'])
        });
      }
      return sessions;
    }
  }
  return [];
}

function truncate(value: string | undefined, maxLength: number): string {
  if (!value) {
    return '';
  }
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function formatCaseList(cases: CaseListItem[], currentCaseId: string | undefined): string {
  if (cases.length === 0) {
    return 'Keine Fallakten gefunden.';
  }
  const lines = ['Fallakten:'];
  cases.forEach((caseItem, index) => {
    const marker = caseItem.id === currentCaseId ? '*' : ' ';
    const title = truncate(caseItem.title || caseItem.summary || 'Ohne Titel', 34);
    const status = caseItem.status ? ` [${caseItem.status}]` : '';
    const summary = caseItem.title && caseItem.summary ? ` — ${truncate(caseItem.summary, 56)}` : '';
    lines.push(`${marker} ${index + 1}. ${caseItem.id}  ${title}${status}${summary}`);
  });
  return lines.join('\n');
}

function resolveCaseSelection(selection: string | undefined, cases: CaseListItem[]): string | undefined {
  if (!selection) {
    return undefined;
  }
  const numeric = Number(selection);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= cases.length) {
    return cases[numeric - 1].id;
  }
  return selection;
}

async function getCases(): Promise<CaseListItem[]> {
  return extractSessions(await client.listSessions());
}

function requireCurrentCase(currentCaseId: string | undefined): string {
  if (!currentCaseId) {
    throw new Error('Noch keine Fallakte gewählt. Nutze /cases und /use <nr|id> oder /new <text>.');
  }
  return currentCaseId;
}

function safeFilenamePart(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return safe || 'case';
}

function defaultMarkdownPath(caseId: string): string {
  return join(process.cwd(), `willi-mako-${safeFilenamePart(caseId)}.md`);
}

function looksLikePath(value: string | undefined): boolean {
  return Boolean(value && (value.includes('/') || value.includes('\\\\') || value.endsWith('.md') || value.startsWith('.')));
}

async function saveCaseMarkdown(caseId: string, path?: string): Promise<string> {
  const target = path || defaultMarkdownPath(caseId);
  const markdown = await client.getSessionCardMarkdown(caseId);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, markdown.endsWith('\n') ? markdown : `${markdown}\n`, 'utf8');
  return target;
}

function parseSaveArgs(args: string[]): { caseId?: string; path?: string } {
  if (args.length === 0) {
    return { caseId: storedSession?.currentCaseId };
  }
  if (args.length === 1) {
    return looksLikePath(args[0]) ? { caseId: storedSession?.currentCaseId, path: args[0] } : { caseId: args[0] };
  }
  return { caseId: args[0], path: args.slice(1).join(' ') };
}

function parseToolArgs(args: string[]): { question: string; sessionId?: string; waitMs: number } {
  const commandArgs = [...args];
  const toolSessionId = readRequiredFlagValue(commandArgs, '--session-id');
  const waitMs = readNumberFlag(commandArgs, '--wait-ms', 60000);
  const question = commandArgs.join(' ').trim();
  if (!question) {
    throw new Error('Missing question. Usage: willi-mako tool <question> [--session-id <sessionId>]');
  }
  return { question, sessionId: toolSessionId || storedSession?.currentCaseId, waitMs };
}

async function runToolQuery(question: string, toolSessionId: string | undefined, waitMs: number): Promise<Record<string, unknown>> {
  const response = toolSessionId
    ? await client.sendCoachMessage({ sessionId: toolSessionId, text: question })
    : await client.startCoach({ text: question });
  const caseId = findString(response, ['sessionId', 'caseId', 'id']) || toolSessionId;
  const turnId = turnIdFrom(response);
  const turn = turnId ? await waitForTurn(turnId, waitMs) : undefined;
  const answer = findAnswer(turn) || findAnswer(response);
  if (caseId) {
    updateStoredCurrentCase(caseId);
  }
  return {
    success: Boolean(answer || turn || response),
    sessionId: caseId,
    turnId,
    answer,
    response,
    turn
  };
}

const [command, ...args] = process.argv.slice(2);
const baseUrl = process.env.WILLI_MAKO_BASE_URL;
const storedSession = readStoredSession();
const sessionId = process.env.WILLI_MAKO_SESSION_ID || storedSession?.sessionId;
const cookieStore = new MemoryCookieStore();
const client = new WilliMakoClient({
  baseUrl,
  cookieStore,
  sessionId
});

try {
  if (command === 'request-link' && args[0]) {
    console.log(JSON.stringify(await client.requestMagicLink({ email: args[0] }), null, 2));
  } else if (command === 'token-peek' && args[0]) {
    console.log(JSON.stringify(await client.peekToken(extractToken(args[0])), null, 2));
  } else if (command === 'login' && args[0]) {
    const response = await client.verifyMagicLink({ token: extractToken(args[0]) });
    const responseSessionId = findString(response, ['sessionId', 'sid', 'token']);
    const cookieSessionId = cookieStore.snapshot().wm_sid;
    const verifiedSessionId = cookieSessionId || responseSessionId;
    if (!verifiedSessionId) {
      throw new Error('Login succeeded, but no sessionId or wm_sid was returned by the server.');
    }
    const now = new Date().toISOString();
    const session: StoredSession = {
      baseUrl: (baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
      sessionId: verifiedSessionId,
      email: findString(response, ['email', 'emailMasked']),
      mandantId: findString(response, ['mandantId']),
      mandantName: findString(response, ['mandantName']),
      createdAt: storedSession?.createdAt ?? now,
      updatedAt: now
    };
    writeStoredSession(session);
    console.log(JSON.stringify({ success: true, sessionFile: sessionFilePath(), sessionId: mask(verifiedSessionId), email: session.email, mandantId: session.mandantId, mandantName: session.mandantName }, null, 2));
  } else if (command === 'me') {
    console.log(JSON.stringify(await client.currentUser(), null, 2));
  } else if (command === 'logout') {
    try {
      if (sessionId) {
        console.log(JSON.stringify(await client.logout(), null, 2));
      }
    } finally {
      deleteStoredSession();
    }
  } else if (command === 'session-token') {
    if (!sessionId) {
      throw new Error(`No saved session found at ${sessionFilePath()}`);
    }
    if (!args.includes('--show-secret')) {
      console.log(JSON.stringify({ success: true, sessionFile: sessionFilePath(), sessionId: mask(sessionId), hint: 'Use --show-secret to print the raw session token for scripting.' }, null, 2));
    } else {
      console.log(sessionId);
    }
  } else if (command === 'start') {
    const commandArgs = [...args];
    const json = removeFlag(commandArgs, '--json');
    const wait = !removeFlag(commandArgs, '--no-wait');
    const waitMs = readNumberFlag(commandArgs, '--wait-ms', 60000);
    const { text, caseId } = parseStartArgs(commandArgs);
    const response = await client.startCoach(caseId ? { text, caseId } : { text });
    const newCaseId = findString(response, ['sessionId', 'caseId', 'id']);
    updateStoredCurrentCase(newCaseId);
    await printCoachResponse(response, { json, wait, waitMs });
  } else if (command === 'chat') {
    const commandArgs = [...args];
    const json = removeFlag(commandArgs, '--json');
    const wait = !removeFlag(commandArgs, '--no-wait');
    const waitMs = readNumberFlag(commandArgs, '--wait-ms', 60000);
    const { sessionId: caseSessionId, text } = parseChatArgs(commandArgs);
    if (!caseSessionId) {
      throw new Error('No case session selected. Use: willi-mako start <text> or willi-mako chat <sessionId> <message>');
    }
    const response = await client.sendCoachMessage({ sessionId: caseSessionId, text });
    updateStoredCurrentCase(caseSessionId);
    await printCoachResponse(response, { json, wait, waitMs });
  } else if (command === 'turn' && args[0]) {
    const commandArgs = [...args];
    const json = removeFlag(commandArgs, '--json');
    const turn = await client.getCoachTurn(commandArgs[0]);
    const answer = findAnswer(turn);
    console.log(json || !answer ? JSON.stringify(turn, null, 2) : renderMarkdownForTerminal(answer));
  } else if (command === 'tool') {
    const { question, sessionId: toolSessionId, waitMs } = parseToolArgs(args);
    console.log(JSON.stringify(await runToolQuery(question, toolSessionId, waitMs), null, 2));
  } else if (command === 'save') {
    const { caseId, path } = parseSaveArgs(args);
    const savedPath = await saveCaseMarkdown(requireCurrentCase(caseId), path);
    console.log(JSON.stringify({ success: true, path: savedPath }, null, 2));
  } else if (command === 'interactive') {
    let currentCaseId = args[0] || storedSession?.currentCaseId;
    let lastCases: CaseListItem[] = [];
    const rl = createInterface({ input, output });
    console.error('Willi-Mako Chat. /help zeigt Aktionen, /session zeigt die aktuelle Fallakte, /exit beendet.');
    try {
      while (true) {
        let text: string;
        try {
          text = (await rl.question('willi> ')).trim();
        } catch (error) {
          if (error instanceof Error && error.message.includes('readline was closed')) {
            break;
          }
          throw error;
        }
        if (!text) {
          continue;
        }
        if (['/exit', '/quit'].includes(text)) {
          break;
        }
        if (['/', '/help'].includes(text)) {
          console.log(interactiveHelp(currentCaseId));
          continue;
        }
        if (text === '/session') {
          console.error(currentCaseId ? `Fallakte: ${currentCaseId}` : 'Noch keine Fallakte gewählt.');
          continue;
        }
        if (['/cases', '/sessions'].includes(text)) {
          lastCases = await getCases();
          console.log(formatCaseList(lastCases, currentCaseId));
          continue;
        }
        if (text.startsWith('/use ')) {
          if (lastCases.length === 0) {
            lastCases = await getCases();
          }
          const selectedCaseId = resolveCaseSelection(text.slice(5).trim(), lastCases);
          if (!selectedCaseId) {
            console.error('Bitte Fallaktennummer oder sessionId angeben, z.B. /use 2');
            continue;
          }
          currentCaseId = selectedCaseId;
          updateStoredCurrentCase(currentCaseId);
          console.error(`Aktuelle Fallakte: ${currentCaseId}`);
          continue;
        }
        if (text.startsWith('/new ')) {
          const newText = text.slice(5).trim();
          if (!newText) {
            console.error('Bitte Startnachricht angeben, z.B. /new Was wird mit einer PRICAT übertragen?');
            continue;
          }
          const response = await client.startCoach({ text: newText });
          const newCaseId = findString(response, ['sessionId', 'caseId', 'id']) || currentCaseId;
          currentCaseId = newCaseId;
          updateStoredCurrentCase(newCaseId);
          await printCoachResponse(response, { json: false, wait: true, waitMs: 60000 });
          continue;
        }
        if (text === '/show') {
          console.log(JSON.stringify(await client.getSession(requireCurrentCase(currentCaseId)), null, 2));
          continue;
        }
        if (text === '/card') {
          console.log(renderMarkdownForTerminal(await client.getSessionCardMarkdown(requireCurrentCase(currentCaseId))));
          continue;
        }
        if (text.startsWith('/save')) {
          const savePath = text.slice(5).trim() || undefined;
          const savedPath = await saveCaseMarkdown(requireCurrentCase(currentCaseId), savePath);
          console.error(`Gespeichert: ${savedPath}`);
          continue;
        }
        if (text === '/review') {
          console.log(renderMarkdownForTerminal(await client.getSessionReviewMarkdown(requireCurrentCase(currentCaseId))));
          continue;
        }
        if (text.startsWith('/')) {
          console.error(`Unbekannte Aktion: ${text}. Nutze /help für die Liste der Aktionen.`);
          continue;
        }
        const response = currentCaseId
          ? await client.sendCoachMessage({ sessionId: currentCaseId, text })
          : await client.startCoach({ text });
        const newCaseId = findString(response, ['sessionId', 'caseId', 'id']) || currentCaseId;
        currentCaseId = newCaseId;
        updateStoredCurrentCase(newCaseId);
        await printCoachResponse(response, { json: false, wait: true, waitMs: 60000 });
      }
    } finally {
      rl.close();
    }
  } else if (command === 'sessions') {
    console.log(JSON.stringify(await client.listSessions(), null, 2));
  } else if (command === 'session' && args[0]) {
    console.log(JSON.stringify(await client.getSession(args[0]), null, 2));
  } else if (command === 'card' && args[0]) {
    console.log(await client.getSessionCardMarkdown(args[0]));
  } else if (command === 'review' && args[0]) {
    console.log(await client.getSessionReviewMarkdown(args[0]));
  } else {
    usage();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
