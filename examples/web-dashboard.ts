import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { parse } from 'node:url';
import { WilliMakoClient, WilliMakoError } from '../src/index.js';
import type {
  ClarificationAnalyzeRequest,
  ContextResolveRequest,
  ReasoningGenerateRequest
} from '../src/types.js';

const PORT = Number.parseInt(process.env.PORT ?? '4173', 10);
const client = new WilliMakoClient();
const baseUrl = client.getBaseUrl();
const bootstrapState = JSON.stringify({
  tokenConfigured: Boolean(process.env.WILLI_MAKO_TOKEN),
  baseUrl
});

let lastLoginInfo: { email: string; expiresAt: string } | null = null;

const HTML_PAGE = `<!DOCTYPE html>
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
      textarea:focus {
        outline: none;
        border-color: #4f7df3;
        box-shadow: 0 0 0 4px rgba(79, 125, 243, 0.2);
      }
      .inline-controls {
        display: flex;
        gap: 0.9rem;
        align-items: center;
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
          <span id="base-url-status">${baseUrl}</span>
        </div>
        <div class="badge">
          <strong>Token</strong>
          <span id="token-status">${process.env.WILLI_MAKO_TOKEN ? 'Konfiguriert (ENV)' : 'Nicht gesetzt'}</span>
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

      <section class="card">
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
    </main>

    <script>
      const bootstrap = ${bootstrapState};
      const state = {
        sessionId: null,
        tokenConfigured: bootstrap.tokenConfigured,
        lastLogin: null,
        baseUrl: bootstrap.baseUrl
      };

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

      async function callApi(path, { method = 'POST', body } = {}) {
        const headers = { Accept: 'application/json' };
        const init = { method, headers };
        if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
          headers['Content-Type'] = 'application/json';
          init.body = JSON.stringify(body);
        }
        const response = await fetch(path, init);
        const text = await response.text();
        let data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (error) {
            throw new Error('Antwort konnte nicht als JSON gelesen werden.');
          }
        }
        if (!response.ok) {
          const error = new Error(data?.error ?? \
              'Request fehlgeschlagen (' + response.status + ')');
          error.details = data;
          error.status = response.status;
          throw error;
        }
        return data;
      }

      document.getElementById('login-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const formData = new FormData(form);
        try {
          setOutput('login-output', '⏳ Login läuft …');
          const persistToken = formData.get('persist') !== null;
          const response = await callApi('/login', {
            body: {
              email: formData.get('email'),
              password: formData.get('password'),
              persistToken
            }
          });
          state.tokenConfigured = persistToken ? true : state.tokenConfigured;
          state.lastLogin = {
            email: String(formData.get('email')),
            expiresAt: response?.data?.expiresAt ?? 'unbekannt'
          };
          setOutput('login-output', response);
        } catch (error) {
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('login-output', payload);
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      document.getElementById('session-create-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const formData = new FormData(form);
        try {
          setOutput('session-output', '⏳ Erstelle Session …');
          const payload = {};
          const ttl = formData.get('ttl');
          if (ttl) {
            payload.ttlMinutes = Number(ttl);
          }
          const preferences = formData.get('preferences');
          if (preferences) {
            payload.preferences = parseOptionalJsonInput(String(preferences));
          }
          const context = formData.get('context');
          if (context) {
            payload.contextSettings = parseOptionalJsonInput(String(context));
          }
          const response = await callApi('/sessions', { body: payload });
          state.sessionId = response?.data?.sessionId ?? state.sessionId;
          setOutput('session-output', response);
        } catch (error) {
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('session-output', payload);
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      document.getElementById('session-load-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const formData = new FormData(form);
        try {
          const sessionId = formData.get('sessionId');
          if (!sessionId) {
            throw new Error('Session-ID ist erforderlich.');
          }
          setOutput('session-load-output', '⏳ Lade Session …');
          const response = await callApi('/sessions/' + sessionId, { method: 'GET' });
          state.sessionId = response?.data?.sessionId ?? String(sessionId);
          setOutput('session-load-output', response);
        } catch (error) {
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('session-load-output', payload);
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      document.getElementById('session-delete-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const formData = new FormData(form);
        try {
          const sessionId = formData.get('sessionId');
          if (!sessionId) {
            throw new Error('Session-ID ist erforderlich.');
          }
          setOutput('session-delete-output', '⏳ Lösche Session …');
          const response = await callApi('/sessions/' + sessionId, { method: 'DELETE' });
          if (state.sessionId === sessionId) {
            state.sessionId = null;
          }
          setOutput('session-delete-output', response ?? { success: true });
        } catch (error) {
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('session-delete-output', payload);
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      document.getElementById('search-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const formData = new FormData(form);
        try {
          setOutput('search-output', '⏳ Suche läuft …');
          const sessionId = resolveSessionId(formData.get('sessionId'));
          const payload = {
            sessionId,
            query: formData.get('query')
          };
          const options = formData.get('options');
          if (options) {
            payload.options = parseOptionalJsonInput(String(options));
          }
          const response = await callApi('/semantic-search', { body: payload });
          setOutput('search-output', response);
        } catch (error) {
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('search-output', payload);
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      document.getElementById('chat-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const formData = new FormData(form);
        try {
          setOutput('chat-output', '⏳ Nachricht wird gesendet …');
          const sessionId = resolveSessionId(formData.get('sessionId'));
          const payload = {
            sessionId,
            message: formData.get('message'),
            timelineId: formData.get('timeline') || undefined
          };
          const context = formData.get('context');
          if (context) {
            payload.contextSettings = parseOptionalJsonInput(String(context));
          }
          const response = await callApi('/chat', { body: payload });
          setOutput('chat-output', response);
        } catch (error) {
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('chat-output', payload);
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      document.getElementById('reasoning-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const formData = new FormData(form);
        try {
          setOutput('reasoning-output', '⏳ Reasoning läuft …');
          const sessionId = resolveSessionId(formData.get('sessionId'));
          const payload = {
            sessionId,
            query: formData.get('query')
          };
          const messages = formData.get('messages');
          if (messages) {
            payload.messages = parseOptionalJsonInput(String(messages));
          }
          const context = formData.get('context');
          if (context) {
            payload.contextSettingsOverride = parseOptionalJsonInput(String(context));
          }
          const preferences = formData.get('preferences');
          if (preferences) {
            payload.preferencesOverride = parseOptionalJsonInput(String(preferences));
          }
          const pipeline = formData.get('pipeline');
          if (pipeline) {
            payload.overridePipeline = parseOptionalJsonInput(String(pipeline));
          }
          if (formData.get('detailedIntent') !== null) {
            payload.useDetailedIntentAnalysis = true;
          }
          const response = await callApi('/reasoning/generate', { body: payload });
          setOutput('reasoning-output', response);
        } catch (error) {
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('reasoning-output', payload);
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      document.getElementById('context-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const formData = new FormData(form);
        try {
          setOutput('context-output', '⏳ Kontextauflösung läuft …');
          const sessionId = resolveSessionId(formData.get('sessionId'));
          const payload = {
            sessionId,
            query: formData.get('query')
          };
          const messages = formData.get('messages');
          if (messages) {
            payload.messages = parseOptionalJsonInput(String(messages));
          }
          const context = formData.get('context');
          if (context) {
            payload.contextSettingsOverride = parseOptionalJsonInput(String(context));
          }
          const response = await callApi('/context/resolve', { body: payload });
          setOutput('context-output', response);
        } catch (error) {
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('context-output', payload);
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      document.getElementById('clarification-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const formData = new FormData(form);
        try {
          setOutput('clarification-output', '⏳ Analyse läuft …');
          const sessionId = resolveSessionId(formData.get('sessionId'));
          const payload = {
            sessionId,
            query: formData.get('query'),
            includeEnhancedQuery: formData.get('enhancedQuery') !== null
          };
          const response = await callApi('/clarification/analyze', { body: payload });
          setOutput('clarification-output', response);
        } catch (error) {
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('clarification-output', payload);
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      document.getElementById('analyze-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('button[type="submit"]');
        submit?.setAttribute('disabled', 'true');
        const status = document.getElementById('analysis-status');
        const formData = new FormData(form);
        try {
          status.textContent = 'Analyse läuft …';
          setOutput('analysis-output', '⏳ Warte auf Ergebnis …');
          setOutput('artifact-output', '⏳ Warte auf Empfehlung …');
          const sessionId = resolveSessionId(formData.get('sessionId'));
          const response = await callApi('/analyze', {
            body: {
              sessionId,
              message: formData.get('message')
            }
          });
          status.textContent = 'Status: ' + (response.status ?? 'unbekannt');
          setOutput('analysis-output', response.result ?? 'Keine Ausgabe');
          setOutput('artifact-output', response.artifactSuggestion ?? 'Keine Empfehlung');
        } catch (error) {
          status.textContent = 'Fehler';
          const payload = error instanceof Error
            ? { error: error.message, details: error.details ?? null }
            : { error: String(error) };
          setOutput('analysis-output', payload);
          setOutput('artifact-output', '—');
        } finally {
          submit?.removeAttribute('disabled');
          updateStatus();
        }
      });

      updateStatus();
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
      handleApiError(res, error);
    }
    return;
  }

  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () => {
  const tokenPresent = Boolean(process.env.WILLI_MAKO_TOKEN);
  console.log(`Willi-Mako Dashboard läuft unter http://localhost:${PORT}`);
  console.log(`➡️  Verbunden mit ${baseUrl}`);
  if (!tokenPresent) {
    console.warn(
      '⚠️  Kein WILLI_MAKO_TOKEN gesetzt. Login oder persistente Tokens sind erforderlich.'
    );
  }
  if (lastLoginInfo) {
    console.log(`Letzter Login: ${lastLoginInfo.email} (gültig bis ${lastLoginInfo.expiresAt})`);
  }
});
