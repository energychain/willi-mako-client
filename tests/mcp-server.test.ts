import { describe, expect, it, vi } from 'vitest';
import { startMcpServer } from '../src/demos/mcp-server.js';
import type { WilliMakoClient } from '../src/index.js';

const createMockClient = (): WilliMakoClient => {
  const noop = vi.fn(async () => ({}));

  return {
    login: noop,
    createSession: noop,
    getSession: noop,
    deleteSession: vi.fn(async () => undefined),
    chat: noop,
    semanticSearch: noop,
    generateReasoning: noop,
    generateToolScript: vi.fn(async () => ({
      success: true,
      data: {
        sessionId: 'session-id',
        script: {
          code: '// mock code',
          language: 'javascript',
          entrypoint: 'run',
          description: 'mock description',
          runtime: 'node18',
          deterministic: true,
          dependencies: [],
          source: {
            language: 'node',
            hash: 'mock-hash',
            bytes: 10,
            preview: '// mock code',
            lineCount: 1
          },
          validation: {
            syntaxValid: true,
            deterministic: true,
            forbiddenApis: [],
            warnings: []
          },
          notes: []
        }
      }
    })),
    resolveContext: noop,
    analyzeClarification: noop,
    createNodeScriptJob: noop,
    getToolJob: vi.fn(async () => ({ data: { job: { status: 'queued' } } })),
    createArtifact: noop,
    getRemoteOpenApiDocument: vi.fn(async () => ({ info: { title: 'mock' } }))
  } as unknown as WilliMakoClient;
};

describe('startMcpServer', () => {
  it('starts the MCP server and stops it gracefully', async () => {
    const logger = vi.fn();
    const instance = await startMcpServer({
      client: createMockClient(),
      port: 0,
      token: 'test-token',
      logger
    });

    expect(instance.port).toBeGreaterThan(0);
    expect(instance.url).toBe(`http://localhost:${instance.port}/mcp`);
    expect(logger).toHaveBeenCalledWith(expect.stringMatching(/Willi-Mako MCP server listening/));

    await instance.stop();
  });

  it('supports multiple concurrent MCP sessions', async () => {
    const instance = await startMcpServer({
      client: createMockClient(),
      port: 0,
      token: 'test-token'
    });

    const initPayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: {
          name: 'vitest',
          version: '1.0.0'
        }
      }
    };

    const headers = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json'
    } satisfies Record<string, string>;

    const initialize = async (): Promise<string> => {
      const response = await fetch(instance.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(initPayload)
      });

      expect(response.status).toBe(200);
      const sessionId = response.headers.get('mcp-session-id');
      expect(sessionId).toBeTruthy();
      await response.json();
      return sessionId as string;
    };

    const sessionIdA = await initialize();
    const sessionIdB = await initialize();
    expect(sessionIdA).not.toEqual(sessionIdB);

    const listTools = async (sessionId: string): Promise<number> => {
      const response = await fetch(instance.url, {
        method: 'POST',
        headers: {
          ...headers,
          'mcp-session-id': sessionId,
          'mcp-protocol-version': '2025-06-18'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result?.result?.tools).toBeInstanceOf(Array);
      return result.result.tools.length as number;
    };

    const [toolCountA, toolCountB] = await Promise.all([
      listTools(sessionIdA),
      listTools(sessionIdB)
    ]);

    expect(toolCountA).toBeGreaterThan(0);
    expect(toolCountB).toBeGreaterThan(0);

    await instance.stop();
  });
});
