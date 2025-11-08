import { Buffer } from 'node:buffer';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { parse } from 'node:url';
import process from 'node:process';
import { WilliMakoClient, WilliMakoError } from '../index.js';
import type {
  ClarificationAnalyzeRequest,
  ContextResolveRequest,
  ReasoningGenerateRequest,
  RunNodeScriptJob,
  ToolScriptAttachment
} from '../types.js';
import { applyLoginEnvironmentToken } from '../cli-utils.js';
import {
  generateToolScript,
  ToolGenerationJobFailedError,
  ToolGenerationJobTimeoutError,
  normalizeToolScriptAttachments,
  MAX_TOOL_SCRIPT_ATTACHMENTS,
  MAX_TOOL_SCRIPT_ATTACHMENT_CHARS,
  MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS,
  type ToolScriptInputMode
} from '../tool-generation.js';

const ATTACHMENT_ITEM_TEMPLATE = `
          <div class="attachment-grid">
            <label>
              Dateiname
              <input type="text" name="filename" placeholder="z. B. clearing-plan.md" required />
            </label>
            <label>
              MIME-Typ (optional)
              <input type="text" name="mimeType" placeholder="text/plain" />
            </label>
            <label>
              Gewichtung (0-1, optional)
              <input type="number" name="weight" step="0.05" min="0" max="1" />
            </label>
          </div>
          <label>
            Beschreibung (optional)
            <textarea name="description" placeholder="Beschreibe den Zweck des Anhangs"></textarea>
          </label>
          <label>
            Inhalt
            <textarea name="content" placeholder="Kontext oder Referenzdaten für den Generator" required></textarea>
          </label>
          <div class="attachment-meta">
            <span class="attachment-index"></span>
            <span class="char-count">0 / ${MAX_TOOL_SCRIPT_ATTACHMENT_CHARS} Zeichen</span>
          </div>
          <div class="attachment-actions">
            <button type="button" data-action="remove">✖️ Entfernen</button>
          </div>
        `.trim();

export interface WebDashboardOptions {
  /** Custom Willi-Mako client instance (primarily for testing). */
  client?: WilliMakoClient;
  /** Port to bind the HTTP server. Defaults to PORT env var or 4173. */
  port?: number;
  /** Optional callback for structured logging. */
  logger?: (message: string) => void;
  /** Override the base URL used when constructing a client. */
  baseUrl?: string;
  /** Override the bearer token when constructing a new client. */
  token?: string | null;
}

export interface WebDashboardInstance {
  /** The bound port. */
  port: number;
  /** Underlying Node HTTP server. */
  server: Server;
  /** Convenience URL pointing to the dashboard root. */
  url: string;
  /** Gracefully stops the server. */
  stop(): Promise<void>;
}

type AnalyzeResponse = {
  status: string;
  result?: string;
  artifactSuggestion?: string;
  jobId?: string;
};

export async function startWebDashboard(
  options: WebDashboardOptions = {}
): Promise<WebDashboardInstance> {
  const port = options.port ?? Number.parseInt(process.env.PORT ?? '4173', 10);
  const client =
    options.client ??
    new WilliMakoClient({
      baseUrl: options.baseUrl ?? undefined,
      token: options.token ?? process.env.WILLI_MAKO_TOKEN ?? null
    });

  let lastLoginInfo: { email: string; expiresAt: string } | null = null;

  const htmlPage = createHtmlPage({
    baseUrl: client.getBaseUrl(),
    tokenConfigured: Boolean(options.token ?? process.env.WILLI_MAKO_TOKEN)
  });

  const server = createServer(async (req, res) => {
    const url = parse(req.url ?? '/', true);

    if (req.method === 'GET' && url.pathname === '/') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(htmlPage);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/healthz') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/login') {
      try {
        const payload = (await parseJsonBody(req)) as {
          email?: string;
          password?: string;
          persistToken?: boolean;
        } | null;

        if (!payload?.email || !payload?.password) {
          sendJson(res, 400, { error: 'Felder "email" und "password" sind erforderlich.' });
          return;
        }

        const persistToken = payload.persistToken !== false;
        const response = await client.login(
          { email: payload.email, password: payload.password },
          { persistToken }
        );

        if (persistToken) {
          applyLoginEnvironmentToken(response);
        }

        lastLoginInfo = {
          email: payload.email,
          expiresAt: response.data.expiresAt
        };

        sendJson(res, 200, { ...response, persisted: persistToken });
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/sessions') {
      try {
        const payload = ((await parseJsonBody(req)) as Record<string, unknown> | null) ?? {};
        const response = await client.createSession(payload);
        sendJson(res, 201, response);
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'GET' && url.pathname?.startsWith('/sessions/')) {
      try {
        const sessionId = url.pathname.split('/')[2];
        if (!sessionId) {
          sendJson(res, 400, { error: 'Session-ID ist erforderlich.' });
          return;
        }
        const response = await client.getSession(sessionId);
        sendJson(res, 200, response);
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'DELETE' && url.pathname?.startsWith('/sessions/')) {
      try {
        const sessionId = url.pathname.split('/')[2];
        if (!sessionId) {
          sendJson(res, 400, { error: 'Session-ID ist erforderlich.' });
          return;
        }
        await client.deleteSession(sessionId);
        sendJson(res, 200, { success: true, sessionId });
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/chat') {
      try {
        const payload = (await parseJsonBody(req)) as {
          sessionId?: string;
          message?: string;
          contextSettings?: Record<string, unknown>;
          timelineId?: string;
        } | null;
        if (!payload?.sessionId || !payload.message) {
          sendJson(res, 400, { error: 'Felder "sessionId" und "message" sind erforderlich.' });
          return;
        }
        const response = await client.chat({
          sessionId: payload.sessionId,
          message: payload.message,
          contextSettings: payload.contextSettings,
          timelineId: payload.timelineId ?? undefined
        });
        sendJson(res, 200, response);
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/semantic-search') {
      try {
        const payload = (await parseJsonBody(req)) as {
          sessionId?: string;
          query?: string;
          options?: Record<string, unknown>;
        } | null;
        if (!payload?.sessionId || !payload.query) {
          sendJson(res, 400, { error: 'Felder "sessionId" und "query" sind erforderlich.' });
          return;
        }
        const response = await client.semanticSearch({
          sessionId: payload.sessionId,
          query: payload.query,
          options: payload.options
        });
        sendJson(res, 200, response);
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/reasoning/generate') {
      try {
        const payload = (await parseJsonBody(req)) as ReasoningGenerateRequest | null;
        if (!payload?.sessionId || !payload?.query) {
          sendJson(res, 400, { error: 'Felder "sessionId" und "query" sind erforderlich.' });
          return;
        }
        const response = await client.generateReasoning(payload);
        sendJson(res, 200, response);
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/context/resolve') {
      try {
        const payload = (await parseJsonBody(req)) as ContextResolveRequest | null;
        if (!payload?.sessionId || !payload?.query) {
          sendJson(res, 400, { error: 'Felder "sessionId" und "query" sind erforderlich.' });
          return;
        }
        const response = await client.resolveContext(payload);
        sendJson(res, 200, response);
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/clarification/analyze') {
      try {
        const payload = (await parseJsonBody(req)) as ClarificationAnalyzeRequest | null;
        if (!payload?.sessionId || !payload?.query) {
          sendJson(res, 400, { error: 'Felder "sessionId" und "query" sind erforderlich.' });
          return;
        }
        const response = await client.analyzeClarification(payload);
        sendJson(res, 200, response);
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/tool-generator') {
      try {
        const payload = (await parseJsonBody(req)) as {
          sessionId?: string;
          query?: string;
          preferredInputMode?: string;
          attachments?: ToolScriptAttachment[] | null;
        } | null;

        if (!payload?.sessionId || !payload?.query) {
          sendJson(res, 400, { error: 'Felder "sessionId" und "query" sind erforderlich.' });
          return;
        }

        let preferredInputMode: ToolScriptInputMode | undefined;
        if (payload.preferredInputMode) {
          const inputMode = payload.preferredInputMode;
          if (inputMode === 'file' || inputMode === 'stdin' || inputMode === 'environment') {
            preferredInputMode = inputMode;
          } else {
            sendJson(res, 400, {
              error: 'Ungültiger Inputmodus. Erlaubt sind "file", "stdin" oder "environment".'
            });
            return;
          }
        }

        let normalizedAttachments: ToolScriptAttachment[] | undefined;
        if (payload.attachments) {
          if (!Array.isArray(payload.attachments)) {
            sendJson(res, 400, { error: 'Anhänge müssen als Array gesendet werden.' });
            return;
          }
          try {
            normalizedAttachments =
              normalizeToolScriptAttachments(payload.attachments) ?? undefined;
          } catch (error) {
            sendJson(res, 400, { error: error instanceof Error ? error.message : String(error) });
            return;
          }
        }

        const progress: Array<{
          status: string;
          stage: string | null;
          message: string | null;
          attempt: number | null;
          timestamp: string;
        }> = [];

        const generation = await generateToolScript({
          client,
          sessionId: payload.sessionId,
          query: payload.query,
          preferredInputMode,
          attachments: normalizedAttachments,
          onJobUpdate: (job) => {
            progress.push({
              status: job.status,
              stage: job.progress?.stage ?? null,
              message: job.progress?.message ?? null,
              attempt:
                typeof job.progress?.attempt === 'number'
                  ? job.progress.attempt
                  : job.attempts > 0
                    ? job.attempts
                    : null,
              timestamp: new Date().toISOString()
            });
          }
        });

        const attachmentSummary = normalizedAttachments
          ? {
              count: normalizedAttachments.length,
              totalChars: normalizedAttachments.reduce(
                (sum, attachment) => sum + attachment.content.length,
                0
              )
            }
          : { count: 0, totalChars: 0 };

        sendJson(res, 200, {
          success: true,
          data: {
            sessionId: generation.result.sessionId,
            summary: generation.summary,
            description: generation.description,
            suggestedFileName: generation.suggestedFileName,
            language: generation.language ?? null,
            code: generation.code,
            descriptor: generation.descriptor,
            expectedOutputDescription: generation.expectedOutputDescription ?? null,
            inputSchema: generation.inputSchema ?? null,
            job: generation.job,
            initialResponse: generation.initialResponse,
            progress,
            attachments: normalizedAttachments ?? [],
            attachmentSummary
          }
        });
      } catch (error) {
        if (error instanceof ToolGenerationJobTimeoutError) {
          sendJson(res, 504, { error: error.message, job: error.job });
          return;
        }
        if (error instanceof ToolGenerationJobFailedError) {
          sendJson(res, 502, { error: error.message, job: error.job });
          return;
        }
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/analysis/run') {
      try {
        const payload = (await parseJsonBody(req)) as {
          sessionId?: string;
          message?: string;
        } | null;
        if (!payload?.sessionId || !payload?.message) {
          sendJson(res, 400, { error: 'Felder "sessionId" und "message" sind erforderlich.' });
          return;
        }

        const script = `const input = ${JSON.stringify(payload.message)};\nconsole.log('Empfangene Nachricht:', input);\nconst segments = input.split('+');\nconst type = segments[1] ?? 'unbekannt';\nreturn {\n  documentType: type,\n  segments: segments.length,\n  preview: input.slice(0, 120)\n};`;

        const job = await client.createNodeScriptJob({
          sessionId: payload.sessionId,
          source: script,
          timeoutMs: 5000
        });

        const analysis: AnalyzeResponse = {
          status: job.data.job.status,
          jobId: job.data.job.id
        };

        const completedJob = await waitForJob(client, job.data.job.id);
        if (completedJob.status === 'succeeded') {
          const output = completedJob.result?.stdout ?? '';
          analysis.status = 'succeeded';
          analysis.result = output || 'Keine Ausgabe verfügbar.';
          if (output.includes('documentType')) {
            analysis.artifactSuggestion = 'Validierungsbericht';
          }
        } else {
          analysis.status = 'failed';
          analysis.result = completedJob.result?.stderr ?? 'Keine Fehlerausgabe verfügbar.';
        }

        sendJson(res, 200, analysis);
      } catch (error) {
        handleApiError(res, error);
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/status/login') {
      sendJson(res, 200, { lastLoginInfo });
      return;
    }

    // EDIFACT Message Analyzer Routes (Version 0.7.0)
    if (req.method === 'POST' && url.pathname === '/edifact/analyze') {
      try {
        const body = (await parseJsonBody(req)) as { message: string };
        const response = await client.analyzeEdifactMessage({ message: body.message });
        sendJson(res, 200, response);
      } catch (error) {
        sendJson(res, error instanceof WilliMakoError ? error.status : 500, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/edifact/validate') {
      try {
        const body = (await parseJsonBody(req)) as { message: string };
        const response = await client.validateEdifactMessage({ message: body.message });
        sendJson(res, 200, response);
      } catch (error) {
        sendJson(res, error instanceof WilliMakoError ? error.status : 500, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/edifact/explain') {
      try {
        const body = (await parseJsonBody(req)) as { message: string };
        const response = await client.explainEdifactMessage({ message: body.message });
        sendJson(res, 200, response);
      } catch (error) {
        sendJson(res, error instanceof WilliMakoError ? error.status : 500, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/edifact/modify') {
      try {
        const body = (await parseJsonBody(req)) as { instruction: string; currentMessage: string };
        const response = await client.modifyEdifactMessage({
          instruction: body.instruction,
          currentMessage: body.currentMessage
        });
        sendJson(res, 200, response);
      } catch (error) {
        sendJson(res, error instanceof WilliMakoError ? error.status : 500, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/edifact/chat') {
      try {
        const body = (await parseJsonBody(req)) as {
          message: string;
          currentEdifactMessage: string;
        };
        const response = await client.chatAboutEdifactMessage({
          message: body.message,
          currentEdifactMessage: body.currentEdifactMessage
        });
        sendJson(res, 200, response);
      } catch (error) {
        sendJson(res, error instanceof WilliMakoError ? error.status : 500, {
          error: error instanceof Error ? error.message : String(error)
        });
      }
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });

  await new Promise<void>((resolve) => {
    server.listen(port, resolve);
  });

  const addressInfo = server.address() as AddressInfo | string | null;
  const resolvedPort =
    typeof addressInfo === 'object' && addressInfo !== null && 'port' in addressInfo
      ? (addressInfo.port as number)
      : port;

  const resolvedUrl = `http://localhost:${resolvedPort}`;

  options.logger?.(`⚡ Willi-Mako Dashboard läuft unter ${resolvedUrl}`);

  return {
    port: resolvedPort,
    server,
    url: resolvedUrl,
    async stop() {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
  };
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return null;
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(raw);
}

async function waitForJob(client: WilliMakoClient, jobId: string): Promise<RunNodeScriptJob> {
  let attempt = 0;
  const maxAttempts = 15;
  while (attempt < maxAttempts) {
    const job = await client.getToolJob(jobId);
    const jobData = job.data.job;
    const state = jobData.status;
    if (state === 'succeeded' || state === 'failed') {
      if (jobData.type !== 'run-node-script') {
        throw new Error(`Unerwarteter Job-Typ ${jobData.type} beim Warten auf Analysejob.`);
      }
      return jobData;
    }
    attempt += 1;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error('Zeitüberschreitung beim Abfragen des Job-Status.');
}

function handleApiError(res: ServerResponse, error: unknown): void {
  if (error instanceof WilliMakoError) {
    sendJson(res, error.status ?? 500, {
      error: 'Willi-Mako API-Fehler',
      details: error.body
    });
    return;
  }
  sendJson(res, 500, {
    error: (error as Error).message ?? 'Unbekannter Fehler'
  });
}

function createHtmlPage(params: { baseUrl: string; tokenConfigured: boolean }): string {
  const bootstrapState = JSON.stringify({
    tokenConfigured: params.tokenConfigured,
    baseUrl: params.baseUrl
  });

  return `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Willi-Mako Control Center</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        background: radial-gradient(circle at top, #edf2ff, #e0e7ff);
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: stretch;
      }
      main {
        max-width: 1060px;
        width: 100%;
        margin: 2.5rem 1.5rem;
        background: rgba(255, 255, 255, 0.94);
        padding: 2.5rem;
        border-radius: 28px;
        box-shadow: 0 35px 70px rgba(27, 51, 140, 0.18);
        backdrop-filter: blur(6px);
      }
      h1 {
        margin-top: 0;
        font-size: clamp(2.2rem, 5vw, 3rem);
        color: #1b338c;
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      h1 span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3.2rem;
        height: 3.2rem;
        border-radius: 14px;
        background: linear-gradient(135deg, #1b338c, #4f7df3);
        color: #fff;
        font-weight: 600;
      }
      .status-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 0.8rem;
        margin-bottom: 2rem;
      }
      .badge {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        border-radius: 16px;
        padding: 1rem 1.2rem;
        background: rgba(27, 51, 140, 0.08);
        color: #1b338c;
        font-size: 0.95rem;
      }
      .badge strong {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        opacity: 0.65;
      }
      .card {
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(27, 51, 140, 0.08);
        border-radius: 20px;
        padding: 1.8rem;
        margin-bottom: 1.4rem;
        box-shadow: 0 18px 35px rgba(27, 51, 140, 0.12);
      }
      .card h2 {
        margin-top: 0;
        color: #1b338c;
      }
      .card h3 {
        margin-bottom: 0.6rem;
        margin-top: 1.6rem;
        font-size: 1.1rem;
        color: #2746b6;
      }
      form {
        display: grid;
        gap: 0.9rem;
        margin-bottom: 1rem;
      }
      label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-weight: 600;
        color: #1b338c;
        font-size: 0.95rem;
      }
      input[type="text"],
      input[type="password"],
      input[type="email"],
      input[type="number"],
      select,
      textarea {
        border: 1px solid rgba(27, 51, 140, 0.2);
        border-radius: 14px;
        padding: 0.85rem 1rem;
        font-size: 0.95rem;
        background: rgba(255, 255, 255, 0.92);
      }
      textarea {
        min-height: 120px;
        resize: vertical;
      }
      input:focus,
      select:focus,
      textarea:focus {
        outline: none;
        border-color: #4f7df3;
        box-shadow: 0 0 0 4px rgba(79, 125, 243, 0.2);
      }
      .inline-controls {
        display: flex;
        gap: 0.9rem;
        align-items: enter;
      }
      button {
        appearance: none;
        border: none;
        border-radius: 999px;
        padding: 0.85rem 1.5rem;
        background: linear-gradient(135deg, #4f7df3, #1b338c);
        color: #fff;
        font-weight: 600;
        font-size: 0.95rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        box-shadow: 0 18px 36px rgba(79, 125, 243, 0.32);
        transition: transform 0.18s ease, box-shadow 0.18s ease;
      }
      button:disabled {
        cursor: not-allowed;
        background: linear-gradient(135deg, #9aa9d9, #6f7bb0);
        box-shadow: none;
      }
      button:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 24px 48px rgba(27, 51, 140, 0.35);
      }
      pre {
        background: rgba(23, 36, 89, 0.12);
        color: #0f1b45;
        padding: 1rem 1.2rem;
        border-radius: 14px;
        font-size: 0.9rem;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .hint {
        font-size: 0.85rem;
        color: rgba(27, 51, 140, 0.7);
      }
      #tool-generator-status[data-variant="progress"] {
        color: #1b338c;
        font-weight: 600;
      }
      #tool-generator-status[data-variant="success"] {
        color: #0f766e;
        font-weight: 600;
      }
      #tool-generator-status[data-variant="error"] {
        color: #be123c;
        font-weight: 600;
      }
      .checkbox {
        flex-direction: row;
        align-items: center;
        font-weight: 500;
        gap: 0.6rem;
      }
      .checkbox input {
        width: 1rem;
        height: 1rem;
      }
      .attachment-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 0.6rem;
      }
      .attachment-item {
        border: 1px dashed rgba(27, 51, 140, 0.25);
        border-radius: 16px;
        padding: 1rem;
        background: rgba(255, 255, 255, 0.7);
        display: grid;
        gap: 0.75rem;
      }
      .attachment-grid {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      }
      .attachment-grid label {
        font-size: 0.9rem;
      }
      .attachment-item textarea {
        min-height: 140px;
      }
      .attachment-meta {
        font-size: 0.8rem;
        color: rgba(27, 51, 140, 0.6);
      }
      .attachment-item .attachment-actions {
        display: flex;
        justify-content: flex-end;
      }
      .attachment-item .attachment-actions button {
        padding: 0.45rem 0.9rem;
        font-size: 0.85rem;
        box-shadow: none;
        background: linear-gradient(135deg, #fb7185, #be123c);
      }
      @media (max-width: 720px) {
        main {
          margin: 1.4rem 1rem;
          padding: 1.6rem;
        }
        .card {
          padding: 1.3rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1><span>⚡</span>Willi-Mako Control Center</h1>
      <p class="hint">
        Verwende das Dashboard, um alle Willi-Mako API-Funktionen ohne lokale Tooling-Skripte auszuprobieren:
        Login, Session-Verwaltung, Chatflows, Semantic Search, Reasoning sowie die Sandbox für Marktkommunikation.
      </p>
      <div class="status-grid">
        <div class="badge">
          <strong>Base URL</strong>
          <span id="base-url-status">${params.baseUrl}</span>
        </div>
        <div class="badge">
          <strong>Token</strong>
          <span id="token-status">${params.tokenConfigured ? 'Konfiguriert (ENV)' : 'Nicht gesetzt'}</span>
        </div>
        <div class="badge">
          <strong>Aktive Session</strong>
          <span id="current-session">Keine</span>
        </div>
        <div class="badge">
          <strong>Letzter Login</strong>
          <span id="login-status">–</span>
        </div>
      </div>

      ${dashboardBody()}
    </main>

    <script>
      ${clientScript(bootstrapState)}
    </script>
  </body>
</html>`;
}

function dashboardBody(): string {
  // The body markup is lengthy but intentionally kept inline to avoid additional bundling steps.
  return bodyContent();
}

function bodyContent(): string {
  return `<section class="card">
        <h2>Authentifizierung</h2>
        <form id="login-form">
          <label>
            E-Mail
            <input type="email" name="email" placeholder="you@example.com" required />
          </label>
          <label>
            Passwort
            <input type="password" name="password" placeholder="••••••••" required />
          </label>
          <label class="checkbox">
            <input type="checkbox" name="persist" checked />
            Token im Server behalten (setzt setToken auf dem SDK)
          </label>
          <div class="inline-controls">
            <button type="submit">🔐 Login durchführen</button>
          </div>
        </form>
        <pre id="login-output">Noch kein Login durchgeführt.</pre>
      </section>

      <section class="card">
        <h2>Sessions verwalten</h2>
        <form id="session-create-form">
          <label>
            Lebensdauer (Minuten)
            <input type="number" name="ttl" placeholder="z. B. 60" min="1" />
          </label>
          <label>
            Preferences (JSON)
            <textarea name="preferences" placeholder='{"companiesOfInterest":["DE123"],"preferredTopics":["mscons"]}'></textarea>
          </label>
          <label>
            Context Settings (JSON)
            <textarea name="context" placeholder='{"timezone":"Europe/Berlin"}'></textarea>
          </label>
          <div class="inline-controls">
            <button type="submit">🆕 Session erstellen</button>
          </div>
        </form>
        <pre id="session-output">Noch keine Session erstellt.</pre>

        <form id="session-load-form">
          <label>
            Session-ID abrufen
            <input type="text" name="sessionId" placeholder="session-uuid" data-sync-session="true" />
          </label>
          <div class="inline-controls">
            <button type="submit">📥 Session laden</button>
          </div>
        </form>
        <pre id="session-load-output">Noch keine Session geladen.</pre>

        <form id="session-delete-form">
          <label>
            Session-ID löschen
            <input type="text" name="sessionId" placeholder="session-uuid" data-sync-session="true" />
          </label>
          <div class="inline-controls">
            <button type="submit">🗑️ Session löschen</button>
          </div>
        </form>
        <pre id="session-delete-output">Noch keine Session gelöscht.</pre>
      </section>

      <section class="card">
        <h2>Wissen & Retrieval</h2>
        <form id="search-form">
          <label>
            Session-ID (optional)
            <input type="text" name="sessionId" placeholder="Verwendet aktive Session" data-sync-session="true" />
          </label>
          <label>
            Suchanfrage
            <input type="text" name="query" placeholder="Welche Prozesse gelten für MSCONS?" required />
          </label>
          <label>
            Optionen (JSON)
            <textarea name="options" placeholder='{"limit":5,"outlineScoping":true}'></textarea>
          </label>
          <div class="inline-controls">
            <button type="submit">🔎 Semantische Suche starten</button>
          </div>
        </form>
        <pre id="search-output">Noch keine Suche ausgeführt.</pre>
      </section>

      <section class="card">
        <h2>Konversation & Entscheidung</h2>
        <h3>Chatflow</h3>
        <form id="chat-form">
          <label>
            Session-ID (optional)
            <input type="text" name="sessionId" placeholder="Verwendet aktive Session" data-sync-session="true" />
          </label>
          <label>
            Nachricht
            <textarea name="message" placeholder="Beschreibe mir den Prozess für eine UTILMD-Anmeldung." required></textarea>
          </label>
          <label>
            Kontext-Override (JSON)
            <textarea name="context"></textarea>
          </label>
          <label>
            Timeline-ID (optional)
            <input type="text" name="timeline" placeholder="timeline-uuid" />
          </label>
          <div class="inline-controls">
            <button type="submit">💬 Nachricht senden</button>
          </div>
        </form>
        <pre id="chat-output">Noch keine Nachricht gesendet.</pre>

        <h3>Reasoning</h3>
        <form id="reasoning-form">
          <label>
            Session-ID (optional)
            <input type="text" name="sessionId" placeholder="Verwendet aktive Session" data-sync-session="true" />
          </label>
          <label>
            Frage / Aufgabenstellung
            <textarea name="query" placeholder="Erstelle mir eine Compliance-Checkliste für UTILMD." required></textarea>
          </label>
          <label>
            Historie (JSON Array)
            <textarea name="messages" placeholder='[{"role":"user","content":"Hallo"}]'></textarea>
          </label>
          <label>
            Kontext-Override (JSON)
            <textarea name="context"></textarea>
          </label>
          <label>
            Preferences-Override (JSON)
            <textarea name="preferences"></textarea>
          </label>
          <label>
            Pipeline-Override (JSON)
            <textarea name="pipeline"></textarea>
          </label>
          <label class="checkbox">
            <input type="checkbox" name="detailedIntent" />
            Detaillierte Intent-Analyse aktivieren
          </label>
          <div class="inline-controls">
            <button type="submit">🧠 Reasoning ausführen</button>
          </div>
        </form>
        <pre id="reasoning-output">Noch kein Reasoning ausgeführt.</pre>

        <h3>Kontextauflösung</h3>
        <form id="context-form">
          <label>
            Session-ID (optional)
            <input type="text" name="sessionId" placeholder="Verwendet aktive Session" data-sync-session="true" />
          </label>
          <label>
            Anfrage
            <textarea name="query" placeholder="Ich brauche alle Unterlagen für einen Lieferantenwechsel." required></textarea>
          </label>
          <label>
            Historie (JSON Array)
            <textarea name="messages"></textarea>
          </label>
          <label>
            Kontext-Override (JSON)
            <textarea name="context"></textarea>
          </label>
          <div class="inline-controls">
            <button type="submit">🧭 Kontext bestimmen</button>
          </div>
        </form>
        <pre id="context-output">Noch keine Kontextauflösung durchgeführt.</pre>

        <h3>Klarstellungsanalyse</h3>
        <form id="clarification-form">
          <label>
            Session-ID (optional)
            <input type="text" name="sessionId" placeholder="Verwendet aktive Session" data-sync-session="true" />
          </label>
          <label>
            Anfrage
            <textarea name="query" placeholder="Bitte identifiziere meine nächsten Schritte im ORDERS-Prozess." required></textarea>
          </label>
          <label class="checkbox">
            <input type="checkbox" name="enhancedQuery" />
            Optimierte Rückfrage erzeugen
          </label>
          <div class="inline-controls">
            <button type="submit">❓ Analyse starten</button>
          </div>
        </form>
        <pre id="clarification-output">Noch keine Analyse durchgeführt.</pre>
      </section>

      <section class="card">
        <h2>Deterministischer Tool-Generator</h2>
        <p class="hint">
          Erstellt ein deterministisches CLI- oder MCP-Toolskript über <code>createDeterministicGeneratorScript</code>.
          Unterstützt bis zu ${MAX_TOOL_SCRIPT_ATTACHMENTS} Anhänge mit jeweils ca.
          ${(MAX_TOOL_SCRIPT_ATTACHMENT_CHARS / 1_000_000).toFixed(1)} MB Text (≈ ${MAX_TOOL_SCRIPT_ATTACHMENT_CHARS.toLocaleString('de-DE')} Zeichen)
          und insgesamt höchstens ${(MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS / 1_000_000).toFixed(1)} MB.
        </p>
        <form id="tool-generator-form">
          <label>
            Session-ID (optional)
            <input type="text" name="sessionId" placeholder="Verwendet aktive Session" data-sync-session="true" />
          </label>
          <label>
            Aufgabenbeschreibung
            <textarea name="prompt" placeholder="Beschreibe das gewünschte deterministische Tool." required></textarea>
          </label>
          <label>
            Bevorzugter Inputmodus
            <select name="inputMode">
              <option value="">Automatisch</option>
              <option value="file">Datei (argv)</option>
              <option value="stdin">STDIN</option>
              <option value="environment">Umgebungsvariable</option>
            </select>
          </label>
          <label>
            Anhänge
            <div class="attachment-list" id="generator-attachments"></div>
          </label>
          <div class="inline-controls">
            <button type="button" id="add-attachment">➕ Anhang hinzufügen</button>
            <button type="submit">🛠️ Skript generieren</button>
            <span id="tool-generator-status" class="hint">Bereit</span>
          </div>
        </form>
        <h3>Generiertes Skript</h3>
        <pre id="tool-generator-output">Noch kein Skript generiert.</pre>
        <h3>Metadaten</h3>
        <pre id="tool-generator-meta">Noch keine Metadaten verfügbar.</pre>
      </section>

      <section class="card">
        <h2>Sandbox Schnelltest (Node Script)</h2>
        <p class="hint">
          Führt ein Node.js-Skript über <code>createNodeScriptJob</code> aus und zeigt Ergebnis & Artefaktvorschlag an.
        </p>
        <form id="analyze-form">
          <label>
            Session-ID (optional)
            <input type="text" name="sessionId" placeholder="Verwendet aktive Session" data-sync-session="true" />
          </label>
          <label>
            EDIFACT / Marktkommunikationsmessage
            <textarea name="message" placeholder="UNH+1+UTILMD:D:04B:UN:2.3e..." required></textarea>
          </label>
          <div class="inline-controls">
            <button type="submit">🚀 Analyse starten</button>
            <span id="analysis-status" class="hint">Bereit</span>
          </div>
        </form>
        <h3>Ausgabe</h3>
        <pre id="analysis-output">Noch keine Analyse durchgeführt.</pre>
        <h3>Artefakt-Vorschlag</h3>
        <pre id="artifact-output">Wird nach erfolgreicher Analyse vorgeschlagen.</pre>
      </section>

      <section class="card">
        <h2>🔍 EDIFACT Message Analyzer (v0.7.0)</h2>
        <p class="hint">
          Neue Funktionen zur Analyse, Validierung und Modifikation von EDIFACT-Nachrichten.
        </p>

        <h3>Nachricht analysieren</h3>
        <form id="edifact-analyze-form">
          <label>
            EDIFACT-Nachricht
            <textarea name="message" placeholder="UNH+00000000001111+MSCONS:D:11A:UN:2.6e..." required></textarea>
          </label>
          <div class="inline-controls">
            <button type="submit">📊 Analysieren</button>
          </div>
        </form>
        <pre id="edifact-analyze-output">Noch keine Analyse durchgeführt.</pre>

        <h3>Nachricht validieren</h3>
        <form id="edifact-validate-form">
          <label>
            EDIFACT-Nachricht
            <textarea name="message" placeholder="UNH+1+UTILMD:D:04B:UN:2.3e..." required></textarea>
          </label>
          <div class="inline-controls">
            <button type="submit">✓ Validieren</button>
          </div>
        </form>
        <pre id="edifact-validate-output">Noch keine Validierung durchgeführt.</pre>

        <h3>Nachricht erklären</h3>
        <form id="edifact-explain-form">
          <label>
            EDIFACT-Nachricht
            <textarea name="message" placeholder="UNH+1+MSCONS:D:11A:UN:2.6e..." required></textarea>
          </label>
          <div class="inline-controls">
            <button type="submit">📖 Erklären</button>
          </div>
        </form>
        <pre id="edifact-explain-output">Noch keine Erklärung generiert.</pre>

        <h3>Nachricht modifizieren</h3>
        <form id="edifact-modify-form">
          <label>
            EDIFACT-Nachricht
            <textarea name="message" placeholder="UNH+1+MSCONS:D:11A:UN:2.6e..." required></textarea>
          </label>
          <label>
            Änderungsanweisung
            <input type="text" name="instruction" placeholder="z.B. 'Erhöhe den Verbrauch in jedem Zeitfenster um 10%'" required />
          </label>
          <div class="inline-controls">
            <button type="submit">✏️ Modifizieren</button>
          </div>
        </form>
        <pre id="edifact-modify-output">Noch keine Modifikation durchgeführt.</pre>

        <h3>Chat über Nachricht</h3>
        <form id="edifact-chat-form">
          <label>
            EDIFACT-Nachricht (Kontext)
            <textarea name="message" placeholder="UNH+1+MSCONS:D:11A:UN:2.6e..." required></textarea>
          </label>
          <label>
            Ihre Frage
            <input type="text" name="query" placeholder="z.B. 'Welche Zählernummer ist in dieser Nachricht enthalten?'" required />
          </label>
          <div class="inline-controls">
            <button type="submit">💬 Frage stellen</button>
          </div>
        </form>
        <pre id="edifact-chat-output">Noch keine Frage gestellt.</pre>
      </section>`;
}

function clientScript(bootstrapState: string): string {
  const script = `const bootstrap = ${bootstrapState};
      const state = {
        sessionId: null,
        tokenConfigured: bootstrap.tokenConfigured,
        lastLogin: null,
        baseUrl: bootstrap.baseUrl
      };

      const toolGeneratorLimits = {
        maxAttachments: ${MAX_TOOL_SCRIPT_ATTACHMENTS},
        maxAttachmentChars: ${MAX_TOOL_SCRIPT_ATTACHMENT_CHARS},
        maxTotalChars: ${MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS}
      };

      let generatorAttachmentContainer = null;
      let generatorAddButton = null;
      let generatorStatusElement = null;
      let generatorFormElement = null;
      let generatorBusy = false;

      const statusSession = document.getElementById('current-session');
      const statusToken = document.getElementById('token-status');
      const statusLogin = document.getElementById('login-status');

      function formatJson(value) {
        if (value === null || value === undefined) {
          return 'null';
        }
        if (typeof value === 'string') {
          return value;
        }
        try {
          return JSON.stringify(value, null, 2);
        } catch (error) {
          return String(value);
        }
      }

      function setOutput(id, value) {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = formatJson(value);
        }
      }

      function updateStatus() {
        statusSession.textContent = state.sessionId ?? 'Keine';
        statusToken.textContent = state.tokenConfigured ? 'Konfiguriert' : 'Nicht gesetzt';
        statusLogin.textContent = state.lastLogin
          ? state.lastLogin.email + ' (bis ' + state.lastLogin.expiresAt + ')'
          : '–';
        document.querySelectorAll('[data-sync-session="true"]').forEach((input) => {
          if (input instanceof HTMLInputElement && !input.value) {
            input.value = state.sessionId ?? '';
          }
        });
      }

      function parseOptionalJsonInput(raw) {
        if (!raw || !raw.trim()) {
          return undefined;
        }
        try {
          return JSON.parse(raw);
        } catch (error) {
          throw new Error('Ungültiges JSON: ' + (error instanceof Error ? error.message : String(error)));
        }
      }

      function resolveSessionId(explicit) {
        const value = explicit?.toString().trim();
        const sessionId = value || state.sessionId;
        if (!sessionId) {
          throw new Error('Bitte zuerst eine Session erstellen oder eine Session-ID angeben.');
        }
        return sessionId;
      }

      function setGeneratorStatus(text, variant = 'neutral') {
        if (!generatorStatusElement) {
          return;
        }
        generatorStatusElement.textContent = text;
        generatorStatusElement.dataset.variant = variant;
      }

      function calculateTotalAttachmentChars() {
        if (!generatorAttachmentContainer) {
          return 0;
        }
        let total = 0;
        generatorAttachmentContainer
          .querySelectorAll('textarea[name="content"]')
          .forEach((field) => {
            if (field instanceof HTMLTextAreaElement) {
              total += field.value.length;
            }
          });
        return total;
      }

      function syncGeneratorIdleStatus() {
        if (!generatorStatusElement || generatorBusy) {
          return;
        }
        const count = generatorAttachmentContainer?.childElementCount ?? 0;
        const totalChars = calculateTotalAttachmentChars();
        const attachmentSummary =
          count === 0 ? 'keine Anhänge' : count + ' Anhang' + (count === 1 ? '' : 'e');
        const charSummary = totalChars > 0 ? ', ' + totalChars + ' Zeichen' : '';
        setGeneratorStatus('Bereit — ' + attachmentSummary + charSummary, 'neutral');
      }

      function updateGeneratorAddButtonState() {
        if (!generatorAddButton || !generatorAttachmentContainer) {
          return;
        }
        const count = generatorAttachmentContainer.childElementCount;
        generatorAddButton.disabled = count >= toolGeneratorLimits.maxAttachments;
      }

      function refreshAttachmentIndices() {
        if (!generatorAttachmentContainer) {
          return;
        }
        const items = generatorAttachmentContainer.querySelectorAll('.attachment-item');
        items.forEach((item, index) => {
          const indexEl = item.querySelector('.attachment-index');
          if (indexEl) {
            indexEl.textContent = 'Anhang ' + (index + 1);
          }
        });
      }

      function updateGeneratorAttachmentState() {
        refreshAttachmentIndices();
        updateGeneratorAddButtonState();
        if (!generatorStatusElement || generatorStatusElement.dataset.variant !== 'neutral') {
          return;
        }
        syncGeneratorIdleStatus();
      }

      function createAttachmentItem() {
        if (!generatorAttachmentContainer) {
          throw new Error('Attachment-Liste nicht initialisiert.');
        }
        const wrapper = document.createElement('div');
        wrapper.className = 'attachment-item';
        wrapper.innerHTML = ${JSON.stringify(ATTACHMENT_ITEM_TEMPLATE)};

        const contentField = wrapper.querySelector('textarea[name="content"]');
        const charCount = wrapper.querySelector('.char-count');
        if (contentField instanceof HTMLTextAreaElement && charCount instanceof HTMLElement) {
          contentField.setAttribute('maxlength', String(toolGeneratorLimits.maxAttachmentChars));
          const updateCharCount = () => {
            const length = contentField.value.length;
            charCount.textContent =
              length + ' / ' + toolGeneratorLimits.maxAttachmentChars + ' Zeichen';
            charCount.style.color =
              length > toolGeneratorLimits.maxAttachmentChars ? '#be123c' : 'rgba(27, 51, 140, 0.7)';
            if (generatorStatusElement?.dataset.variant === 'neutral') {
              syncGeneratorIdleStatus();
            }
          };
          contentField.addEventListener('input', updateCharCount);
          updateCharCount();
        }

        const removeButton = wrapper.querySelector('[data-action="remove"]');
        if (removeButton instanceof HTMLButtonElement) {
          removeButton.addEventListener('click', () => {
            wrapper.remove();
            updateGeneratorAttachmentState();
          });
        }

        return wrapper;
      }

      function collectToolGeneratorAttachments() {
        if (!generatorAttachmentContainer) {
          return [];
        }
        const items = Array.from(generatorAttachmentContainer.querySelectorAll('.attachment-item'));
        const attachments = [];
        let totalChars = 0;

        for (const [index, item] of items.entries()) {
          const filenameInput = item.querySelector('input[name="filename"]');
          const mimeInput = item.querySelector('input[name="mimeType"]');
          const weightInput = item.querySelector('input[name="weight"]');
          const descriptionInput = item.querySelector('textarea[name="description"]');
          const contentInput = item.querySelector('textarea[name="content"]');

          const filename = filenameInput instanceof HTMLInputElement ? filenameInput.value.trim() : '';
          if (!filename) {
            throw new Error('Anhang ' + (index + 1) + ' benötigt einen Dateinamen.');
          }

          const content = contentInput instanceof HTMLTextAreaElement ? contentInput.value : '';
          if (!content || content.trim().length === 0) {
            throw new Error('Anhang "' + filename + '" darf keinen leeren Inhalt haben.');
          }

          if (content.length > toolGeneratorLimits.maxAttachmentChars) {
            throw new Error(
              'Anhang "' +
                filename +
                '" überschreitet die maximale Länge von ' +
                toolGeneratorLimits.maxAttachmentChars +
                ' Zeichen.'
            );
          }

          totalChars += content.length;

          const attachment = {
            filename,
            content
          };

          if (mimeInput instanceof HTMLInputElement && mimeInput.value.trim()) {
            attachment.mimeType = mimeInput.value.trim();
          }

          if (descriptionInput instanceof HTMLTextAreaElement && descriptionInput.value.trim()) {
            attachment.description = descriptionInput.value.trim();
          }

          if (weightInput instanceof HTMLInputElement && weightInput.value.trim()) {
            const weight = Number.parseFloat(weightInput.value);
            if (!Number.isFinite(weight) || weight < 0 || weight > 1) {
              throw new Error(
                'Anhang "' +
                  filename +
                  '" besitzt eine ungültige Gewichtung. Erlaubt ist ein Wert zwischen 0 und 1.'
              );
            }
            attachment.weight = weight;
          }

          attachments.push(attachment);
        }

        if (attachments.length > toolGeneratorLimits.maxAttachments) {
          throw new Error(
            'Zu viele Anhänge ausgewählt. Maximal ' +
              toolGeneratorLimits.maxAttachments +
              ' erlaubt.'
          );
        }

        if (totalChars > toolGeneratorLimits.maxTotalChars) {
          throw new Error(
            'Gesamtlänge der Anhänge (' +
              totalChars +
              ' Zeichen) überschreitet das Limit von ' +
              toolGeneratorLimits.maxTotalChars +
              ' Zeichen.'
          );
        }

        return attachments;
      }

      function initializeToolGeneratorUI() {
        generatorAttachmentContainer = document.getElementById('generator-attachments');
        generatorAddButton = document.getElementById('add-attachment');
        generatorStatusElement = document.getElementById('tool-generator-status');
        generatorFormElement = document.getElementById('tool-generator-form');

        if (
          !generatorAttachmentContainer ||
          !generatorAddButton ||
          !generatorStatusElement ||
          !generatorFormElement
        ) {
          return;
        }

        generatorStatusElement.dataset.variant = 'neutral';

        generatorAddButton.addEventListener('click', () => {
          if (generatorAttachmentContainer.childElementCount >= toolGeneratorLimits.maxAttachments) {
            setGeneratorStatus(
              'Maximal ' + toolGeneratorLimits.maxAttachments + ' Anhänge erlaubt.',
              'error'
            );
            setTimeout(() => {
              setGeneratorStatus('Bereit', 'neutral');
              syncGeneratorIdleStatus();
            }, 2500);
            return;
          }
          const item = createAttachmentItem();
          generatorAttachmentContainer.appendChild(item);
          updateGeneratorAttachmentState();
        });

        generatorFormElement.addEventListener('reset', () => {
          generatorAttachmentContainer.innerHTML = '';
          updateGeneratorAttachmentState();
        });

        updateGeneratorAttachmentState();
      }

      function attachFormHandler(id, submit, fallbackOutputId) {
        const form = document.getElementById(id);
        if (!form) {
          return;
        }
        form.addEventListener('submit', async (event) => {
          event.preventDefault();
          const formData = new FormData(form);
          let payload;
          try {
            payload = await submit(formData);
            if (!payload) {
              return;
            }
            setOutput(payload.outputId, payload.data);
            if (payload.statusUpdate) {
              Object.assign(state, payload.statusUpdate);
              updateStatus();
            }
          } catch (error) {
            const defaultOutput =
              payload?.outputId ?? fallbackOutputId ?? form.dataset.outputId ?? 'login-output';
            setOutput(defaultOutput, {
              error: error instanceof Error ? error.message : String(error)
            });
          }
        });
      }

      initializeToolGeneratorUI();

      attachFormHandler('login-form', async (formData) => {
        const persist = formData.get('persist') !== null;
        const response = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.get('email'),
            password: formData.get('password'),
            persistToken: persist
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Login fehlgeschlagen');
        }
        state.tokenConfigured = true;
        state.lastLogin = { email: formData.get('email'), expiresAt: data.data?.expiresAt };
        return { outputId: 'login-output', data, statusUpdate: { lastLogin: state.lastLogin } };
  }, 'login-output');

      attachFormHandler('session-create-form', async (formData) => {
        const payload = {};
        if (formData.get('ttl')) {
          payload.ttlMinutes = Number.parseInt(formData.get('ttl'));
        }
        if (formData.get('preferences')) {
          payload.preferences = parseOptionalJsonInput(formData.get('preferences'));
        }
        if (formData.get('context')) {
          payload.contextSettings = parseOptionalJsonInput(formData.get('context'));
        }
        const response = await fetch('/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Session konnte nicht erstellt werden');
        }
        state.sessionId = data.data?.sessionId ?? null;
        return { outputId: 'session-output', data, statusUpdate: { sessionId: state.sessionId } };
  }, 'session-output');

      attachFormHandler('session-load-form', async (formData) => {
        const sessionId = resolveSessionId(formData.get('sessionId'));
        const response = await fetch('/sessions/' + encodeURIComponent(sessionId));
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Session konnte nicht geladen werden');
        }
        state.sessionId = data.data?.sessionId ?? sessionId;
        return { outputId: 'session-load-output', data, statusUpdate: { sessionId: state.sessionId } };
  }, 'session-load-output');

      attachFormHandler('session-delete-form', async (formData) => {
        const sessionId = resolveSessionId(formData.get('sessionId'));
        const response = await fetch('/sessions/' + encodeURIComponent(sessionId), {
          method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Session konnte nicht gelöscht werden');
        }
        if (state.sessionId === sessionId) {
          state.sessionId = null;
        }
        return { outputId: 'session-delete-output', data, statusUpdate: { sessionId: state.sessionId } };
  }, 'session-delete-output');

      attachFormHandler('search-form', async (formData) => {
        const sessionId = resolveSessionId(formData.get('sessionId'));
        const response = await fetch('/semantic-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            query: formData.get('query'),
            options: parseOptionalJsonInput(formData.get('options'))
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Suche fehlgeschlagen');
        }
        return { outputId: 'search-output', data };
  }, 'search-output');

      attachFormHandler('chat-form', async (formData) => {
        const sessionId = resolveSessionId(formData.get('sessionId'));
        const response = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: formData.get('message'),
            contextSettings: parseOptionalJsonInput(formData.get('context')),
            timelineId: formData.get('timeline') || undefined
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Nachricht konnte nicht gesendet werden');
        }
        return { outputId: 'chat-output', data };
  }, 'chat-output');

      attachFormHandler('reasoning-form', async (formData) => {
        const sessionId = resolveSessionId(formData.get('sessionId'));
        const response = await fetch('/reasoning/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            query: formData.get('query'),
            messages: parseOptionalJsonInput(formData.get('messages')),
            contextSettings: parseOptionalJsonInput(formData.get('context')),
            preferencesOverride: parseOptionalJsonInput(formData.get('preferences')),
            overridePipeline: parseOptionalJsonInput(formData.get('pipeline')),
            useDetailedIntentAnalysis: formData.get('detailedIntent') !== null
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Reasoning fehlgeschlagen');
        }
        return { outputId: 'reasoning-output', data };
      }, 'reasoning-output');

  attachFormHandler('context-form', async (formData) => {
        const sessionId = resolveSessionId(formData.get('sessionId'));
        const response = await fetch('/context/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            query: formData.get('query'),
            messages: parseOptionalJsonInput(formData.get('messages')),
            contextSettingsOverride: parseOptionalJsonInput(formData.get('context'))
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Kontextauflösung fehlgeschlagen');
        }
        return { outputId: 'context-output', data };
      }, 'context-output');

  attachFormHandler('clarification-form', async (formData) => {
        const sessionId = resolveSessionId(formData.get('sessionId'));
        const response = await fetch('/clarification/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            query: formData.get('query'),
            includeEnhancedQuery: formData.get('enhancedQuery') !== null
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Analyse fehlgeschlagen');
        }
        return { outputId: 'clarification-output', data };
      }, 'clarification-output');

      attachFormHandler('tool-generator-form', async (formData) => {
        if (!generatorFormElement) {
          throw new Error('Tool-Generator Formular nicht initialisiert.');
        }
        const submitButton = generatorFormElement.querySelector('button[type="submit"]');
        if (submitButton instanceof HTMLButtonElement) {
          submitButton.disabled = true;
        }
        generatorBusy = true;
        setGeneratorStatus('Generiere…', 'progress');
        try {
          const sessionId = resolveSessionId(formData.get('sessionId'));
          const queryValue = (formData.get('prompt') ?? '').toString().trim();
          if (!queryValue) {
            throw new Error('Bitte eine Aufgabenbeschreibung eingeben.');
          }

          const inputModeRaw = (formData.get('inputMode') ?? '').toString().trim();
          const attachments = collectToolGeneratorAttachments();

          const payload = {
            sessionId,
            query: queryValue
          };

          if (inputModeRaw) {
            payload.preferredInputMode = inputModeRaw;
          }
          if (attachments.length > 0) {
            payload.attachments = attachments;
          }

          const response = await fetch('/tool-generator', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await response.json();
          if (!response.ok) {
            const errorMessage = data?.error ?? 'Toolscript-Generierung fehlgeschlagen';
            throw new Error(errorMessage);
          }

          const payloadData = data?.data ?? data;
          if (payloadData && typeof payloadData === 'object') {
            const scriptOutput =
              typeof payloadData.code === 'string' ? payloadData.code : payloadData;
            setOutput('tool-generator-output', scriptOutput);
            const metadata = Object.assign({}, payloadData);
            if (typeof metadata.code === 'string') {
              delete metadata.code;
            }
            if (Array.isArray(metadata.attachments)) {
              metadata.attachments = metadata.attachments.map((attachment) => ({
                filename: attachment.filename,
                mimeType: attachment.mimeType ?? null,
                description: attachment.description ?? null,
                weight: attachment.weight ?? null,
                contentLength:
                  typeof attachment.content === 'string' ? attachment.content.length : null
              }));
            }
            setOutput('tool-generator-meta', metadata);
          } else {
            setOutput('tool-generator-output', data);
            setOutput('tool-generator-meta', data);
          }

          setGeneratorStatus('Fertig', 'success');
          setTimeout(() => {
            setGeneratorStatus('Bereit', 'neutral');
            updateGeneratorAttachmentState();
          }, 2000);
          return null;
        } catch (error) {
          setGeneratorStatus(
            error instanceof Error ? 'Fehler: ' + error.message : 'Unbekannter Fehler',
            'error'
          );
          setTimeout(() => {
            setGeneratorStatus('Bereit', 'neutral');
            updateGeneratorAttachmentState();
          }, 4000);
          throw error;
        } finally {
          generatorBusy = false;
          if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = false;
          }
          updateGeneratorAttachmentState();
        }
      }, 'tool-generator-output');

      attachFormHandler('analyze-form', async (formData) => {
        const statusIndicator = document.getElementById('analysis-status');
        try {
          if (statusIndicator) {
            statusIndicator.textContent = 'Läuft...';
          }
          const sessionId = resolveSessionId(formData.get('sessionId'));
          const response = await fetch('/analysis/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: formData.get('message') })
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error ?? 'Analyse fehlgeschlagen');
          }
          if (statusIndicator) {
            statusIndicator.textContent = 'Bereit';
          }
          setOutput('analysis-output', data.result ?? data);
          setOutput('artifact-output', data.artifactSuggestion ?? 'Kein Vorschlag verfügbar.');
        } catch (error) {
          if (statusIndicator) {
            statusIndicator.textContent = 'Fehler';
          }
          throw error;
        }
      });

      // EDIFACT Message Analyzer Handlers (Version 0.7.0)
      attachFormHandler('edifact-analyze-form', async (formData) => {
        const response = await fetch('/edifact/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: formData.get('message') })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Analyse fehlgeschlagen');
        }
        return { outputId: 'edifact-analyze-output', data };
      }, 'edifact-analyze-output');

      attachFormHandler('edifact-validate-form', async (formData) => {
        const response = await fetch('/edifact/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: formData.get('message') })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Validierung fehlgeschlagen');
        }
        return { outputId: 'edifact-validate-output', data };
      }, 'edifact-validate-output');

      attachFormHandler('edifact-explain-form', async (formData) => {
        const response = await fetch('/edifact/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: formData.get('message') })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Erklärung fehlgeschlagen');
        }
        return { outputId: 'edifact-explain-output', data };
      }, 'edifact-explain-output');

      attachFormHandler('edifact-modify-form', async (formData) => {
        const response = await fetch('/edifact/modify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instruction: formData.get('instruction'),
            currentMessage: formData.get('message')
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Modifikation fehlgeschlagen');
        }
        return { outputId: 'edifact-modify-output', data };
      }, 'edifact-modify-output');

      attachFormHandler('edifact-chat-form', async (formData) => {
        const response = await fetch('/edifact/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: formData.get('query'),
            currentEdifactMessage: formData.get('message')
          })
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? 'Chat fehlgeschlagen');
        }
        return { outputId: 'edifact-chat-output', data };
      }, 'edifact-chat-output');

      updateStatus();`;

  return script;
}
