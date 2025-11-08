import { randomUUID } from 'node:crypto';
import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from 'node:http';
import type { AddressInfo } from 'node:net';
import process from 'node:process';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
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
  const baseUrl = options.baseUrl ?? options.client?.getBaseUrl?.() ?? undefined;
  const fallbackToken = options.token ?? process.env.WILLI_MAKO_TOKEN ?? null;

  interface TransportSessionState {
    token?: string;
    sessionId?: string;
  }

  type RequestContext = {
    sessionId?: string;
    requestInfo?: {
      headers?: IncomingHttpHeaders;
    };
  };

  const transportState = new Map<string, TransportSessionState>();
  const basicTokenCache = new Map<string, { token: string; expiresAt?: number }>();

  const parseExpiresAt = (value?: string): number | undefined => {
    if (!value) {
      return undefined;
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? undefined : timestamp;
  };

  const resolveTokenFromBasic = async (encoded: string): Promise<string> => {
    const cached = basicTokenCache.get(encoded);
    if (cached) {
      if (!cached.expiresAt || cached.expiresAt > Date.now()) {
        return cached.token;
      }
      basicTokenCache.delete(encoded);
    }

    let decoded: string;
    try {
      decoded = Buffer.from(encoded, 'base64').toString('utf8');
    } catch (error) {
      throw new McpError(ErrorCode.InvalidParams, 'Malformed Basic authorization header');
    }

    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Basic authorization header must contain "email:password"'
      );
    }

    const email = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    const authClient = new WilliMakoClient({ baseUrl, token: null });
    const response = await authClient.login({ email, password }, { persistToken: false });

    if (!response.success || !response.data?.accessToken) {
      throw new McpError(ErrorCode.InvalidParams, 'Authentication failed for provided credentials');
    }

    const expiresAt = parseExpiresAt(response.data.expiresAt);
    basicTokenCache.set(encoded, {
      token: response.data.accessToken,
      expiresAt
    });

    return response.data.accessToken;
  };

  const instantiateClient = (token: string): WilliMakoClient => {
    if (options.client) {
      if (typeof options.client.setToken === 'function') {
        options.client.setToken(token);
      }
      return options.client;
    }

    return new WilliMakoClient({
      baseUrl,
      token
    });
  };

  const resolveToken = async (
    context?: RequestContext
  ): Promise<{ token: string; transportSessionId?: string; headers: IncomingHttpHeaders }> => {
    const transportSessionId = context?.sessionId;
    const headers = (context?.requestInfo?.headers ?? {}) as IncomingHttpHeaders;
    const rawAuthorization =
      typeof headers.authorization === 'string' ? headers.authorization.trim() : undefined;

    let token: string | undefined;

    if (rawAuthorization) {
      const [schemeRaw, ...rest] = rawAuthorization.split(/\s+/);
      const value = rest.join(' ');
      const scheme = schemeRaw.toLowerCase();

      if (scheme === 'bearer') {
        token = value;
      } else if (scheme === 'basic') {
        token = await resolveTokenFromBasic(value);
      } else {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Unsupported authorization scheme "${schemeRaw}"`
        );
      }
    }

    if (!token && transportSessionId) {
      token = transportState.get(transportSessionId)?.token;
    }

    if (!token) {
      token = fallbackToken ?? undefined;
    }

    if (!token) {
      throw new McpError(
        ErrorCode.InvalidParams,
        'Authentication required. Provide an Authorization header or configure WILLI_MAKO_TOKEN.'
      );
    }

    if (transportSessionId) {
      const state = transportState.get(transportSessionId) ?? {};
      state.token = token;
      transportState.set(transportSessionId, state);
    }

    return { token, transportSessionId, headers };
  };

  const withClient = async <T>(
    context: RequestContext | undefined,
    handler: (
      client: WilliMakoClient,
      transportSessionId?: string,
      headers?: IncomingHttpHeaders
    ) => Promise<T>
  ): Promise<T> => {
    const { token, transportSessionId, headers } = await resolveToken(context);
    const clientInstance = instantiateClient(token);
    return handler(clientInstance, transportSessionId, headers);
  };

  const ensureSessionId = async (
    clientInstance: WilliMakoClient,
    transportSessionId: string | undefined,
    providedSessionId?: string
  ): Promise<string> => {
    if (providedSessionId) {
      if (transportSessionId) {
        const state = transportState.get(transportSessionId) ?? {};
        state.sessionId = providedSessionId;
        transportState.set(transportSessionId, state);
      }
      return providedSessionId;
    }

    if (transportSessionId) {
      const existing = transportState.get(transportSessionId)?.sessionId;
      if (existing) {
        return existing;
      }
    }

    const response = await clientInstance.createSession({});
    const newSessionId = response.data.sessionId;

    if (transportSessionId) {
      const state = transportState.get(transportSessionId) ?? {};
      state.sessionId = newSessionId;
      transportState.set(transportSessionId, state);
    }

    options.logger?.(
      `ℹ️  Created ad-hoc Willi-Mako session ${newSessionId}${
        transportSessionId ? ` for transport session ${transportSessionId}` : ''
      }.`
    );

    return newSessionId;
  };

  const MCP_SERVER_INSTRUCTIONS = `Willi-Mako exposes audited Marktkommunikationsprozesse. Use the tools to manage sessions, converse with the platform and orchestrate sandbox jobs.

Authentication:
- Provide an "Authorization: Bearer <token>" header or set the WILLI_MAKO_TOKEN environment variable.
- Use "Authorization: Basic base64(email:password)" to exchange credentials for a cached JWT on the server.
- Prefix the MCP path with the JWT token ("/{token}/mcp") to implicitly authenticate without additional headers.

Tools:
- willi-mako-login – Exchange email/password credentials for a JWT token (optionally persistent)
- willi-mako-create-session – Create a new workspace session with optional preferences/context
- willi-mako-get-session – Retrieve metadata for an existing session
- willi-mako-delete-session – Terminate a session and associated artefacts/jobs
- willi-mako-chat – Fast Q&A with the energy-market assistant (grounded MaKo expertise)
- willi-mako-semantic-search – Execute a hybrid semantic search within the knowledge graph
- willi-netz-semantic-search – Search the willi-netz collection (network management, regulation, TAB)
- willi-netz-chat – Chat based on willi-netz collection (BNetzA, ARegV, §14a EnWG, smart meters)
- combined-semantic-search – Search across both willi_mako and willi-netz collections
- combined-chat – Chat with access to both collections (auto-selects relevant knowledge)
- willi-mako-reasoning-generate – Multi-step investigations across energy-market data sets
- willi-mako-resolve-context – Resolve contextual decisions and resources for user intents
- willi-mako-clarification-analyze – Analyse whether clarification questions are required
- willi-mako-create-node-script – Execute ETL/validation logic in the managed Node sandbox
- willi-mako-get-tool-job – Poll job status and receive stdout/stderr
- willi-mako-create-artifact – Persist compliance results or EDI snapshots
- willi-mako-list-documents – List all documents with pagination and filtering
- willi-mako-get-document – Retrieve detailed information about a specific document
- willi-mako-update-document – Update document metadata (title, description, tags, AI context)
- willi-mako-delete-document – Permanently delete a document
- willi-mako-reprocess-document – Trigger reprocessing of a document
- willi-mako-toggle-ai-context – Enable/disable AI context for a document

Capabilities:
- Deep coverage of German energy-market processes and market roles (GPKE, WiM, GeLi Gas, Mehr-/Mindermengen, Lieferantenwechsel, …).
- Regulatory context spanning EnWG, StromNZV, StromNEV, EEG, MessEG/MessEV and current BNetzA guidance.
- Authoritative format knowledge for EDIFACT/edi@energy, BDEW MaKo-Richtlinien, UTILMD, MSCONS, ORDERS, PRICAT, INVOIC und ergänzende Prüfkataloge.
- Network management expertise via willi-netz: BNetzA regulations, incentive regulation (ARegV), technical connection requirements (TAB from Westnetz, Netze BW, etc.), asset management (ISO 55000), SAIDI/SAIFI quality indicators.
- Need prompt scaffolding for frequently used checklists? Add lightweight helper tools that wrap the chat endpoint with prefilled context instead of reinventing workflows.

Resources:
- willi-mako://openapi – Returns the OpenAPI schema exposed by the platform
`;

  const emitLog = (message: string): void => {
    if (options.logger) {
      options.logger(message);
      return;
    }
    console.log(message);
  };

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

  const configureServer = (server: McpServer): void => {
    const registerTool = (
      toolName: Parameters<typeof server.registerTool>[0],
      metadata: Parameters<typeof server.registerTool>[1],
      handler: Parameters<typeof server.registerTool>[2]
    ): void => {
      server.registerTool(toolName, metadata, async (input: unknown, extra: unknown) => {
        const context = extra as RequestContext | undefined;
        const invocationId = randomUUID();
        const transportSessionId = context?.sessionId;
        const state = transportSessionId ? transportState.get(transportSessionId) : undefined;
        const williSessionId = state?.sessionId;
        const userAgent =
          typeof context?.requestInfo?.headers?.['user-agent'] === 'string'
            ? context.requestInfo.headers['user-agent']
            : undefined;

        const contextParts: string[] = [];
        if (transportSessionId) {
          contextParts.push(`transport=${transportSessionId}`);
        }
        if (williSessionId) {
          contextParts.push(`session=${williSessionId}`);
        }
        if (userAgent) {
          contextParts.push(`ua=${userAgent}`);
        }
        const contextSuffix = contextParts.length ? ` (${contextParts.join(', ')})` : '';

        emitLog(`🛠️  [${invocationId}] ${toolName} invoked${contextSuffix}`);
        const startedAt = Date.now();
        try {
          const result = await handler(input as never, extra as never);
          const duration = Date.now() - startedAt;
          emitLog(`✅ [${invocationId}] ${toolName} completed in ${duration}ms`);
          return result;
        } catch (error) {
          const duration = Date.now() - startedAt;
          const message = error instanceof Error ? error.message : String(error);
          emitLog(`❌ [${invocationId}] ${toolName} failed after ${duration}ms – ${message}`);
          throw error;
        }
      });
    };
    registerTool(
      'willi-mako-login',
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
      async ({ email, password, persistToken = true }, extra?: RequestContext) => {
        const authClient = new WilliMakoClient({ baseUrl, token: null });
        const response = await authClient.login({ email, password }, { persistToken });

        if (response.success && persistToken !== false && response.data?.accessToken) {
          const encodedCredentials = Buffer.from(`${email}:${password}`, 'utf8').toString('base64');
          basicTokenCache.set(encodedCredentials, {
            token: response.data.accessToken,
            expiresAt: parseExpiresAt(response.data.expiresAt)
          });

          if (extra?.sessionId) {
            const state = transportState.get(extra.sessionId) ?? {};
            state.token = response.data.accessToken;
            transportState.set(extra.sessionId, state);
          }
        }

        const payload = { ...response, persisted: persistToken };
        return respond(payload);
      }
    );

    registerTool(
      'willi-mako-create-session',
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
      async ({ ttlMinutes, preferences, contextSettings }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
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
          const response = await clientInstance.createSession(payload);
          if (transportSessionId) {
            const state = transportState.get(transportSessionId) ?? {};
            state.sessionId = response.data.sessionId;
            transportState.set(transportSessionId, state);
          }
          return respond(response);
        })
    );

    registerTool(
      'willi-mako-get-session',
      {
        title: 'Retrieve a session',
        description: 'Fetches metadata about an existing session.',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).')
        }
      },
      async ({ sessionId }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.getSession(sessionId);
          return respond(response);
        })
    );

    registerTool(
      'willi-mako-delete-session',
      {
        title: 'Delete a session',
        description: 'Deletes a session including associated artefacts and sandbox jobs.',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).')
        }
      },
      async ({ sessionId }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          await clientInstance.deleteSession(sessionId);
          if (transportSessionId) {
            const state = transportState.get(transportSessionId);
            if (state && state.sessionId === sessionId) {
              state.sessionId = undefined;
              transportState.set(transportSessionId, state);
            }
          }
          const payload = { success: true, sessionId };
          return respond(payload);
        })
    );

    registerTool(
      'willi-mako-chat',
      {
        title: 'Send a conversational message',
        description:
          'Consult the energy-market assistant for grounded insights on GPKE, WiM, GeLi Gas, EnWG/StromNZV/EEG Vorgaben and EDIFACT/edi@energy (BDEW MaKo) format questions within the active session.',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).').optional(),
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
      async ({ sessionId, message, contextSettings, timelineId }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload: ChatRequest = {
            sessionId: activeSessionId,
            message,
            contextSettings: contextSettings ?? undefined,
            timelineId: timelineId ?? undefined
          };
          const response = await clientInstance.chat(payload);
          return respond({ ...response, sessionId: activeSessionId });
        })
    );

    registerTool(
      'willi-mako-semantic-search',
      {
        title: 'Semantic search',
        description: 'Executes a hybrid semantic search within the Willi-Mako knowledge base.',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).').optional(),
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
      async ({ sessionId, query, options }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload: SemanticSearchRequest = {
            sessionId: activeSessionId,
            query,
            options: options ?? undefined
          };
          const response = await clientInstance.semanticSearch(payload);
          return respond({ ...response, sessionId: activeSessionId });
        })
    );

    registerTool(
      'willi-netz-semantic-search',
      {
        title: 'Willi-Netz semantic search',
        description:
          'Executes semantic search within the willi-netz collection specialized on network management, regulation (EnWG, StromNEV, ARegV), BNetzA reports, TAB, VDE-FNN, and asset management (ISO 55000). Ideal for: §14a EnWG, network fees, SAIDI/SAIFI, supply quality, smart meters, e-mobility, storage.',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).').optional(),
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
      async ({ sessionId, query, options }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload = {
            sessionId: activeSessionId,
            query,
            options: options ?? undefined
          };
          const response = await clientInstance.williNetzSemanticSearch(payload);
          return respond({ ...response, sessionId: activeSessionId });
        })
    );

    registerTool(
      'willi-netz-chat',
      {
        title: 'Willi-Netz chat',
        description:
          'Chat interaction based on the willi-netz collection covering network management, BNetzA regulation, incentive regulation (ARegV), technical connection requirements (TAB), asset management. Ideal for: §14a EnWG, smart meters, e-mobility, storage, NEST project, supply quality (SAIDI/SAIFI).',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).').optional(),
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
      async ({ sessionId, message, contextSettings, timelineId }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload = {
            sessionId: activeSessionId,
            message,
            contextSettings: contextSettings ?? undefined,
            timelineId: timelineId ?? undefined
          };
          const response = await clientInstance.williNetzChat(payload);
          return respond({ ...response, sessionId: activeSessionId });
        })
    );

    registerTool(
      'combined-semantic-search',
      {
        title: 'Combined semantic search',
        description:
          'Executes semantic search across both willi_mako and willi-netz collections. Combines EDIFACT/market communication knowledge with network management/regulation. Results include sourceCollection information. Ideal for cross-cutting research covering both market processes and regulatory/technical network topics.',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).').optional(),
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
      async ({ sessionId, query, options }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload = {
            sessionId: activeSessionId,
            query,
            options: options ?? undefined
          };
          const response = await clientInstance.combinedSemanticSearch(payload);
          return respond({ ...response, sessionId: activeSessionId });
        })
    );

    registerTool(
      'combined-chat',
      {
        title: 'Combined chat',
        description:
          'Chat with access to both willi_mako and willi-netz collections. Automatically uses the most relevant collection. Ideal for complex questions covering both market communication (EDIFACT, supplier switch, UTILMD) and regulatory/technical network topics (network fees, TAB, §14a EnWG, smart meters).',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).').optional(),
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
      async ({ sessionId, message, contextSettings, timelineId }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload = {
            sessionId: activeSessionId,
            message,
            contextSettings: contextSettings ?? undefined,
            timelineId: timelineId ?? undefined
          };
          const response = await clientInstance.combinedChat(payload);
          return respond({ ...response, sessionId: activeSessionId });
        })
    );

    registerTool(
      'willi-mako-reasoning-generate',
      {
        title: 'Advanced reasoning',
        description:
          'Launches the multi-stage reasoning pipeline to synthesise evidence and action plans across MaKo documents when simple chat is insufficient.',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).').optional(),
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
      async (
        {
          sessionId,
          query,
          messages,
          contextSettingsOverride,
          preferencesOverride,
          overridePipeline,
          useDetailedIntentAnalysis
        },
        extra?: RequestContext
      ) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload: ReasoningGenerateRequest = {
            sessionId: activeSessionId,
            query,
            messages: messages ?? undefined,
            contextSettingsOverride: contextSettingsOverride ?? undefined,
            preferencesOverride: preferencesOverride ?? undefined,
            overridePipeline: overridePipeline ?? undefined,
            useDetailedIntentAnalysis: useDetailedIntentAnalysis ?? undefined
          };
          const response = await clientInstance.generateReasoning(payload);
          return respond({ ...response, sessionId: activeSessionId });
        })
    );

    registerTool(
      'willi-mako-resolve-context',
      {
        title: 'Resolve context',
        description: 'Resolves contextual decisions and resources for a given user query.',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).').optional(),
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
      async ({ sessionId, query, messages, contextSettingsOverride }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload: ContextResolveRequest = {
            sessionId: activeSessionId,
            query,
            messages: messages ?? undefined,
            contextSettingsOverride: contextSettingsOverride ?? undefined
          };
          const response = await clientInstance.resolveContext(payload);
          return respond({ ...response, sessionId: activeSessionId });
        })
    );

    registerTool(
      'willi-mako-clarification-analyze',
      {
        title: 'Clarification analysis',
        description: 'Analyses whether clarification questions are required before continuing.',
        inputSchema: {
          sessionId: z.string().describe('Session identifier (UUID).').optional(),
          query: z.string().describe('User query to analyse.'),
          includeEnhancedQuery: z
            .boolean()
            .optional()
            .describe('Request an enhanced query suggestion to disambiguate the request.')
        }
      },
      async ({ sessionId, query, includeEnhancedQuery }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload: ClarificationAnalyzeRequest = {
            sessionId: activeSessionId,
            query,
            includeEnhancedQuery: includeEnhancedQuery ?? undefined
          };
          const response = await clientInstance.analyzeClarification(payload);
          return respond({ ...response, sessionId: activeSessionId });
        })
    );

    registerTool(
      'willi-mako-create-node-script',
      {
        title: 'Run a Willi-Mako Node sandbox job',
        description:
          'Executes JavaScript in the secure tooling sandbox, returning the created job.',
        inputSchema: {
          sessionId: z
            .string()
            .describe('Business session identifier (e.g. UUID that groups artifacts/jobs).')
            .optional(),
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
      async ({ sessionId, source, timeoutMs, metadata, tags }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const payload = {
            sessionId: activeSessionId,
            source,
            timeoutMs,
            metadata: metadata ?? undefined,
            tags
          };

          const response = await clientInstance.createNodeScriptJob(payload);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2)
              }
            ],
            structuredContent: {
              sessionId: activeSessionId,
              data: response.data
            }
          };
        })
    );

    registerTool(
      'willi-mako-get-tool-job',
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
      async ({ jobId, includeLogs = true }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.getToolJob(jobId);
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
        })
    );

    registerTool(
      'willi-mako-create-artifact',
      {
        title: 'Persist an artefact',
        description: 'Stores a compliance report, EDI snapshot or ETL output as an artefact.',
        inputSchema: {
          sessionId: z
            .string()
            .describe('Business session identifier that groups related artefacts/jobs.')
            .optional(),
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
      async (
        {
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
        },
        extra?: RequestContext
      ) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const activeSessionId = await ensureSessionId(
            clientInstance,
            transportSessionId,
            sessionId
          );
          const response = await clientInstance.createArtifact({
            sessionId: activeSessionId,
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
            structuredContent: {
              sessionId: activeSessionId,
              data: response.data
            }
          };
        })
    );

    registerTool(
      'willi-mako-list-documents',
      {
        title: 'List documents',
        description:
          'Lists all documents in the knowledge base with pagination, search, and filtering options.',
        inputSchema: {
          page: z.number().int().min(1).default(1).describe('Page number (1-based)').optional(),
          limit: z.number().int().min(1).max(100).default(12).describe('Items per page').optional(),
          search: z.string().describe('Search term for title/description').optional(),
          processed: z.boolean().describe('Filter by processing status').optional()
        }
      },
      async ({ page, limit, search, processed }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.listDocuments({
            page,
            limit,
            search,
            processed
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
        })
    );

    registerTool(
      'willi-mako-get-document',
      {
        title: 'Get document details',
        description: 'Retrieves detailed information about a specific document by its ID.',
        inputSchema: {
          documentId: z.string().describe('Unique document identifier')
        }
      },
      async ({ documentId }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.getDocument(documentId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2)
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    registerTool(
      'willi-mako-update-document',
      {
        title: 'Update document metadata',
        description:
          'Updates metadata of a document including title, description, tags, and AI context setting.',
        inputSchema: {
          documentId: z.string().describe('Unique document identifier'),
          title: z.string().optional().describe('Updated title'),
          description: z.string().optional().describe('Updated description'),
          tags: z.array(z.string()).optional().describe('Updated tags array'),
          is_ai_context_enabled: z
            .boolean()
            .optional()
            .describe('Whether to enable/disable AI context')
        }
      },
      async (
        { documentId, title, description, tags, is_ai_context_enabled },
        extra?: RequestContext
      ) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.updateDocument(documentId, {
            title,
            description,
            tags,
            is_ai_context_enabled
          });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2)
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    registerTool(
      'willi-mako-delete-document',
      {
        title: 'Delete document',
        description: 'Permanently deletes a document from the knowledge base.',
        inputSchema: {
          documentId: z.string().describe('Unique document identifier')
        }
      },
      async ({ documentId }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          await clientInstance.deleteDocument(documentId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, message: 'Document deleted' }, null, 2)
              }
            ],
            structuredContent: {
              success: true,
              message: 'Document deleted'
            }
          };
        })
    );

    registerTool(
      'willi-mako-reprocess-document',
      {
        title: 'Reprocess document',
        description:
          'Triggers reprocessing of a document (re-extraction of text and re-embedding). Useful when a document failed to process initially.',
        inputSchema: {
          documentId: z.string().describe('Unique document identifier')
        }
      },
      async ({ documentId }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.reprocessDocument(documentId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2)
              }
            ],
            structuredContent: response.data
          };
        })
    );

    registerTool(
      'willi-mako-toggle-ai-context',
      {
        title: 'Toggle AI context for document',
        description:
          'Enables or disables AI context for a document. When enabled, the document can be referenced in chat and reasoning.',
        inputSchema: {
          documentId: z.string().describe('Unique document identifier'),
          enabled: z.boolean().describe('Whether to enable or disable AI context')
        }
      },
      async ({ documentId, enabled }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.toggleAiContext(documentId, enabled);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response.data, null, 2)
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    // =====================================================================
    // EDIFACT Message Analyzer Tools (Version 0.7.0)
    // =====================================================================

    registerTool(
      'willi-mako-analyze-edifact',
      {
        title: 'Analyze EDIFACT message',
        description:
          'Performs structural analysis of an EDIFACT message, extracts segments, and enriches them with code lookup information from BDEW/EIC databases.',
        inputSchema: {
          message: z.string().describe('The EDIFACT message to analyze')
        }
      },
      async ({ message }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.analyzeEdifactMessage({ message });
          return {
            content: [
              {
                type: 'text',
                text: `Format: ${response.data.format}\nSummary: ${response.data.summary}\n\nSegments: ${response.data.structuredData.segments.length}\n\n${JSON.stringify(response.data, null, 2)}`
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    registerTool(
      'willi-mako-chat-edifact',
      {
        title: 'Chat about EDIFACT message',
        description:
          'Enables interactive questions and discussions about an EDIFACT message with a context-aware AI assistant that understands market communication standards.',
        inputSchema: {
          message: z.string().describe("The user's question or message"),
          currentEdifactMessage: z.string().describe('The current EDIFACT message as context'),
          chatHistory: z
            .array(
              z.object({
                role: z.enum(['user', 'assistant']).describe('Role of the message sender'),
                content: z.string().describe('Content of the message')
              })
            )
            .optional()
            .describe('Previous chat history for context')
        }
      },
      async ({ message, currentEdifactMessage, chatHistory }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.chatAboutEdifactMessage({
            message,
            currentEdifactMessage,
            chatHistory
          });
          return {
            content: [
              {
                type: 'text',
                text: response.data.response
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    registerTool(
      'willi-mako-explain-edifact',
      {
        title: 'Explain EDIFACT message',
        description:
          'Generates a human-readable, structured explanation of an EDIFACT message using LLM and expert knowledge about market communication standards.',
        inputSchema: {
          message: z.string().describe('The EDIFACT message to explain')
        }
      },
      async ({ message }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.explainEdifactMessage({ message });
          return {
            content: [
              {
                type: 'text',
                text: response.data.explanation
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    registerTool(
      'willi-mako-validate-edifact',
      {
        title: 'Validate EDIFACT message',
        description:
          'Validates an EDIFACT message structurally and semantically with detailed error and warning lists according to market communication rules.',
        inputSchema: {
          message: z.string().describe('The EDIFACT message to validate')
        }
      },
      async ({ message }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.validateEdifactMessage({ message });
          const summary = `Valid: ${response.data.isValid ? 'Yes' : 'No'}\nMessage Type: ${response.data.messageType || 'Unknown'}\nSegments: ${response.data.segmentCount || 0}\nErrors: ${response.data.errors.length}\nWarnings: ${response.data.warnings.length}`;
          return {
            content: [
              {
                type: 'text',
                text: `${summary}\n\n${JSON.stringify(response.data, null, 2)}`
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    registerTool(
      'willi-mako-modify-edifact',
      {
        title: 'Modify EDIFACT message',
        description:
          'Modifies an EDIFACT message based on natural language instructions while maintaining valid EDIFACT structure. Perfect for testing scenarios or creating message variants.',
        inputSchema: {
          instruction: z
            .string()
            .describe('Natural language instruction describing the desired modification'),
          currentMessage: z.string().describe('The current EDIFACT message to modify')
        }
      },
      async ({ instruction, currentMessage }, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.modifyEdifactMessage({
            instruction,
            currentMessage
          });
          return {
            content: [
              {
                type: 'text',
                text: `Modified message:\n\n${response.data.modifiedMessage}\n\nValid: ${response.data.isValid ? 'Yes' : 'No'}`
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    server.registerResource(
      'willi-mako-openapi',
      'willi-mako://openapi',
      {
        title: 'Willi-Mako OpenAPI schema',
        description: 'Bundled OpenAPI schema provided by the platform.'
      },
      async (_uri, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const schema = await clientInstance.getRemoteOpenApiDocument();
          return {
            contents: [
              {
                uri: 'willi-mako://openapi',
                mimeType: 'application/json',
                text: JSON.stringify(schema, null, 2)
              }
            ]
          };
        })
    );
  };

  interface SessionContext {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
    sessionId?: string;
    createdAt: number;
    lastSeen: number;
    finalized: boolean;
  }

  const activeSessionContexts = new Set<SessionContext>();
  const sessionContextsById = new Map<string, SessionContext>();

  const finalizeSessionContext = (context: SessionContext, sessionId?: string): void => {
    if (context.finalized) {
      return;
    }
    const effectiveSessionId = sessionId ?? context.sessionId;
    if (effectiveSessionId) {
      sessionContextsById.delete(effectiveSessionId);
      transportState.delete(effectiveSessionId);
    }
    activeSessionContexts.delete(context);
    context.finalized = true;
  };

  const createSessionContext = async (): Promise<SessionContext> => {
    const server = new McpServer(
      {
        name: 'willi-mako',
        version: '1.0.0'
      },
      {
        instructions: MCP_SERVER_INSTRUCTIONS
      }
    );

    configureServer(server);

    const context: SessionContext = {
      server,
      transport: undefined as unknown as StreamableHTTPServerTransport,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      finalized: false
    };

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: async (sessionId) => {
        context.sessionId = sessionId;
        context.lastSeen = Date.now();
        sessionContextsById.set(sessionId, context);
        if (!transportState.has(sessionId)) {
          transportState.set(sessionId, {});
        }
        emitLog(
          `🔗 MCP transport session ${sessionId} initialised (active=${sessionContextsById.size}).`
        );
      },
      onsessionclosed: async (sessionId) => {
        finalizeSessionContext(context, sessionId);
        emitLog(
          `🔌 MCP transport session ${sessionId} closed (active=${sessionContextsById.size}).`
        );
      }
    });

    transport.onerror = (error) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[MCP transport error]', error);
      emitLog(`❗ MCP transport error: ${message}`);
    };

    context.transport = transport;
    activeSessionContexts.add(context);
    await server.connect(transport);
    return context;
  };

  const closeSessionContext = async (context: SessionContext, reason: string): Promise<void> => {
    if (context.finalized && context.sessionId) {
      return;
    }

    try {
      await context.transport.close();
    } catch (error) {
      console.error('[MCP transport close error]', error);
    }

    if (!context.finalized) {
      const sessionId = context.sessionId;
      finalizeSessionContext(context);
      if (sessionId) {
        emitLog(
          `🔌 MCP transport session ${sessionId} closed (${reason}; active=${sessionContextsById.size}).`
        );
      } else {
        emitLog(`🔌 MCP transport session (pending) closed (${reason}).`);
      }
    }
  };

  const sendJsonError = (
    res: ServerResponse<IncomingMessage>,
    status: number,
    code: number,
    message: string
  ): void => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code,
          message
        },
        id: null
      })
    );
  };

  async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse<IncomingMessage>
  ): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const requestedHeadersRaw = req.headers['access-control-request-headers'];
    const requestedHeaders = Array.isArray(requestedHeadersRaw)
      ? requestedHeadersRaw.join(',')
      : (requestedHeadersRaw ?? '');

    const allowHeaderSet = new Set(
      [
        'content-type',
        'authorization',
        'accept',
        'x-session-id',
        'mcp-session-id',
        'mcp-protocol-version',
        'mcp-client-id'
      ].map((header) => header.toLowerCase())
    );

    for (const entry of requestedHeaders.split(',')) {
      const normalized = entry.trim().toLowerCase();
      if (normalized) {
        allowHeaderSet.add(normalized);
      }
    }

    res.setHeader('Access-Control-Allow-Headers', Array.from(allowHeaderSet).join(', '));
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id, mcp-protocol-version');

    const originalUrl = req.url ?? '/mcp';
    let normalizedUrl = originalUrl;
    let pathToken: string | undefined;
    let parsedUrl: URL | undefined;

    try {
      parsedUrl = new URL(originalUrl, 'http://localhost');
      const segments = parsedUrl.pathname.split('/').filter(Boolean);

      if (segments.length >= 2 && segments[0] !== 'mcp' && segments[1] === 'mcp') {
        pathToken = decodeURIComponent(segments[0]);
        const remaining = segments.slice(1);
        parsedUrl.pathname = `/${remaining.join('/')}`;
        normalizedUrl = `${parsedUrl.pathname}${parsedUrl.search}`;
        req.url = normalizedUrl;
      } else {
        normalizedUrl = `${parsedUrl.pathname}${parsedUrl.search}`;
      }
    } catch (error) {
      normalizedUrl = '[invalid-url]';
      const message = error instanceof Error ? error.message : String(error);
      emitLog(`⚠️  Failed to parse MCP request URL (${message}).`);
    }

    if (pathToken && !req.headers.authorization) {
      req.headers.authorization = `Bearer ${pathToken}`;
    }

    if (!req.headers['mcp-session-id']) {
      const headerSession = req.headers['x-session-id'];
      const normalizedHeaderSession = Array.isArray(headerSession)
        ? headerSession.at(-1)
        : headerSession;
      const sanitizedHeaderSession =
        typeof normalizedHeaderSession === 'string' ? normalizedHeaderSession.trim() : undefined;
      const querySession =
        parsedUrl?.searchParams.get('mcp-session-id')?.trim() ||
        parsedUrl?.searchParams.get('sessionId')?.trim() ||
        parsedUrl?.searchParams.get('session-id')?.trim() ||
        parsedUrl?.searchParams.get('session')?.trim();

      const resolvedSessionId = sanitizedHeaderSession || querySession || undefined;
      if (resolvedSessionId) {
        req.headers['mcp-session-id'] = resolvedSessionId;
      }
    }

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

    const remoteAddress = req.socket?.remoteAddress ?? 'unknown';
    const transportSessionHeader = req.headers['mcp-session-id'];
    const transportSessionId = Array.isArray(transportSessionHeader)
      ? transportSessionHeader.at(-1)
      : transportSessionHeader;
    emitLog(
      `🌐 ${req.method ?? 'UNKNOWN'} ${normalizedUrl} from ${remoteAddress}${
        transportSessionId ? ` (transport=${transportSessionId})` : ''
      }`
    );

    try {
      if (req.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
        const isInitializationRequest = Array.isArray(body)
          ? body.some((message) => message?.method === 'initialize')
          : body?.method === 'initialize';

        if (isInitializationRequest) {
          if (transportSessionId) {
            const existingContext = sessionContextsById.get(transportSessionId);
            if (existingContext) {
              emitLog(
                `♻️  Re-initialization requested. Resetting MCP transport session ${transportSessionId} before processing.`
              );
              await closeSessionContext(existingContext, 'reinitialize');
            }
          }

          const context = await createSessionContext();
          let initializationError: unknown;

          try {
            await context.transport.handleRequest(req, res, body);
          } catch (error) {
            initializationError = error;
            throw error;
          } finally {
            if (!context.sessionId) {
              await closeSessionContext(context, 'failed-initialize');
            } else if (initializationError) {
              await closeSessionContext(context, 'initialize-error');
            } else {
              context.lastSeen = Date.now();
            }
          }

          return;
        }

        if (!transportSessionId) {
          sendJsonError(res, 400, -32000, 'Bad Request: Mcp-Session-Id header is required');
          return;
        }

        const context = sessionContextsById.get(transportSessionId);
        if (!context || context.finalized) {
          sendJsonError(res, 404, -32001, 'Session not found');
          return;
        }

        context.lastSeen = Date.now();
        await context.transport.handleRequest(req, res, body);
        return;
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        if (!transportSessionId) {
          sendJsonError(res, 400, -32000, 'Bad Request: Mcp-Session-Id header is required');
          return;
        }

        const context = sessionContextsById.get(transportSessionId);
        if (!context || context.finalized) {
          sendJsonError(res, 404, -32001, 'Session not found');
          return;
        }

        context.lastSeen = Date.now();
        await context.transport.handleRequest(req, res);

        if (req.method === 'DELETE') {
          await closeSessionContext(context, 'client-delete');
        }
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

  const url = `http://localhost:${resolvedPort}/mcp`;
  emitLog(`⚡ Willi-Mako MCP server listening on ${url}`);
  if (!fallbackToken) {
    emitLog(
      'ℹ️  No default WILLI_MAKO_TOKEN configured. Provide an Authorization header or invoke willi-mako-login to persist credentials per session.'
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
      const contexts = Array.from(activeSessionContexts);
      await Promise.all(contexts.map((context) => closeSessionContext(context, 'shutdown')));
      transportState.clear();
    }
  };
}
