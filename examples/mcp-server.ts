import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { WilliMakoClient, WilliMakoError } from '../src/index.js';

const PORT = Number.parseInt(process.env.PORT ?? '7337', 10);
const BASE_URL = process.env.WILLI_MAKO_BASE_URL ?? undefined;

const client = new WilliMakoClient({ baseUrl: BASE_URL });

const server = new McpServer(
  {
    name: 'willi-mako',
    version: '1.0.0'
  },
  {
    instructions: `Willi-Mako exposes audited Marktkommunikationsprozesse. Use the tools to run sandbox scripts, persist artefacts and fetch schema information.

Tools:
- willi-mako.create-node-script – Execute ETL/validation logic in the managed Node sandbox
- willi-mako.get-tool-job – Poll job status and receive stdout/stderr
- willi-mako.create-artifact – Persist compliance results or EDI snapshots

Resources:
- willi-mako://openapi – Returns the OpenAPI schema exposed by the platform
`
  }
);

server.registerTool(
  'willi-mako.create-node-script',
  {
    title: 'Run a Willi-Mako Node sandbox job',
    description: 'Executes JavaScript in the secure tooling sandbox, returning the created job.',
    inputSchema: {
      sessionId: z
        .string()
        .describe('Business session identifier (e.g. UUID that groups artifacts/jobs).'),
      source: z.string().describe('JavaScript source code that will be executed.'),
      timeoutMs: z
        .number()
        .int()
        .min(100)
        .max(60_000)
        .optional()
        .describe('Optional execution timeout in milliseconds.'),
      metadata: z
        .record(z.string())
        .optional()
        .describe('Optional metadata stored with the job for audit purposes.'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Optional tags for discovery. This will be merged into metadata.tags field.')
    }
  },
  async ({ sessionId, source, timeoutMs, metadata, tags }) => {
    const payload = {
      sessionId,
      source,
      timeoutMs,
      metadata: metadata ?? undefined,
      tags
    };

    const response = await client.createNodeScriptJob(payload);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ],
      structuredContent: response.data
    };
  }
);

server.registerTool(
  'willi-mako.get-tool-job',
  {
    title: 'Lookup a sandbox job',
    description: 'Returns the current status, stdout and stderr of a tooling job.',
    inputSchema: {
      jobId: z.string().describe('The job identifier returned by create-node-script.'),
      includeLogs: z
        .boolean()
        .optional()
        .describe('Whether to include stdout/stderr in the response (defaults to true).')
    }
  },
  async ({ jobId, includeLogs = true }) => {
    const response = await client.getToolJob(jobId);
    const data = includeLogs
      ? response.data
      : { ...response.data, job: { ...response.data.job, result: undefined } };
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ],
      structuredContent: data
    };
  }
);

server.registerTool(
  'willi-mako.create-artifact',
  {
    title: 'Persist an artefact',
    description: 'Stores a compliance report, EDI snapshot or ETL output as an artefact.',
    inputSchema: {
      sessionId: z
        .string()
        .describe('Business session identifier that groups related artefacts/jobs.'),
      type: z
        .string()
        .describe('Artefact type, e.g. compliance-report, edifact-message, audit-log.'),
      name: z.string().describe('Human readable name.'),
      mimeType: z.string().describe('MIME type of the stored content.'),
      encoding: z
        .enum(['utf8', 'base64'])
        .default('utf8')
        .describe('Encoding of the content payload.'),
      content: z.string().describe('Artefact payload (UTF-8 or Base64 depending on encoding).'),
      description: z.string().optional().describe('Optional additional description.'),
      tags: z.array(z.string()).optional().describe('Optional tags for search/discovery.'),
      metadata: z.record(z.any()).optional().describe('Optional custom metadata JSON object.'),
      version: z.string().optional().describe('Semantic version identifier if applicable.')
    }
  },
  async ({
    sessionId,
    type,
    name,
    mimeType,
    encoding,
    content,
    description,
    tags,
    metadata,
    version
  }) => {
    const response = await client.createArtifact({
      sessionId,
      type,
      name,
      mimeType,
      encoding,
      content,
      description,
      tags,
      metadata,
      version
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response.data, null, 2)
        }
      ],
      structuredContent: response.data
    };
  }
);

server.registerResource(
  'willi-mako-openapi',
  'willi-mako://openapi',
  {
    title: 'Willi-Mako OpenAPI schema',
    description: 'Bundled OpenAPI schema provided by the platform.'
  },
  async () => {
    const schema = await client.getRemoteOpenApiDocument();
    return {
      contents: [
        {
          uri: 'willi-mako://openapi',
          mimeType: 'application/json',
          text: JSON.stringify(schema, null, 2)
        }
      ]
    };
  }
);

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse<IncomingMessage>
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, x-session-id');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!req.url || !req.url.startsWith('/mcp')) {
    res.statusCode = 404;
    res.end('Not Found');
    return;
  }

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true
    });

    res.on('close', () => {
      void transport.close();
    });

    transport.onerror = (error) => {
      console.error('[MCP transport error]', error);
    };

    await server.connect(transport);
    if (req.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
      await transport.handleRequest(req, res, body);
      return;
    }

    if (req.method === 'GET') {
      await transport.handleRequest(req, res);
      return;
    }

    if (req.method === 'DELETE') {
      await transport.handleRequest(req, res);
      return;
    }

    res.statusCode = 405;
    res.end('Method Not Allowed');
  } catch (error) {
    if (error instanceof WilliMakoError) {
      res.statusCode = error.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Willi-Mako API error', details: error.body }));
      return;
    }

    console.error('[MCP handler error]', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: (error as Error).message ?? 'Unknown error' }));
  }
}

createServer((req, res) => {
  void handleRequest(req, res);
}).listen(PORT, () => {
  const tokenConfigured = Boolean(process.env.WILLI_MAKO_TOKEN);
  console.log(`⚡ Willi-Mako MCP server listening on http://localhost:${PORT}/mcp`);
  if (!tokenConfigured) {
    console.warn(
      '⚠️  No WILLI_MAKO_TOKEN provided. MCP tools will fail until a token is configured.'
    );
  }
});
