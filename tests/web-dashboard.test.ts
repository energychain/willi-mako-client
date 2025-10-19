import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { startWebDashboard } from '../src/demos/web-dashboard.js';
import type { WilliMakoClient } from '../src/index.js';

const originalGeminiKey = process.env.GEMINI_API_KEY;

beforeAll(() => {
  delete process.env.GEMINI_API_KEY;
});

afterAll(() => {
  if (originalGeminiKey !== undefined) {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  } else {
    delete process.env.GEMINI_API_KEY;
  }
});

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

  const toolScriptDescriptor = {
    code: "module.exports = { run: async () => console.log('hi') };",
    language: 'javascript' as const,
    entrypoint: 'run' as const,
    description: 'Sample deterministic tool',
    runtime: 'node18' as const,
    deterministic: true,
    dependencies: [],
    source: {
      language: 'node' as const,
      hash: 'abc123',
      bytes: 128,
      preview: "module.exports = { run: async () => console.log('hi') };",
      lineCount: 1
    },
    validation: {
      syntaxValid: true,
      deterministic: true,
      forbiddenApis: [],
      warnings: []
    },
    notes: []
  };

  const toolJob = {
    id: 'tool-job-1',
    type: 'generate-script' as const,
    sessionId: 'session-1',
    status: 'succeeded' as const,
    createdAt: now,
    updatedAt: now,
    warnings: [],
    progress: { stage: 'completed' as const, message: null, attempt: 1 },
    attempts: 1,
    metadata: null,
    result: {
      sessionId: 'session-1',
      script: toolScriptDescriptor,
      inputSchema: undefined,
      expectedOutputDescription: null
    },
    error: null
  };

  const nodeScriptJob = {
    id: 'job-1',
    type: 'run-node-script' as const,
    sessionId: 'session-1',
    status: 'succeeded' as const,
    createdAt: now,
    updatedAt: now,
    warnings: [],
    timeoutMs: 5000,
    metadata: null,
    source: {
      language: 'node' as const,
      hash: 'def456',
      bytes: 64,
      preview: 'console.log("ok")',
      lineCount: 1
    },
    result: {
      stdout: '{}',
      completedAt: now,
      durationMs: 100
    },
    diagnostics: {
      executionEnabled: true,
      notes: []
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
          id: nodeScriptJob.id,
          type: nodeScriptJob.type,
          sessionId: nodeScriptJob.sessionId,
          status: 'queued' as const,
          createdAt: now,
          updatedAt: now,
          warnings: []
        }
      }
    })),
    generateToolScript: vi.fn(async () => ({
      success: true,
      data: {
        sessionId: 'session-1',
        job: toolJob
      }
    })),
    getToolJob: vi.fn(async (jobId: string) => {
      if (jobId === toolJob.id) {
        return {
          success: true,
          data: {
            job: toolJob
          }
        };
      }
      if (jobId === nodeScriptJob.id) {
        return {
          success: true,
          data: {
            job: nodeScriptJob
          }
        };
      }
      throw new Error(`Unknown job ${jobId}`);
    }),
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

  it('handles deterministic tool generator requests', async () => {
    const mockClient = createMockClient();
    const instance = await startWebDashboard({ client: mockClient, port: 0 });

    const response = await fetch(`${instance.url}/tool-generator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        query: 'Erstelle ein Tool für UTILMD Validierung',
        preferredInputMode: 'stdin',
        attachments: [
          {
            filename: 'context.txt',
            content: 'UTILMD enthält Stammdaten für den Lieferantenwechsel',
            description: 'Kurzleitfaden'
          }
        ]
      })
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toContain('module.exports');
    expect(body.data.attachments).toHaveLength(1);
    expect(body.data.attachmentSummary).toMatchObject({ count: 1 });
    expect(Array.isArray(body.data.progress)).toBe(true);
    expect(body.data.progress.length).toBeGreaterThan(0);

    const generateMock = mockClient.generateToolScript as unknown as ReturnType<typeof vi.fn>;
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(generateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-1',
        instructions: expect.stringContaining('UTILMD'),
        attachments: expect.arrayContaining([expect.objectContaining({ filename: 'context.txt' })])
      })
    );

    await instance.stop();
  });
});
