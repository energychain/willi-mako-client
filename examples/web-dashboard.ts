import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { parse } from 'node:url';
import { WilliMakoClient, WilliMakoError } from '../src/index.js';

const PORT = Number.parseInt(process.env.PORT ?? '4173', 10);
const client = new WilliMakoClient();

const HTML_PAGE = `<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <title>Willi-Mako Web Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light dark;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        background: radial-gradient(circle at top, #f3f6ff, #e6ecff);
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: stretch;
      }
      main {
        max-width: 960px;
        width: 100%;
        margin: 3rem 1.5rem;
        background: rgba(255, 255, 255, 0.92);
        padding: 2.5rem;
        border-radius: 24px;
        box-shadow: 0 30px 60px rgba(27, 51, 140, 0.15);
        backdrop-filter: blur(4px);
      }
      h1 {
        margin-top: 0;
        font-size: clamp(2rem, 4vw, 2.8rem);
        color: #1b338c;
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      h1 span {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        border-radius: 12px;
        background: linear-gradient(135deg, #1b338c, #4f7df3);
        color: #fff;
        font-weight: 600;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1.5rem;
      }
      textarea {
        width: 100%;
        min-height: 220px;
        border-radius: 16px;
        border: 1px solid rgba(27, 51, 140, 0.15);
        padding: 1.2rem;
        font-size: 1rem;
        line-height: 1.5;
        resize: vertical;
        background: rgba(255, 255, 255, 0.85);
      }
      textarea:focus {
        outline: none;
        border-color: #4f7df3;
        box-shadow: 0 0 0 4px rgba(79, 125, 243, 0.18);
      }
      button {
        appearance: none;
        border: none;
        border-radius: 999px;
        padding: 0.9rem 1.6rem;
        background: linear-gradient(135deg, #4f7df3, #1b338c);
        color: #fff;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        box-shadow: 0 15px 30px rgba(79, 125, 243, 0.3);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      button:disabled {
        background: linear-gradient(135deg, #9aa9d9, #6f7bb0);
        box-shadow: none;
        cursor: not-allowed;
      }
      button:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 40px rgba(27, 51, 140, 0.35);
      }
      pre {
        background: rgba(27, 51, 140, 0.08);
        color: #0f1b45;
        padding: 1.2rem;
        border-radius: 16px;
        font-size: 0.95rem;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 0.9rem;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        background: rgba(27, 51, 140, 0.12);
        color: #1b338c;
      }
      .status[data-state="succeeded"] {
        background: rgba(93, 199, 101, 0.18);
        color: #1a6636;
      }
      .status[data-state="failed"] {
        background: rgba(236, 72, 108, 0.15);
        color: #8b1d3f;
      }
      footer {
        margin-top: 2.5rem;
        font-size: 0.85rem;
        color: rgba(27, 51, 140, 0.7);
        text-align: center;
      }
      @media (max-width: 640px) {
        main {
          margin: 1.5rem 1rem;
          padding: 1.6rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1><span>⚡</span>Willi-Mako Web Dashboard</h1>
      <p>Validiere UTILMD, MSCONS und andere Marktkommunikationsnachrichten ohne lokale Installation. Der Server nutzt das Willi-Mako SDK und erstellt Sandbox-Jobs im Hintergrund.</p>

      <form id="analyze-form">
        <label for="message">EDIFACT / Marktkommunikationsmessage</label>
        <textarea id="message" name="message" placeholder="UNH+1+UTILMD:D:04B:UN:2.3e..." required></textarea>
        <div style="display:flex; gap:0.8rem; align-items:center; margin-top:1rem;">
          <button type="submit">
            <span>🚀</span>
            Analyse starten
          </button>
          <span id="status" class="status" data-state="idle">Bereit</span>
        </div>
      </form>

      <section style="margin-top:2.5rem;">
        <h2>Ausgabe</h2>
        <pre id="output">Noch keine Analyse durchgeführt.</pre>
      </section>

      <section style="margin-top:2.5rem;">
        <h2>Artefakt-Vorschlag</h2>
        <pre id="artifact">Wird nach erfolgreicher Analyse vorgeschlagen.</pre>
      </section>

      <footer>
        Hinweis: Token wird ausschließlich serverseitig verwendet. Stellen Sie sicher, dass <code>WILLI_MAKO_TOKEN</code> gesetzt ist.
      </footer>
    </main>

    <script>
      const form = document.getElementById('analyze-form');
      const outputEl = document.getElementById('output');
      const artifactEl = document.getElementById('artifact');
      const statusEl = document.getElementById('status');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = new FormData(form).get('message');
        if (!message) {
          return;
        }

        statusEl.dataset.state = 'running';
        statusEl.textContent = 'Analyse läuft …';
        form.querySelector('button').disabled = true;
        outputEl.textContent = '⏳ Warte auf Ergebnis…';
        artifactEl.textContent = '⏳ Warte auf Empfehlung…';

        try {
          const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
          });

          const payload = await response.json();
          statusEl.dataset.state = payload.status ?? 'unknown';
          statusEl.textContent = 'Status: ' + (payload.status ?? 'unbekannt');
          outputEl.textContent = payload.result ?? '—';
          artifactEl.textContent = payload.artifactSuggestion ?? 'Keine Empfehlung verfügbar.';
        } catch (error) {
          statusEl.dataset.state = 'failed';
          statusEl.textContent = 'Fehler';
          outputEl.textContent = String(error);
          artifactEl.textContent = '—';
        } finally {
          form.querySelector('button').disabled = false;
        }
      });
    </script>
  </body>
</html>`;

type AnalyzeRequest = {
  message: string;
  sessionId?: string;
};

type AnalyzeResponse = {
  status: string;
  result?: string;
  artifactSuggestion?: string;
  jobId?: string;
};

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

async function waitForJob(jobId: string) {
  let attempt = 0;
  const maxAttempts = 15;
  while (attempt < maxAttempts) {
    const job = await client.getToolJob(jobId);
    const state = job.data.job.status;
    if (state === 'succeeded' || state === 'failed') {
      return job.data.job;
    }
    attempt += 1;
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error('Zeitüberschreitung beim Abfragen des Job-Status.');
}

const server = createServer(async (req, res) => {
  const url = parse(req.url ?? '/', true);

  if (req.method === 'GET' && url.pathname === '/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(HTML_PAGE);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/healthz') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true, timestamp: new Date().toISOString() }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/analyze') {
    try {
      const payload = (await parseJsonBody(req)) as AnalyzeRequest | null;
      if (!payload?.message) {
        sendJson(res, 400, { error: 'Feld "message" ist erforderlich.' });
        return;
      }

      const sessionId = payload.sessionId ?? `web-dashboard-${Date.now()}`;
      const script = `
        const message = ${JSON.stringify(payload.message)};
        const segments = message.split('+');
        const type = segments[1] ?? null;
        const metadata = {
          type,
          segmentCount: segments.length,
          preview: segments.slice(0, 5)
        };
        console.log(JSON.stringify({ messageType: type, segments, metadata }, null, 2));
      `;

      const job = await client.createNodeScriptJob({
        sessionId,
        source: script,
        timeoutMs: 10_000,
        metadata: { origin: 'web-dashboard', purpose: 'quick-analysis' }
      });

      const finishedJob = await waitForJob(job.data.job.id);
      const result = finishedJob.result?.stdout ?? finishedJob.result?.stderr ?? null;

      const response: AnalyzeResponse = {
        status: finishedJob.status,
        result: result ?? 'Keine Ausgabe.',
        artifactSuggestion: JSON.stringify(
          {
            sessionId,
            type: 'analysis-report',
            name: `analysis-${sessionId}.json`,
            mimeType: 'application/json',
            encoding: 'utf8',
            tags: ['web-dashboard', 'preview'],
            content: finishedJob.result?.stdout ?? '{}'
          },
          null,
          2
        ),
        jobId: finishedJob.id
      };

      sendJson(res, 200, response);
    } catch (error) {
      if (error instanceof WilliMakoError) {
        sendJson(res, error.status ?? 500, {
          status: 'failed',
          error: 'API-Fehler',
          details: error.body
        });
        return;
      }
      sendJson(res, 500, {
        status: 'failed',
        error: (error as Error).message ?? 'Unbekannter Fehler'
      });
    }
    return;
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () => {
  const tokenPresent = Boolean(process.env.WILLI_MAKO_TOKEN);
  console.log(`Willi-Mako Dashboard läuft unter http://localhost:${PORT}`);
  if (!tokenPresent) {
    console.warn('⚠️  Kein WILLI_MAKO_TOKEN gesetzt. Anfragen werden fehlschlagen.');
  }
});
