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
});
