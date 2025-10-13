import { describe, expect, it, vi } from 'vitest';
import { startWebDashboard } from '../src/demos/web-dashboard.js';
import type { WilliMakoClient } from '../src/index.js';

const createMockClient = (): WilliMakoClient => {
  const now = new Date().toISOString();
  const sessionEnvelope = {
    success: true,
    data: {
      sessionId: 'session-1',
      userId: 'user-1',
      workspaceContext: {},
      policyFlags: {},
      preferences: {},
      expiresAt: now
    }
  };

  return {
    getBaseUrl: () => 'https://example.invalid/api/v2',
    login: vi.fn(async () => ({
      success: true,
      data: {
        accessToken: 'token',
        expiresAt: now
      }
    })),
    createSession: vi.fn(async () => sessionEnvelope),
    getSession: vi.fn(async () => sessionEnvelope),
    deleteSession: vi.fn(async () => undefined),
    chat: vi.fn(async () => ({ success: true, data: {} })),
    semanticSearch: vi.fn(async () => ({
      success: true,
      data: {
        sessionId: 'session-1',
        query: 'test',
        totalResults: 0,
        durationMs: 0,
        options: {},
        results: []
      }
    })),
    generateReasoning: vi.fn(async () => ({
      success: true,
      data: {
        sessionId: 'session-1',
        response: 'ok'
      }
    })),
    resolveContext: vi.fn(async () => ({
      success: true,
      data: {
        sessionId: 'session-1',
        contextSettingsUsed: {},
        decision: {},
        publicContext: []
      }
    })),
    analyzeClarification: vi.fn(async () => ({
      success: true,
      data: {
        sessionId: 'session-1',
        query: 'test',
        analysis: { clarificationNeeded: false }
      }
    })),
    createNodeScriptJob: vi.fn(async () => ({
      success: true,
      data: {
        sessionId: 'session-1',
        job: {
          id: 'job-1',
          status: 'queued'
        }
      }
    })),
    getToolJob: vi.fn(async () => ({
      success: true,
      data: {
        job: {
          status: 'succeeded',
          result: {
            stdout: '{}'
          }
        }
      }
    })),
    createArtifact: vi.fn(async () => ({
      success: true,
      data: {
        sessionId: 'session-1',
        artifact: {
          id: 'artifact-1',
          sessionId: 'session-1',
          type: 'mock',
          name: 'mock.json',
          mimeType: 'application/json',
          byteSize: 2,
          checksum: 'abc123',
          createdAt: now,
          updatedAt: now,
          storage: {
            mode: 'inline',
            encoding: 'utf8',
            content: '{}'
          },
          preview: '{}'
        }
      }
    })),
    getRemoteOpenApiDocument: vi.fn(async () => ({ info: { title: 'mock' } }))
  } as unknown as WilliMakoClient;
};

describe('startWebDashboard', () => {
  it('starts the dashboard server and stops it gracefully', async () => {
    const logger = vi.fn();
    const instance = await startWebDashboard({
      client: createMockClient(),
      port: 0,
      token: 'test-token',
      logger
    });

    expect(instance.port).toBeGreaterThan(0);
    expect(instance.url).toMatch(/^http:\/\/localhost:\d+$/);
    expect(logger).toHaveBeenCalledWith(expect.stringMatching(/Willi-Mako Dashboard läuft/));

    await instance.stop();
  });
});
