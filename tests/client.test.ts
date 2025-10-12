import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BASE_URL,
  WilliMakoClient,
  WilliMakoError,
  bundledOpenApiDocument
} from '../src/index.js';
import type { RunNodeScriptJobRequest, CreateArtifactRequest } from '../src/types.js';

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
      const fetchMock = vi.fn(
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [, init] = fetchMock.mock.calls[0] as any;
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer secret');
      expect(headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Error Handling', () => {
    it('throws a WilliMakoError on non-successful responses', async () => {
      const fetchMock = vi.fn(
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
      const fetchMock = vi.fn(
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
      const fetchMock = vi.fn(
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

      const fetchMock = vi.fn(
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
  });
});
