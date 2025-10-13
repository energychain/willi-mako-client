import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import process from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { WilliMakoClient, WilliMakoError } from '../index.js';
import type {
  ChatRequest,
  ClarificationAnalyzeRequest,
  ContextResolveRequest,
  CreateSessionRequest,
  ReasoningGenerateRequest,
  SemanticSearchRequest
} from '../types.js';

export interface McpServerOptions {
  /** Optional pre-configured Willi-Mako client (useful for testing). */
  client?: WilliMakoClient;
  /** Port for the MCP HTTP transport. Defaults to PORT env var or 7337. */
  port?: number;
  /** Override base URL when instantiating a new client. */
  baseUrl?: string;
  /** Override token when instantiating a new client. */
  token?: string | null;
  /** Optional logger for structured status updates. */
  logger?: (message: string) => void;
}

export interface McpServerInstance {
  /** Bound port. */
  port: number;
  /** HTTP server backing the MCP transport. */
  server: Server;
  /** Convenience URL to access the MCP endpoint. */
  url: string;
  /** Gracefully shuts the server down. */
  stop(): Promise<void>;
}

type JsonLike = Record<string, unknown>;

type RespondPayload = {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  structuredContent: JsonLike;
};

export async function startMcpServer(options: McpServerOptions = {}): Promise<McpServerInstance> {
  const port = options.port ?? Number.parseInt(process.env.PORT ?? '7337', 10);
  const client =
    options.client ??
    new WilliMakoClient({
      baseUrl: options.baseUrl ?? undefined,
      token: options.token ?? process.env.WILLI_MAKO_TOKEN ?? null
    });

  const server = new McpServer(
    {
      name: 'willi-mako',
      version: '1.0.0'
    },
    {
      instructions: `Willi-Mako exposes audited Marktkommunikationsprozesse. Use the tools to manage sessions, converse with the platform and orchestrate sandbox jobs.

Tools:
- willi-mako.login – Exchange email/password credentials for a JWT token (optionally persistent)
- willi-mako.create-session – Create a new workspace session with optional preferences/context
- willi-mako.get-session – Retrieve metadata for an existing session
- willi-mako.delete-session – Terminate a session and associated artefacts/jobs
- willi-mako.chat – Send conversational messages to the Willi-Mako assistant
- willi-mako.semantic-search – Execute a hybrid semantic search within the knowledge graph
- willi-mako.reasoning-generate – Run the advanced reasoning pipeline for complex tasks
- willi-mako.resolve-context – Resolve contextual decisions and resources for user intents
- willi-mako.clarification-analyze – Analyse whether clarification questions are required
- willi-mako.create-node-script – Execute ETL/validation logic in the managed Node sandbox
- willi-mako.get-tool-job – Poll job status and receive stdout/stderr
- willi-mako.create-artifact – Persist compliance results or EDI snapshots

Resources:
- willi-mako://openapi – Returns the OpenAPI schema exposed by the platform
`
    }
  );

  const formatJson = (value: unknown): string => JSON.stringify(value, null, 2);
  const respond = (data: unknown): RespondPayload => ({
    content: [
      {
        type: 'text' as const,
        text: formatJson(data)
      }
    ],
    structuredContent: data as JsonLike
  });

  server.registerTool(
    'willi-mako.login',
    {
      title: 'Authenticate with Willi-Mako',
      description:
        'Exchanges email/password credentials for a JWT token. Optionally persists the token on the MCP server instance.',
      inputSchema: {
        email: z.string().email().describe('Account email address used for authentication.'),
        password: z.string().describe('Account password.'),
        persistToken: z
          .boolean()
          .optional()
          .describe('Persist the token on the MCP server (defaults to true).')
      }
    },
    async ({ email, password, persistToken = true }) => {
      const response = await client.login({ email, password }, { persistToken });
      const payload = { ...response, persisted: persistToken };
      return respond(payload);
    }
  );

  server.registerTool(
    'willi-mako.create-session',
    {
      title: 'Create a Willi-Mako session',
      description:
        'Creates a new workspace session grouping artefacts, sandbox jobs and conversational context.',
      inputSchema: {
        ttlMinutes: z
          .number()
          .int()
          .min(1)
          .max(24 * 60)
          .optional()
          .describe('Optional time-to-live in minutes (defaults to platform standard).'),
        preferences: z
          .record(z.any())
          .optional()
          .describe('Session preferences like companiesOfInterest or preferredTopics.'),
        contextSettings: z
          .record(z.any())
          .optional()
          .describe('Initial context configuration used by the assistant.')
      }
    },
    async ({ ttlMinutes, preferences, contextSettings }) => {
      const payload: CreateSessionRequest = {};
      if (typeof ttlMinutes === 'number') {
        payload.ttlMinutes = ttlMinutes;
      }
      if (preferences) {
        payload.preferences = preferences as CreateSessionRequest['preferences'];
      }
      if (contextSettings) {
        payload.contextSettings = contextSettings;
      }
      const response = await client.createSession(payload);
      return respond(response);
    }
  );

  server.registerTool(
    'willi-mako.get-session',
    {
      title: 'Retrieve a session',
      description: 'Fetches metadata about an existing session.',
      inputSchema: {
        sessionId: z.string().describe('Session identifier (UUID).')
      }
    },
    async ({ sessionId }) => {
      const response = await client.getSession(sessionId);
      return respond(response);
    }
  );

  server.registerTool(
    'willi-mako.delete-session',
    {
      title: 'Delete a session',
      description: 'Deletes a session including associated artefacts and sandbox jobs.',
      inputSchema: {
        sessionId: z.string().describe('Session identifier (UUID).')
      }
    },
    async ({ sessionId }) => {
      await client.deleteSession(sessionId);
      const payload = { success: true, sessionId };
      return respond(payload);
    }
  );

  server.registerTool(
    'willi-mako.chat',
    {
      title: 'Send a conversational message',
      description: 'Routes a message to the Willi-Mako assistant for the given session.',
      inputSchema: {
        sessionId: z.string().describe('Session identifier (UUID).'),
        message: z.string().describe('Message content to send to the assistant.'),
        contextSettings: z
          .record(z.any())
          .optional()
          .describe('Optional context override for this request.'),
        timelineId: z
          .string()
          .uuid()
          .optional()
          .describe('Optional timeline identifier to link events.')
      }
    },
    async ({ sessionId, message, contextSettings, timelineId }) => {
      const payload: ChatRequest = {
        sessionId,
        message,
        contextSettings: contextSettings ?? undefined,
        timelineId: timelineId ?? undefined
      };
      const response = await client.chat(payload);
      return respond(response);
    }
  );

  server.registerTool(
    'willi-mako.semantic-search',
    {
      title: 'Semantic search',
      description: 'Executes a hybrid semantic search within the Willi-Mako knowledge base.',
      inputSchema: {
        sessionId: z.string().describe('Session identifier (UUID).'),
        query: z.string().describe('Natural language search query.'),
        options: z
          .object({
            limit: z.number().int().min(1).max(100).optional(),
            alpha: z.number().optional(),
            outlineScoping: z.boolean().optional(),
            excludeVisual: z.boolean().optional()
          })
          .optional()
          .describe('Optional retrieval options (limit, alpha, outlineScoping, excludeVisual).')
      }
    },
    async ({ sessionId, query, options }) => {
      const payload: SemanticSearchRequest = {
        sessionId,
        query,
        options: options ?? undefined
      };
      const response = await client.semanticSearch(payload);
      return respond(response);
    }
  );

  server.registerTool(
    'willi-mako.reasoning-generate',
    {
      title: 'Advanced reasoning',
      description: 'Runs the multi-step reasoning pipeline for complex tasks.',
      inputSchema: {
        sessionId: z.string().describe('Session identifier (UUID).'),
        query: z.string().describe('Primary question or instruction.'),
        messages: z
          .array(
            z.object({
              role: z.string(),
              content: z.string()
            })
          )
          .optional()
          .describe('Optional conversation history for additional context.'),
        contextSettingsOverride: z
          .record(z.any())
          .optional()
          .describe('Optional context override for this request.'),
        preferencesOverride: z
          .record(z.any())
          .optional()
          .describe('Optional override of session preferences.'),
        overridePipeline: z
          .record(z.any())
          .optional()
          .describe('Optional pipeline override for advanced users.'),
        useDetailedIntentAnalysis: z
          .boolean()
          .optional()
          .describe('Enable detailed intent analysis for the request.')
      }
    },
    async ({
      sessionId,
      query,
      messages,
      contextSettingsOverride,
      preferencesOverride,
      overridePipeline,
      useDetailedIntentAnalysis
    }) => {
      const payload: ReasoningGenerateRequest = {
        sessionId,
        query,
        messages: messages ?? undefined,
        contextSettingsOverride: contextSettingsOverride ?? undefined,
        preferencesOverride: preferencesOverride ?? undefined,
        overridePipeline: overridePipeline ?? undefined,
        useDetailedIntentAnalysis: useDetailedIntentAnalysis ?? undefined
      };
      const response = await client.generateReasoning(payload);
      return respond(response);
    }
  );

  server.registerTool(
    'willi-mako.resolve-context',
    {
      title: 'Resolve context',
      description: 'Resolves contextual decisions and resources for a given user query.',
      inputSchema: {
        sessionId: z.string().describe('Session identifier (UUID).'),
        query: z.string().describe('User query requiring context resolution.'),
        messages: z
          .array(
            z.object({
              role: z.string(),
              content: z.string()
            })
          )
          .optional()
          .describe('Optional previous messages.'),
        contextSettingsOverride: z
          .record(z.any())
          .optional()
          .describe('Optional context override for this resolution.')
      }
    },
    async ({ sessionId, query, messages, contextSettingsOverride }) => {
      const payload: ContextResolveRequest = {
        sessionId,
        query,
        messages: messages ?? undefined,
        contextSettingsOverride: contextSettingsOverride ?? undefined
      };
      const response = await client.resolveContext(payload);
      return respond(response);
    }
  );

  server.registerTool(
    'willi-mako.clarification-analyze',
    {
      title: 'Clarification analysis',
      description: 'Analyses whether clarification questions are required before continuing.',
      inputSchema: {
        sessionId: z.string().describe('Session identifier (UUID).'),
        query: z.string().describe('User query to analyse.'),
        includeEnhancedQuery: z
          .boolean()
          .optional()
          .describe('Request an enhanced query suggestion to disambiguate the request.')
      }
    },
    async ({ sessionId, query, includeEnhancedQuery }) => {
      const payload: ClarificationAnalyzeRequest = {
        sessionId,
        query,
        includeEnhancedQuery: includeEnhancedQuery ?? undefined
      };
      const response = await client.analyzeClarification(payload);
      return respond(response);
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

  const httpServer = createServer((req, res) => {
    void handleRequest(req, res);
  });

  await new Promise<void>((resolve) => {
    httpServer.listen(port, resolve);
  });

  const addressInfo = httpServer.address() as AddressInfo | string | null;
  const resolvedPort =
    typeof addressInfo === 'object' && addressInfo !== null && 'port' in addressInfo
      ? (addressInfo.port as number)
      : port;

  const tokenConfigured = Boolean(options.token ?? process.env.WILLI_MAKO_TOKEN ?? null);
  const url = `http://localhost:${resolvedPort}/mcp`;
  options.logger?.(`⚡ Willi-Mako MCP server listening on ${url}`);
  if (!tokenConfigured) {
    options.logger?.(
      '⚠️  No WILLI_MAKO_TOKEN provided. MCP tools will fail until a token is configured.'
    );
  }

  return {
    port: resolvedPort,
    server: httpServer,
    url,
    async stop(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
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
