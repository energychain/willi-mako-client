import { createServer, type Server } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

interface SeenRequest {
  method?: string;
  path: string;
  authorization: string | null;
  cookie: string | null;
  body: string;
}

interface RunResult {
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

const repo = process.cwd();
const tempDirs: string[] = [];
const servers: Server[] = [];

beforeAll(() => {
  const build = spawnSync('npm', ['run', 'build'], { cwd: repo, encoding: 'utf8' });
  if (build.status !== 0) {
    throw new Error(`npm run build failed\nSTDOUT:\n${build.stdout}\nSTDERR:\n${build.stderr}`);
  }
}, 30_000);

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) => new Promise<void>((resolve) => server.close(() => resolve()))
    )
  );
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

async function startMockApi() {
  const seen: SeenRequest[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const body = Buffer.concat(chunks).toString('utf8');
      seen.push({
        method: req.method,
        path: url.pathname,
        authorization: req.headers.authorization ?? null,
        cookie: req.headers.cookie ?? null,
        body
      });
      res.setHeader('connection', 'close');
      if (url.pathname.endsWith('/card.md')) {
        res.setHeader('content-type', 'text/markdown');
        res.end('# Fallakte\n\n**Gespeichert**');
        return;
      }
      if (url.pathname.endsWith('/review.md')) {
        res.setHeader('content-type', 'text/markdown');
        res.end('# Review\n\n**OK**');
        return;
      }
      res.setHeader('content-type', 'application/json');
      if (url.pathname === '/api/auth/verify') {
        res.setHeader('set-cookie', 'wm_sid=auth-session; HttpOnly; SameSite=Strict');
        res.end(JSON.stringify({ success: true, email: 'user@example.test' }));
      } else if (url.pathname === '/api/sessions') {
        res.end(
          JSON.stringify({
            success: true,
            sessions: [
              { sessionId: 'case-1', title: 'ORDERS', summary: 'ORDERS Anfrage', status: 'draft' },
              { sessionId: 'case-2', title: 'MSCONS', summary: 'MSCONS Werte', status: 'done' }
            ]
          })
        );
      } else if (url.pathname === '/api/sessions/case-2') {
        res.end(JSON.stringify({ success: true, sessionId: 'case-2', title: 'MSCONS', messages: [] }));
      } else if (url.pathname === '/api/coach/start') {
        res.end(JSON.stringify({ success: true, sessionId: 'case-new', turnId: 'turn-new' }));
      } else if (url.pathname === '/api/coach/message') {
        res.end(JSON.stringify({ success: true, sessionId: 'case-2', turnId: 'turn-message' }));
      } else if (url.pathname === '/api/coach/turn/turn-new') {
        res.end(JSON.stringify({ success: true, status: 'done', result: { assistant: 'Neue Fallakte gestartet.' } }));
      } else if (url.pathname === '/api/coach/turn/turn-message') {
        res.end(JSON.stringify({ success: true, status: 'done', result: { assistant: 'Weiterarbeit in case-2.' } }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'not found' }));
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  servers.push(server);
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('mock server did not expose a TCP port');
  }
  return { baseUrl: `http://127.0.0.1:${address.port}`, seen };
}

function runCli(args: string[], env: NodeJS.ProcessEnv, stdinLines: string[] = []): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['bin/willi-mako.cjs', ...args], { cwd: repo, env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (status, signal) => {
      resolve({ status, signal, stdout: stdout.trim(), stderr: stderr.trim() });
    });
    if (stdinLines.length === 0) {
      return;
    }
    stdinLines.forEach((line, index) => {
      setTimeout(() => child.stdin.write(`${line}\n`), 50 + index * 80);
    });
    setTimeout(() => child.stdin.end(), 50 + stdinLines.length * 80);
  });
}

async function login(env: NodeJS.ProcessEnv): Promise<void> {
  const result = await runCli(['login', 'https://willi.cernion.de/auth/verify?token=abc'], env);
  expect(result.status).toBe(0);
}

function expectAuthenticatedRequest(seen: SeenRequest[], path: string): void {
  expect(
    seen.some(
      (request) =>
        request.path === path &&
        (request.authorization === 'Bearer auth-session' || request.cookie === 'wm_sid=auth-session')
    )
  ).toBe(true);
}

describe('willi-mako CLI', () => {
  it('logs in, runs tool mode and returns a single JSON tool result', async () => {
    const { baseUrl, seen } = await startMockApi();
    const dir = makeTempDir('willi-cli-tool-');
    const env = { ...process.env, WILLI_MAKO_BASE_URL: baseUrl, WILLI_MAKO_SESSION_FILE: join(dir, 'session.json') };

    await login(env);
    const tool = await runCli(['tool', 'Was wird mit einer MSCONS übertragen?'], env);

    expect(tool.status).toBe(0);
    const parsed = JSON.parse(tool.stdout) as { sessionId?: string; turnId?: string; answer?: string };
    expect(parsed).toMatchObject({ sessionId: 'case-new', turnId: 'turn-new', answer: 'Neue Fallakte gestartet.' });
    expectAuthenticatedRequest(seen, '/api/coach/start');
    expectAuthenticatedRequest(seen, '/api/coach/turn/turn-new');

    const chat = await runCli(['chat', 'Unquoted', 'message', 'works'], env);
    expect(chat.status).toBe(0);
    expect(seen).toContainEqual(expect.objectContaining({ path: '/api/coach/message', body: JSON.stringify({ sessionId: 'case-new', text: 'Unquoted message works' }) }));
  });

  it('saves case markdown from the CLI', async () => {
    const { baseUrl, seen } = await startMockApi();
    const dir = makeTempDir('willi-cli-save-');
    const savePath = join(dir, 'fallakte.md');
    const env = { ...process.env, WILLI_MAKO_BASE_URL: baseUrl, WILLI_MAKO_SESSION_FILE: join(dir, 'session.json') };

    await login(env);
    const saved = await runCli(['save', 'case-2', savePath], env);

    expect(saved.status).toBe(0);
    expect(JSON.parse(saved.stdout)).toMatchObject({ success: true, path: savePath });
    expect(readFileSync(savePath, 'utf8')).toBe('# Fallakte\n\n**Gespeichert**\n');
    expectAuthenticatedRequest(seen, '/api/sessions/case-2/card.md');
  });

  it('supports interactive case listing, switching and slash actions', async () => {
    const { baseUrl, seen } = await startMockApi();
    const dir = makeTempDir('willi-cli-interactive-');
    const savePath = join(dir, 'interactive.md');
    const env = { ...process.env, WILLI_MAKO_BASE_URL: baseUrl, WILLI_MAKO_SESSION_FILE: join(dir, 'session.json'), NO_COLOR: '1' };

    await login(env);
    const interactive = await runCli(
      ['interactive'],
      env,
      ['/cases', '/use 2', 'Was ist der letzte Stand?', '/show', '/card', '/review', `/save ${savePath}`, '/new Neuer Fall', '/exit']
    );

    expect(interactive.status).toBe(0);
    expect(interactive.stdout).toContain('Fallakten:');
    expect(interactive.stdout).toContain('Weiterarbeit in case-2.');
    expect(interactive.stdout).toContain('Neue Fallakte gestartet.');
    expect(readFileSync(savePath, 'utf8')).toBe('# Fallakte\n\n**Gespeichert**\n');
    expect(seen).toContainEqual(expect.objectContaining({ path: '/api/sessions' }));
    expect(seen).toContainEqual(expect.objectContaining({ path: '/api/coach/message', body: JSON.stringify({ sessionId: 'case-2', text: 'Was ist der letzte Stand?' }) }));
    expect(seen).toContainEqual(expect.objectContaining({ path: '/api/sessions/case-2/review.md' }));
    expect(seen).toContainEqual(expect.objectContaining({ path: '/api/coach/start', body: JSON.stringify({ text: 'Neuer Fall' }) }));
  });

  it('masks session tokens by default and requires explicit secret output', async () => {
    const { baseUrl } = await startMockApi();
    const dir = makeTempDir('willi-cli-token-');
    const env = { ...process.env, WILLI_MAKO_BASE_URL: baseUrl, WILLI_MAKO_SESSION_FILE: join(dir, 'session.json') };

    await login(env);
    const masked = await runCli(['session-token'], env);
    const raw = await runCli(['session-token', '--show-secret'], env);

    expect(masked.status).toBe(0);
    expect(masked.stdout).not.toBe('auth-session');
    expect(JSON.parse(masked.stdout)).toMatchObject({ success: true, sessionId: 'aut…' });
    expect(raw.status).toBe(0);
    expect(raw.stdout).toBe('auth-session');
  });

  it('sanitizes default markdown filenames derived from session ids', async () => {
    const { baseUrl } = await startMockApi();
    const dir = makeTempDir('willi-cli-safe-save-');
    const sessionFile = join(dir, 'session.json');
    const env = { ...process.env, WILLI_MAKO_BASE_URL: baseUrl, WILLI_MAKO_SESSION_FILE: sessionFile };

    writeFileSync(
      sessionFile,
      JSON.stringify({ baseUrl, sessionId: 'auth-session', currentCaseId: '../evil/id', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
      'utf8'
    );
    const saved = await runCli(['save'], env);

    expect(saved.status).toBe(0);
    const parsed = JSON.parse(saved.stdout) as { path: string };
    expect(parsed.path).toBe(join(repo, 'willi-mako-..-evil-id.md'));
    expect(parsed.path).not.toContain('/evil/');
    expect(readFileSync(parsed.path, 'utf8')).toBe('# Fallakte\n\n**Gespeichert**\n');
    rmSync(parsed.path, { force: true });
  });

  it('rejects flags that require a value', async () => {
    const { baseUrl } = await startMockApi();
    const dir = makeTempDir('willi-cli-flags-');
    const env = { ...process.env, WILLI_MAKO_BASE_URL: baseUrl, WILLI_MAKO_SESSION_FILE: join(dir, 'session.json') };

    await login(env);
    await expect(runCli(['start', 'Hallo', '--case-id'], env)).resolves.toMatchObject({ status: 1, stderr: expect.stringContaining('Missing value for --case-id') });
    await expect(runCli(['chat', '--session-id', 'Hallo'], env)).resolves.toMatchObject({ status: 1, stderr: expect.stringContaining('Missing message') });
    await expect(runCli(['tool', '--session-id'], env)).resolves.toMatchObject({ status: 1, stderr: expect.stringContaining('Missing value for --session-id') });
  });
});
