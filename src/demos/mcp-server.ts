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

  type ToolHandlerInput<T> = T & Record<string, unknown>;

  type LoginToolInput = ToolHandlerInput<{
    email: string;
    password: string;
    persistToken?: boolean;
  }>;

  type CreateSessionToolInput = ToolHandlerInput<{
    ttlMinutes?: number;
    preferences?: CreateSessionRequest['preferences'];
    contextSettings?: CreateSessionRequest['contextSettings'];
  }>;

  type SessionIdentifierInput = ToolHandlerInput<{ sessionId: string }>;

  type ChatToolInput = ToolHandlerInput<{
    sessionId?: string;
    message: string;
    contextSettings?: Record<string, unknown>;
    timelineId?: string;
  }>;

  type SemanticSearchToolInput = ToolHandlerInput<{
    sessionId?: string;
    query: string;
    options?: SemanticSearchRequest['options'];
  }>;

  type ReasoningGenerateToolInput = ToolHandlerInput<{
    sessionId?: string;
    query: string;
    messages?: ReasoningGenerateRequest['messages'];
    contextSettingsOverride?: ReasoningGenerateRequest['contextSettingsOverride'];
    preferencesOverride?: ReasoningGenerateRequest['preferencesOverride'];
    overridePipeline?: ReasoningGenerateRequest['overridePipeline'];
    useDetailedIntentAnalysis?: ReasoningGenerateRequest['useDetailedIntentAnalysis'];
  }>;

  type ResolveContextToolInput = ToolHandlerInput<{
    sessionId?: string;
    query: string;
    messages?: ContextResolveRequest['messages'];
    contextSettingsOverride?: ContextResolveRequest['contextSettingsOverride'];
  }>;

  type ClarificationAnalyzeToolInput = ToolHandlerInput<{
    sessionId?: string;
    query: string;
    includeEnhancedQuery?: boolean;
  }>;

  type CreateNodeScriptToolInput = ToolHandlerInput<{
    sessionId?: string;
    source: string;
    timeoutMs?: number;
    metadata?: Record<string, string>;
    tags?: string[];
  }>;

  type GetToolJobInput = ToolHandlerInput<{
    jobId: string;
    includeLogs?: boolean;
  }>;

  type CreateArtifactToolInput = ToolHandlerInput<{
    sessionId?: string;
    type: string;
    name: string;
    mimeType: string;
    encoding: 'utf8' | 'base64';
    content: string;
    description?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
    version?: string;
  }>;

  type ListDocumentsToolInput = ToolHandlerInput<{
    page?: number;
    limit?: number;
    search?: string;
    processed?: boolean;
  }>;

  type DocumentIdentifierInput = ToolHandlerInput<{ documentId: string }>;

  type UpdateDocumentToolInput = ToolHandlerInput<{
    documentId: string;
    title?: string;
    description?: string;
    tags?: string[];
    is_ai_context_enabled?: boolean;
  }>;

  type ToggleAiContextToolInput = ToolHandlerInput<{
    documentId: string;
    enabled: boolean;
  }>;

  type MessageOnlyInput = ToolHandlerInput<{ message: string }>;

  type ChatEdifactToolInput = ToolHandlerInput<{
    message: string;
    currentEdifactMessage: string;
    chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }>;

  type ModifyEdifactToolInput = ToolHandlerInput<{
    instruction: string;
    currentMessage: string;
  }>;

  type MarketPartnerSearchInput = ToolHandlerInput<{
    q: string;
    limit?: number;
  }>;

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
- create-chat-completion – OpenAI-compatible chat completion with RAG enhancement (API v1.1.0+, stateless)
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
- OpenAI-compatible Chat Completions (API v1.1.0+): Drop-in replacement for OpenAI API with automatic RAG enhancement, stateless operation, system instructions support, and collection targeting.
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
          let message: string;

          if (error instanceof WilliMakoError) {
            // Special handling for Willi-Mako API errors
            const details =
              typeof error.body === 'object' && error.body !== null
                ? JSON.stringify(error.body)
                : String(error.body);
            message = `${error.message} (status: ${error.status}) - ${details}`;
            emitLog(`❌ [${invocationId}] ${toolName} failed after ${duration}ms – ${message}`);

            // Check for authentication/token errors (403 or 401)
            if (error.status === 403 || error.status === 401) {
              const isTokenExpired =
                error.message.toLowerCase().includes('token') ||
                error.message.toLowerCase().includes('expired') ||
                error.message.toLowerCase().includes('invalid');

              if (isTokenExpired) {
                const helpMessage = `Authentication failed: ${error.message}

🔑 Your token appears to be invalid or expired. To fix this:

1. **Get a new token via willi-mako-login tool:**
   Call the "willi-mako-login" tool with your email and password:
   {
     "email": "your-email@example.com",
     "password": "your-password",
     "persistToken": true
   }

2. **Or set WILLI_MAKO_TOKEN environment variable:**
   Run: willi-mako auth login
   Then use the token in subsequent requests.

3. **Or use the token-in-path format:**
   https://mcp.stromhaltig.de/<your-token>/mcp

4. **Or use npx to get a new token:**
   npx willi-mako-client auth login -e <youremail> -p <yourpassword>
   Copy the token and use it in your requests.`;

                throw new McpError(ErrorCode.InvalidRequest, helpMessage, error.body);
              }
            }

            // Convert to MCP error for proper client handling
            throw new McpError(
              ErrorCode.InternalError,
              `Willi-Mako API error (${error.status}): ${error.message}`,
              error.body
            );
          } else if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === 'object' && error !== null) {
            // Better handling for error objects (e.g., API errors, Axios errors)
            const errorObj = error as Record<string, unknown>;
            const parts: string[] = [];

            if (errorObj.message && typeof errorObj.message === 'string') {
              parts.push(errorObj.message);
            }
            if (errorObj.code && typeof errorObj.code === 'string') {
              parts.push(`[${errorObj.code}]`);
            }
            if (errorObj.status && typeof errorObj.status === 'number') {
              parts.push(`(status: ${errorObj.status})`);
            }

            message = parts.length > 0 ? parts.join(' ') : JSON.stringify(error);
          } else {
            message = String(error);
          }

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
      async (input: Record<string, unknown>, extra?: RequestContext) => {
        const { email, password, persistToken = true } = input as LoginToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { ttlMinutes, preferences, contextSettings } = input as CreateSessionToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { sessionId } = input as SessionIdentifierInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId } = input as SessionIdentifierInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId, message, contextSettings, timelineId } = input as ChatToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId, query, options } = input as SemanticSearchToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId, query, options } = input as SemanticSearchToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId, message, contextSettings, timelineId } = input as ChatToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId, query, options } = input as SemanticSearchToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId, message, contextSettings, timelineId } = input as ChatToolInput;
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
      'create-chat-completion',
      {
        title: 'OpenAI-compatible chat completion (API v1.1.0+)',
        description:
          '✅ **OpenAI-compatible Chat API** with automatic RAG-Enhancement. Drop-in replacement for OpenAI with stateless operation and automatic QDrant search over 5 collections (ALWAYS active). Perfect for: Migration from OpenAI, external integrations, stateless requests, custom system instructions per request. RAG-Metadata included in response.',
        inputSchema: {
          messages: z
            .array(
              z.object({
                role: z
                  .enum(['system', 'user', 'assistant'])
                  .describe('Role of the message sender'),
                content: z.string().describe('Message content'),
                name: z.string().optional().describe('Optional name of the participant')
              })
            )
            .min(1)
            .describe('Conversation history in OpenAI format'),
          model: z
            .string()
            .optional()
            .default('willi-mako-rag')
            .describe('Model name (optional, will be ignored - we use our active LLM)'),
          temperature: z
            .number()
            .min(0)
            .max(2)
            .optional()
            .default(0.7)
            .describe('Temperature for sampling'),
          max_tokens: z
            .number()
            .int()
            .min(1)
            .max(32000)
            .optional()
            .default(2048)
            .describe('Maximum number of tokens in response'),
          top_p: z.number().min(0).max(1).optional().default(1).describe('Top-p sampling'),
          context_settings: z
            .object({
              includeUserDocuments: z.boolean().optional(),
              includeUserNotes: z.boolean().optional(),
              includeSystemKnowledge: z.boolean().optional().default(true),
              targetCollections: z
                .array(z.enum(['willi_mako', 'willi-netz', 'cs30', 'willi-cs', 's4hu']))
                .optional()
                .describe('Collection Override: Only specific collections. Default: All 5'),
              timelineId: z.string().uuid().optional().describe('Timeline-ID for audit logging')
            })
            .optional()
            .describe('Context settings to augment the automatic QDrant search'),
          session_id: z
            .string()
            .uuid()
            .optional()
            .describe('Optional: Session-ID for state management')
        }
      },
      async (input: Record<string, unknown>, _extra?: RequestContext) =>
        withClient(_extra, async (clientInstance) => {
          const request = input as {
            messages: Array<{ role: string; content: string; name?: string }>;
            model?: string;
            temperature?: number;
            max_tokens?: number;
            top_p?: number;
            context_settings?: Record<string, unknown>;
            session_id?: string;
          };

          const response = await clientInstance.createChatCompletion(request as any);
          return respond(response);
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const {
            sessionId,
            query,
            messages,
            contextSettingsOverride,
            preferencesOverride,
            overridePipeline,
            useDetailedIntentAnalysis
          } = input as ReasoningGenerateToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId, query, messages, contextSettingsOverride } =
            input as ResolveContextToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId, query, includeEnhancedQuery } = input as ClarificationAnalyzeToolInput;
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const { sessionId, source, timeoutMs, metadata, tags } =
            input as CreateNodeScriptToolInput;
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
          return respond({ sessionId: activeSessionId, data: response.data });
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { jobId, includeLogs = true } = input as GetToolJobInput;
          const response = await clientInstance.getToolJob(jobId);
          const data = includeLogs
            ? response.data
            : { ...response.data, job: { ...response.data.job, result: undefined } };
          return respond(data);
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance, transportSessionId) => {
          const {
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
          } = input as CreateArtifactToolInput;
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
          return respond({ sessionId: activeSessionId, data: response.data });
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { page, limit, search, processed } = input as ListDocumentsToolInput;
          const response = await clientInstance.listDocuments({
            page,
            limit,
            search,
            processed
          });
          return respond(response.data);
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { documentId } = input as DocumentIdentifierInput;
          const response = await clientInstance.getDocument(documentId);
          return respond(response.data as unknown as Record<string, unknown>);
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { documentId, title, description, tags, is_ai_context_enabled } =
            input as UpdateDocumentToolInput;
          const response = await clientInstance.updateDocument(documentId, {
            title,
            description,
            tags,
            is_ai_context_enabled
          });
          return respond(response.data as unknown as Record<string, unknown>);
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { documentId } = input as DocumentIdentifierInput;
          await clientInstance.deleteDocument(documentId);
          return respond({ success: true, message: 'Document deleted' });
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { documentId } = input as DocumentIdentifierInput;
          const response = await clientInstance.reprocessDocument(documentId);
          return respond(response.data);
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { documentId, enabled } = input as ToggleAiContextToolInput;
          const response = await clientInstance.toggleAiContext(documentId, enabled);
          return respond(response.data as unknown as Record<string, unknown>);
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { message } = input as MessageOnlyInput;
          const response = await clientInstance.analyzeEdifactMessage({ message });
          return {
            content: [
              {
                type: 'text' as const,
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { message, currentEdifactMessage, chatHistory } = input as ChatEdifactToolInput;
          const response = await clientInstance.chatAboutEdifactMessage({
            message,
            currentEdifactMessage,
            chatHistory
          });
          return {
            content: [
              {
                type: 'text' as const,
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { message } = input as MessageOnlyInput;
          const response = await clientInstance.explainEdifactMessage({ message });
          return {
            content: [
              {
                type: 'text' as const,
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { message } = input as MessageOnlyInput;
          const response = await clientInstance.validateEdifactMessage({ message });
          const summary = `Valid: ${response.data.isValid ? 'Yes' : 'No'}\nMessage Type: ${response.data.messageType || 'Unknown'}\nSegments: ${response.data.segmentCount || 0}\nErrors: ${response.data.errors.length}\nWarnings: ${response.data.warnings.length}`;
          return {
            content: [
              {
                type: 'text' as const,
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
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { instruction, currentMessage } = input as ModifyEdifactToolInput;
          const response = await clientInstance.modifyEdifactMessage({
            instruction,
            currentMessage
          });
          return {
            content: [
              {
                type: 'text' as const,
                text: `Modified message:\n\n${response.data.modifiedMessage}\n\nValid: ${response.data.isValid ? 'Yes' : 'No'}`
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    // Market Partners Search Tool (Version 0.7.1)
    server.registerTool(
      'willi-mako-search-market-partners',
      {
        title: 'Search market partners',
        description:
          'Search for market partners using BDEW/EIC codes, company names, cities, etc. Public endpoint without authentication requirement. Returns detailed information including contacts and software systems.',
        inputSchema: {
          q: z.string().min(1).describe('Search term (code, company name, city, etc.)'),
          limit: z
            .number()
            .int()
            .min(1)
            .max(20)
            .optional()
            .describe('Maximum number of results (1-20, default: 10)')
        }
      },
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { q, limit } = input as MarketPartnerSearchInput;
          const response = await clientInstance.searchMarketPartners({
            q,
            limit
          });

          let summaryText = `Found ${response.data.count} market partner(s) for query "${response.data.query}":\n\n`;

          for (const partner of response.data.results) {
            summaryText += `📊 ${partner.companyName}\n`;
            summaryText += `   Code: ${partner.code} (${partner.codeType})\n`;
            summaryText += `   Source: ${partner.source}\n`;

            if (partner.validFrom || partner.validTo) {
              const validity = [];
              if (partner.validFrom) validity.push(`from ${partner.validFrom}`);
              if (partner.validTo) validity.push(`to ${partner.validTo}`);
              summaryText += `   Valid: ${validity.join(' ')}\n`;
            }

            if (partner.bdewCodes && partner.bdewCodes.length > 0) {
              summaryText += `   BDEW Codes: ${partner.bdewCodes.join(', ')}\n`;
            }

            if (partner.contacts && partner.contacts.length > 0) {
              summaryText += `   Contacts: ${partner.contacts.length} available\n`;
              const firstContact = partner.contacts[0];
              if (firstContact.City) {
                summaryText += `   Location: ${firstContact.PostCode || ''} ${firstContact.City}\n`;
              }
              if (firstContact.CodeContactEmail) {
                summaryText += `   Email: ${firstContact.CodeContactEmail}\n`;
              }
            }

            if (partner.allSoftwareSystems && partner.allSoftwareSystems.length > 0) {
              const systems = partner.allSoftwareSystems
                .map((s) => `${s.name} (${s.confidence})`)
                .join(', ');
              summaryText += `   Software: ${systems}\n`;
            }

            if (partner.contactSheetUrl) {
              summaryText += `   Contact Sheet: ${partner.contactSheetUrl}\n`;
            }

            summaryText += '\n';
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: summaryText
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    // ==================== Structured Data Tools (Version 0.9.2) ====================

    registerTool(
      'willi-mako-structured-data-query',
      {
        title: 'Query structured data',
        description:
          'Executes a structured data query against registered Data Providers. Supports two modes: (1) Explicit capability with parameters or (2) Natural language query with automatic intent resolution. Available capabilities include: market-partner-search, mastr-installations-query, energy-market-prices, grid-production-data, green-energy-forecast.',
        inputSchema: {
          capability: z
            .enum([
              'market-partner-search',
              'mastr-installations-query',
              'energy-market-prices',
              'grid-production-data',
              'green-energy-forecast'
            ])
            .optional()
            .describe('Explicit capability ID (use with parameters)'),
          parameters: z
            .record(z.any())
            .optional()
            .describe('Capability-specific parameters (required with capability)'),
          query: z
            .string()
            .optional()
            .describe('Natural language query (alternative to capability+parameters)'),
          options: z
            .object({
              timeout: z.number().int().min(1000).max(30000).optional(),
              bypassCache: z.boolean().optional()
            })
            .optional()
            .describe('Optional query options')
        }
      },
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { capability, parameters, query, options } = input as {
            capability?: string;
            parameters?: Record<string, unknown>;
            query?: string;
            options?: { timeout?: number; bypassCache?: boolean };
          };

          // Validate input
          if (!capability && !query) {
            throw new Error('Either capability+parameters or query must be provided');
          }
          if (capability && query) {
            throw new Error('Cannot use both capability and query at the same time');
          }

          let payload: any;
          if (capability) {
            if (!parameters) {
              throw new Error('parameters is required when using capability');
            }
            payload = { capability, parameters, options };
          } else {
            payload = { query, options };
          }

          const response = await clientInstance.structuredDataQuery(payload);

          let summaryText = `📊 Structured Data Query Results\n\n`;
          summaryText += `Provider: ${response.metadata.providerId}\n`;
          summaryText += `Capability: ${response.metadata.capability}\n`;
          summaryText += `Data Source: ${response.metadata.dataSource}\n`;
          summaryText += `Execution Time: ${response.metadata.executionTimeMs}ms\n`;
          summaryText += `Cache Hit: ${response.metadata.cacheHit ? 'Yes' : 'No'}\n`;
          summaryText += `Retrieved At: ${response.metadata.retrievedAt}\n`;

          if (response.metadata.intentResolution) {
            summaryText += `\n🧠 Intent Resolution:\n`;
            summaryText += `   Original Query: "${response.metadata.intentResolution.originalQuery}"\n`;
            summaryText += `   Resolved Capability: ${response.metadata.intentResolution.resolvedCapability}\n`;
            summaryText += `   Confidence: ${(response.metadata.intentResolution.confidence * 100).toFixed(1)}%\n`;
            summaryText += `   Reasoning: ${response.metadata.intentResolution.reasoning}\n`;
          }

          summaryText += `\n📦 Data:\n${JSON.stringify(response.data, null, 2)}`;

          return {
            content: [
              {
                type: 'text' as const,
                text: summaryText
              }
            ],
            structuredContent: {
              metadata: response.metadata,
              data: response.data
            } as unknown as Record<string, unknown>
          };
        })
    );

    registerTool(
      'willi-mako-resolve-intent',
      {
        title: 'Resolve intent for natural language query',
        description:
          'Analyzes a natural language query and shows detected capabilities without execution. Useful for testing intent detection and understanding how queries are interpreted. Returns detected capabilities, suggested capability, confidence score, and reasoning.',
        inputSchema: {
          query: z.string().min(1).max(1000).describe('Natural language query to analyze')
        }
      },
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const { query } = input as { query: string };
          const response = await clientInstance.resolveIntent({ query });

          let summaryText = `🔍 Intent Resolution Analysis\n\n`;
          summaryText += `Original Query: "${response.data.originalQuery}"\n\n`;
          summaryText += `✅ Suggested Capability: ${response.data.suggestedCapability}\n`;
          summaryText += `Confidence: ${(response.data.confidence * 100).toFixed(1)}%\n`;
          summaryText += `Reasoning: ${response.data.reasoning}\n\n`;
          summaryText += `Suggested Parameters:\n${JSON.stringify(response.data.suggestedParameters, null, 2)}\n\n`;

          summaryText += `📋 All Detected Capabilities (${response.data.detectedCapabilities.length}):\n`;
          for (const cap of response.data.detectedCapabilities) {
            summaryText += `  • ${cap.capability} (confidence: ${(cap.confidence * 100).toFixed(1)}%)\n`;
            summaryText += `    Parameters: ${JSON.stringify(cap.parameters)}\n`;
          }

          summaryText += `\n🔧 Available Capabilities (${response.data.availableCapabilities.length}):\n`;
          for (const cap of response.data.availableCapabilities) {
            summaryText += `  • ${cap.capability} (provider: ${cap.providerId})\n`;
            if (cap.examples && cap.examples.length > 0) {
              summaryText += `    Examples: ${cap.examples.slice(0, 2).join('; ')}\n`;
            }
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: summaryText
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    registerTool(
      'willi-mako-get-providers',
      {
        title: 'List data providers',
        description:
          'Lists all registered Data Providers with their capabilities and health status. Returns provider metadata, capabilities, and aggregate statistics.',
        inputSchema: {}
      },
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.getProviders();

          let summaryText = `🏢 Registered Data Providers (${response.data.stats.totalProviders})\n\n`;
          summaryText += `Total Capabilities: ${response.data.stats.capabilities.length}\n`;
          summaryText += `Capabilities: ${response.data.stats.capabilities.join(', ')}\n\n`;

          for (const provider of response.data.providers) {
            const statusIcon = provider.healthy ? '✅' : '❌';
            summaryText += `${statusIcon} ${provider.displayName} (${provider.id}) - v${provider.version}\n`;
            summaryText += `   Description: ${provider.description}\n`;
            summaryText += `   Capabilities: ${provider.capabilities.join(', ')}\n`;
            summaryText += `   Status: ${provider.healthy ? 'healthy' : 'degraded'}\n\n`;
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: summaryText
              }
            ],
            structuredContent: response.data as unknown as Record<string, unknown>
          };
        })
    );

    registerTool(
      'willi-mako-get-providers-health',
      {
        title: 'Check data providers health',
        description:
          'Checks the health status of all registered Data Providers. Returns overall system health status and individual provider health information with error messages if applicable.',
        inputSchema: {}
      },
      async (input: Record<string, unknown>, extra?: RequestContext) =>
        withClient(extra, async (clientInstance) => {
          const response = await clientInstance.getProvidersHealth();

          const overallIcon = response.data.overall === 'healthy' ? '✅' : '⚠️';
          let summaryText = `${overallIcon} Overall System Health: ${response.data.overall}\n\n`;

          for (const provider of response.data.providers) {
            const statusIcon = provider.healthy ? '✅' : '❌';
            summaryText += `${statusIcon} ${provider.providerId}\n`;
            summaryText += `   Last Check: ${provider.lastCheckAt}\n`;
            if (provider.errorMessage) {
              summaryText += `   ❌ Error: ${provider.errorMessage}\n`;
            }
            summaryText += '\n';
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: summaryText
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
