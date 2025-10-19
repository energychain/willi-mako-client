import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BASE_URL,
  WilliMakoClient,
  WilliMakoError,
  bundledOpenApiDocument
} from '../src/index.js';
import type {
  RunNodeScriptJobRequest,
  CreateArtifactRequest,
  GenerateToolScriptRequest
} from '../src/types.js';

const createFetchMock = () =>
  vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

describe('WilliMakoClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('exposes the bundled OpenAPI document', () => {
      const client = new WilliMakoClient();
      expect(client.getBundledOpenApiDocument()).toEqual(bundledOpenApiDocument);
    });

    it('uses the default productive base URL when none is provided', () => {
      const client = new WilliMakoClient();
      expect(client.getBaseUrl()).toBe(DEFAULT_BASE_URL);
    });

    it('accepts a custom base URL', () => {
      const customUrl = 'http://localhost:3000/api/v2';
      const client = new WilliMakoClient({ baseUrl: customUrl });
      expect(client.getBaseUrl()).toBe(customUrl);
    });

    it('falls back to environment variable for token', () => {
      const originalToken = process.env.WILLI_MAKO_TOKEN;
      process.env.WILLI_MAKO_TOKEN = 'env-token';

      const client = new WilliMakoClient();
      expect(client).toBeDefined();

      // Restore original
      if (originalToken) {
        process.env.WILLI_MAKO_TOKEN = originalToken;
      } else {
        delete process.env.WILLI_MAKO_TOKEN;
      }
    });
  });

  describe('Authentication', () => {
    it('creates a tooling job with authorization header', async () => {
      const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
        async () =>
          new Response(
            JSON.stringify({
              success: true,
              data: { sessionId: 's', job: { id: 'job', status: 'queued' } }
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
      );

      const client = new WilliMakoClient({ token: 'secret', fetch: fetchMock });
      const payload: RunNodeScriptJobRequest = {
        sessionId: 'session-id',
        source: 'console.log("test")'
      };

      await client.createNodeScriptJob(payload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] ?? [];
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer secret');
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Error Handling', () => {
    it('throws a WilliMakoError on non-successful responses', async () => {
      const fetchMock = createFetchMock();
      fetchMock.mockImplementation(
        async () =>
          new Response(JSON.stringify({ error: 'forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
      );

      const client = new WilliMakoClient({ token: 'secret', fetch: fetchMock });

      await expect(client.getToolJob('job-1')).rejects.toBeInstanceOf(WilliMakoError);
    });

    it('includes status and body in WilliMakoError', async () => {
      const errorBody = { error: 'Unauthorized', code: 'AUTH_ERROR' };
      const fetchMock = createFetchMock();
      fetchMock.mockImplementation(
        async () =>
          new Response(JSON.stringify(errorBody), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
      );

      const client = new WilliMakoClient({ token: 'invalid', fetch: fetchMock });

      try {
        await client.getToolJob('job-1');
        expect.fail('Should have thrown WilliMakoError');
      } catch (error) {
        expect(error).toBeInstanceOf(WilliMakoError);
        if (error instanceof WilliMakoError) {
          expect(error.status).toBe(401);
          expect(error.body).toEqual(errorBody);
        }
      }
    });
  });

  describe('API Methods', () => {
    it('fetches remote OpenAPI schema', async () => {
      const schema = { info: { title: 'Willi-Mako API', version: '2.0.0' } };
      const fetchMock = createFetchMock();
      fetchMock.mockImplementation(
        async () =>
          new Response(JSON.stringify(schema), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
      );

      const client = new WilliMakoClient({ fetch: fetchMock });
      const result = await client.getRemoteOpenApiDocument();

      expect(result).toEqual(schema);
    });

    it('creates an artifact with all fields', async () => {
      const artifactRequest: CreateArtifactRequest = {
        sessionId: 'session-123',
        type: 'validation-report',
        name: 'report.json',
        mimeType: 'application/json',
        encoding: 'utf8',
        content: JSON.stringify({ valid: true }),
        description: 'Test report',
        version: '1.0.0',
        tags: ['test', 'validation']
      };

      const artifactResponse = {
        success: true,
        data: {
          sessionId: 'session-123',
          artifact: {
            id: 'artifact-789',
            sessionId: 'session-123',
            type: 'validation-report',
            name: 'report.json',
            mimeType: 'application/json',
            byteSize: 16,
            checksum: 'abc123',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            storage: {
              mode: 'inline' as const,
              encoding: 'utf8' as const,
              content: artifactRequest.content
            },
            preview: null,
            description: 'Test report',
            version: '1.0.0',
            tags: ['test', 'validation']
          }
        }
      };

      const fetchMock = createFetchMock();
      fetchMock.mockImplementation(
        async () =>
          new Response(JSON.stringify(artifactResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
      );

      const client = new WilliMakoClient({ token: 'secret', fetch: fetchMock });
      const result = await client.createArtifact(artifactRequest);

      expect(result.success).toBe(true);
      expect(result.data.artifact.name).toBe('report.json');
      expect(result.data.artifact.tags).toEqual(['test', 'validation']);
    });

    it('sends attachments when generating tool scripts', async () => {
      const responsePayload = {
        success: true,
        data: {
          sessionId: 'session-123',
          job: { id: 'job-1', status: 'queued' }
        }
      };

      const fetchMock = createFetchMock();
      fetchMock.mockImplementation(
        async () =>
          new Response(JSON.stringify(responsePayload), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          })
      );

      const client = new WilliMakoClient({ token: 'secret', fetch: fetchMock });
      const request: GenerateToolScriptRequest = {
        sessionId: 'session-123',
        instructions: 'Erstelle ein Tool',
        attachments: [
          {
            filename: 'kontext.md',
            content: '# Kontext',
            description: 'Fachliche Rahmenbedingungen'
          }
        ]
      };

      await client.generateToolScript(request);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] ?? [];
      const payload = init?.body ? JSON.parse(String(init.body)) : null;
      expect(payload).not.toBeNull();
      expect(payload.attachments).toEqual([
        expect.objectContaining({
          filename: 'kontext.md',
          content: '# Kontext',
          description: 'Fachliche Rahmenbedingungen'
        })
      ]);
    });
  });

  describe('Tool generation heuristics', () => {
    it('surfaces MSCONS metadata when UTILMD distractors are filtered', async () => {
      const responsePayload = {
        success: true,
        data: {
          sessionId: 'session-mscons',
          job: {
            id: 'job-mscons',
            type: 'generate-script' as const,
            sessionId: 'session-mscons',
            status: 'succeeded' as const,
            createdAt: '2025-10-19T00:00:00.000Z',
            updatedAt: '2025-10-19T00:00:05.000Z',
            warnings: [],
            progress: {
              stage: 'completed' as const,
              message: 'Skript erfolgreich generiert',
              attempt: 1
            },
            attempts: 1,
            metadata: {
              detectedMessageTypes: ['MSCONS', 'UTILMD'],
              primaryMessageType: 'MSCONS',
              filteredSnippets: ['UTILMD_PSEUDOCODE']
            },
            result: {
              sessionId: 'session-mscons',
              script: {
                code: "module.exports = { run: async () => ({ code: 'success' }) };",
                language: 'javascript' as const,
                entrypoint: 'run' as const,
                description: 'Konvertiert MSCONS in CSV',
                runtime: 'node18' as const,
                deterministic: true,
                dependencies: [] as string[],
                source: {
                  language: 'node' as const,
                  hash: 'abc123',
                  bytes: 256,
                  preview: 'module.exports = { run: async () => ({ code: "success" }) };',
                  lineCount: 3
                },
                validation: {
                  syntaxValid: true,
                  deterministic: true,
                  forbiddenApis: [] as string[],
                  warnings: [] as string[]
                },
                notes: [] as string[]
              },
              expectedOutputDescription: 'CSV-Datei mit Lastgangdaten',
              warnings: ['Fokus: MSCONS – UTILMD Snippets verworfen.'],
              promptEnhancement: {
                engine: 'gemini' as const,
                model: 'gemini-pro',
                originalQuery: 'Konvertiere MSCONS Lastgang in CSV',
                enhancedQuery: 'Konvertiere MSCONS Lastgang in CSV'
              },
              contextSnippets: [
                {
                  id: 'MSCONS.edi#part-1',
                  title: 'Beispiel MSCONS Extrakt',
                  snippet: 'UNH+1+MSCONS:D:04B:UN:2.4c',
                  origin: 'reference',
                  score: 50,
                  weight: 80
                },
                {
                  id: 'knowledge-base-mscons-guide',
                  title: 'MSCONS Leitfaden',
                  snippet: 'Segment-Übersicht MSCONS',
                  origin: 'retrieval',
                  score: 0.92,
                  weight: 60
                }
              ],
              repairHistory: [] as unknown[],
              detectedMessageTypes: ['MSCONS'],
              primaryMessageType: 'MSCONS'
            },
            error: null
          }
        }
      } satisfies Awaited<ReturnType<WilliMakoClient['generateToolScript']>>;

      const fetchMock = createFetchMock();
      fetchMock.mockImplementation(
        async () =>
          new Response(JSON.stringify(responsePayload), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          })
      );

      const client = new WilliMakoClient({ token: 'secret', fetch: fetchMock });
      const request: GenerateToolScriptRequest = {
        sessionId: 'session-mscons',
        instructions: 'Konvertiere MSCONS Lastgang in CSV',
        attachments: [
          {
            filename: 'MSCONS.edi',
            content: 'UNH+1+MSCONS:D:04B:UN:2.4c\nBGM+Z06+12345',
            description: 'Original MSCONS Ausschnitt'
          },
          {
            filename: 'UTILMD-distractor.edi',
            content: 'UNH+1+UTILMD:D:04B:UN:2.3e\nBGM+Z01+6789',
            description: 'Fachfremdes UTILMD Beispiel'
          }
        ]
      };

      const response = await client.generateToolScript(request);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0] ?? [];
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      expect(body?.attachments).toHaveLength(2);

      const job = response.data.job;
      expect(job.metadata?.primaryMessageType).toBe('MSCONS');
      expect(job.metadata?.detectedMessageTypes).toEqual(['MSCONS', 'UTILMD']);

      const snippets = job.result?.contextSnippets ?? [];
      expect(snippets.length).toBeGreaterThanOrEqual(2);
      expect(snippets.some((snippet) => snippet.origin === 'reference')).toBe(true);
      expect(
        snippets.every(
          (snippet) => !/UTILMD/i.test(snippet.id ?? '') && !/UTILMD/i.test(snippet.title ?? '')
        )
      ).toBe(true);
      expect(job.result?.warnings).toContain('Fokus: MSCONS – UTILMD Snippets verworfen.');
    });
  });

  describe('Login workflow', () => {
    it('logs in and persists the received token by default', async () => {
      const loginResponse = {
        success: true,
        data: { accessToken: 'jwt-token', expiresAt: '2025-01-01T00:00:00Z' }
      };

      const jobResponse = {
        success: true,
        data: {
          sessionId: 'session-1',
          job: { id: 'job-1', status: 'queued' }
        }
      };

      const fetchMock = createFetchMock();
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify(loginResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(jobResponse), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          })
        );

      const client = new WilliMakoClient({ fetch: fetchMock });
      await client.login({ email: 'user@example.com', password: 'secret' });
      await client.createNodeScriptJob({ sessionId: 'session-1', source: 'console.log("ok")' });

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const loginCall = fetchMock.mock.calls[0];
      const loginHeaders = new Headers(loginCall?.[1]?.headers);
      expect(loginHeaders.get('Authorization')).toBeNull();

      const jobCall = fetchMock.mock.calls[1];
      const jobHeaders = new Headers(jobCall?.[1]?.headers);
      expect(jobHeaders.get('Authorization')).toBe('Bearer jwt-token');
    });

    it('supports disabling token persistence during login', async () => {
      const loginResponse = {
        success: true,
        data: { accessToken: 'jwt-token', expiresAt: '2025-01-01T00:00:00Z' }
      };

      const jobResponse = {
        success: true,
        data: {
          sessionId: 'session-1',
          job: { id: 'job-1', status: 'queued' }
        }
      };

      const fetchMock = createFetchMock();
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify(loginResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(jobResponse), {
            status: 202,
            headers: { 'Content-Type': 'application/json' }
          })
        );

      const client = new WilliMakoClient({ fetch: fetchMock });
      await client.login(
        { email: 'user@example.com', password: 'secret' },
        { persistToken: false }
      );
      await client.createNodeScriptJob({ sessionId: 'session-1', source: 'console.log("ok")' });

      const loginCall = fetchMock.mock.calls[0];
      const loginHeaders = new Headers(loginCall?.[1]?.headers);
      expect(loginHeaders.get('Authorization')).toBeNull();

      const jobCall = fetchMock.mock.calls[1];
      const jobHeaders = new Headers(jobCall?.[1]?.headers);
      expect(jobHeaders.get('Authorization')).toBeNull();
    });
  });

  describe('Sessions API', () => {
    it('creates, retrieves and deletes sessions', async () => {
      const sessionPayload = {
        success: true,
        data: {
          sessionId: 'session-1',
          userId: 'user-1',
          workspaceContext: {},
          policyFlags: {},
          preferences: {},
          expiresAt: '2025-01-01T00:00:00Z'
        }
      };

      const fetchMock = createFetchMock();
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify(sessionPayload), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(sessionPayload), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        .mockResolvedValueOnce(new Response(null, { status: 204 }));

      const client = new WilliMakoClient({ token: 'secret', fetch: fetchMock });

      const created = await client.createSession({ ttlMinutes: 15 });
      expect(created.data.sessionId).toBe('session-1');

      const retrieved = await client.getSession('session-1');
      expect(retrieved.data.sessionId).toBe('session-1');

      await client.deleteSession('session-1');

      const [createUrl, createInit] = fetchMock.mock.calls[0] ?? [];
      expect(String(createUrl)).toContain('/sessions');
      expect(createInit?.method).toBe('POST');

      const [getUrl, getInit] = fetchMock.mock.calls[1] ?? [];
      expect(String(getUrl)).toContain('/sessions/session-1');
      expect(getInit?.method ?? 'GET').toBe('GET');

      const [deleteUrl, deleteInit] = fetchMock.mock.calls[2] ?? [];
      expect(String(deleteUrl)).toContain('/sessions/session-1');
      expect(deleteInit?.method).toBe('DELETE');
    });
  });

  describe('Advanced endpoints', () => {
    it('handles chat, search, reasoning, context and clarification calls', async () => {
      const chatResponse = {
        success: true,
        data: { reply: 'Antwort', sessionId: 'session-1' }
      };
      const searchResponse = {
        success: true,
        data: {
          sessionId: 'session-1',
          query: 'test',
          totalResults: 1,
          durationMs: 12,
          options: {},
          results: []
        }
      };
      const reasoningResponse = {
        success: true,
        data: {
          sessionId: 'session-1',
          response: 'Ergebnis'
        }
      };
      const contextResponse = {
        success: true,
        data: {
          sessionId: 'session-1',
          contextSettingsUsed: {},
          decision: {},
          publicContext: []
        }
      };
      const clarificationResponse = {
        success: true,
        data: {
          sessionId: 'session-1',
          query: 'test',
          analysis: { clarificationNeeded: false }
        }
      };

      const fetchMock = createFetchMock();
      fetchMock
        .mockResolvedValueOnce(
          new Response(JSON.stringify(chatResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(searchResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(reasoningResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(contextResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(clarificationResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        );

      const client = new WilliMakoClient({ token: 'secret', fetch: fetchMock });

      const chatResult = await client.chat({ sessionId: 'session-1', message: 'Hallo' });
      expect(chatResult).toEqual(chatResponse);

      const searchResult = await client.semanticSearch({ sessionId: 'session-1', query: 'test' });
      expect(searchResult).toEqual(searchResponse);

      const reasoningResult = await client.generateReasoning({
        sessionId: 'session-1',
        query: 'Analyse'
      });
      expect(reasoningResult).toEqual(reasoningResponse);

      const contextResult = await client.resolveContext({
        sessionId: 'session-1',
        query: 'Kontext?'
      });
      expect(contextResult).toEqual(contextResponse);

      const clarificationResult = await client.analyzeClarification({
        sessionId: 'session-1',
        query: 'Frage?'
      });
      expect(clarificationResult).toEqual(clarificationResponse);
      const calledPaths = fetchMock.mock.calls.map((call) => String(call?.[0]));
      expect(calledPaths).toEqual([
        expect.stringContaining('/chat'),
        expect.stringContaining('/retrieval/semantic-search'),
        expect.stringContaining('/reasoning/generate'),
        expect.stringContaining('/context/resolve'),
        expect.stringContaining('/clarification/analyze')
      ]);
    });
  });
});
