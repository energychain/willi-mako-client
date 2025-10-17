/**
 * @module willi-mako-client
 * High-level TypeScript client utilities, CLI exports, and shared constants for the Willi-Mako API v2.
 * Consumers should import from this entrypoint to interact with Marktkommunikation workflows programmatically.
 */
import { createRequire } from 'node:module';
import type {
  CreateArtifactRequest,
  CreateArtifactResponse,
  RunNodeScriptJobRequest,
  RunNodeScriptJobResponse,
  GetToolJobResponse,
  LoginRequest,
  LoginResponse,
  LoginOptions,
  CreateSessionRequest,
  SessionEnvelopeResponse,
  ChatRequest,
  ChatResponse,
  SemanticSearchRequest,
  SemanticSearchResponse,
  ReasoningGenerateRequest,
  ReasoningGenerateResponse,
  ContextResolveRequest,
  ContextResolveResponse,
  ClarificationAnalyzeRequest,
  ClarificationAnalyzeResponse,
  GenerateToolScriptRequest,
  GenerateToolScriptJobOperationResponse
} from './types.js';

const require: NodeJS.Require = createRequire(import.meta.url);
const openApiDocument: Record<string, unknown> = require('../schemas/openapi.json');

export * from './types.js';
export * from './tool-generation.js';

/**
 * Default base URL pointing to the productive Willi-Mako API v2 endpoint.
 * Located at: https://stromhaltig.de/api/v2
 */
export const DEFAULT_BASE_URL = 'https://stromhaltig.de/api/v2';

/**
 * Pre-bundled OpenAPI 3.0 specification for the Willi-Mako API v2.
 * This schema is included in the package for offline access and code generation tools.
 */
export const bundledOpenApiDocument = openApiDocument;

/**
 * Configuration options for the WilliMakoClient.
 */
export interface WilliMakoClientOptions {
  /**
   * Base URL of the Willi-Mako API. Defaults to the productive environment.
   * @default "https://stromhaltig.de/api/v2"
   */
  baseUrl?: string;
  /**
   * Bearer token for API authentication.
   * Falls back to the WILLI_MAKO_TOKEN environment variable if not provided.
   * @default process.env.WILLI_MAKO_TOKEN
   */
  token?: string | null;
  /**
   * Custom fetch implementation for testing or polyfills.
   * @default globalThis.fetch
   */
  fetch?: typeof fetch;
}

/**
 * Additional options for individual API requests.
 */
export interface RequestOptions extends RequestInit {
  /**
   * Skip attaching the Authorization header for public endpoints.
   * @default false
   */
  skipAuth?: boolean;
}

/**
 * Custom error class for Willi-Mako API failures.
 * Provides structured access to HTTP status codes and response bodies.
 *
 * @example
 * ```typescript
 * try {
 *   await client.createArtifact(request);
 * } catch (error) {
 *   if (error instanceof WilliMakoError) {
 *     console.error(`API error ${error.status}:`, error.body);
 *   }
 * }
 * ```
 */
/**
 * Custom error class for Willi-Mako API failures.
 * Provides structured access to HTTP status codes and response bodies.
 *
 * @example
 * ```typescript
 * try {
 *   await client.createArtifact(request);
 * } catch (error) {
 *   if (error instanceof WilliMakoError) {
 *     console.error(`API error ${error.status}:`, error.body);
 *   }
 * }
 * ```
 */
export class WilliMakoError extends Error {
  /** HTTP status code of the failed request */
  public readonly status: number;
  /** Parsed response body (may be an error object or text) */
  public readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'WilliMakoError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Official TypeScript client for the Willi-Mako API v2.
 *
 * Willi-Mako is the knowledge and automation platform for energy market communication
 * (Marktkommunikation) in the German energy sector. This client provides type-safe
 * access to APIs for:
 *
 * - **EDIFACT/edi@energy processing**: Parse, validate, and transform messages
 *   like UTILMD, MSCONS, ORDERS according to market communication standards
 * - **Tooling Sandbox**: Execute Node.js scripts in a secure environment for
 *   testing parsing logic, validation rules, or data transformations
 * - **Artifact Storage**: Store and retrieve ETL outputs, compliance reports,
 *   validation results, or EDIFACT message snapshots
 * - **Market Roles & Billing**: Access reference data for market locations
 *   (Marktlokationen), billing periods, and energy supplier relationships
 *
 * @example
 * **Basic Usage**
 * ```typescript
 * import { WilliMakoClient } from 'willi-mako-client';
 *
 * const client = new WilliMakoClient({
 *   token: process.env.WILLI_MAKO_TOKEN
 * });
 *
 * // Fetch the API schema
 * const schema = await client.getRemoteOpenApiDocument();
 * console.log(schema.info.title);
 * ```
 *
 * @example
 * **Testing EDIFACT Parsing Logic**
 * ```typescript
 * const job = await client.createNodeScriptJob({
 *   sessionId: 'my-session-id',
 *   source: `
 *     // Parse UTILMD message segments
 *     const message = 'UNH+1+UTILMD:D:04B:UN:2.3e';
 *     const segments = message.split('+');
 *     console.log('Message type:', segments[1]);
 *   `,
 *   timeoutMs: 5000
 * });
 *
 * console.log('Job status:', job.data.job.status);
 *
 * // Poll for results
 * const result = await client.getToolJob(job.data.job.id);
 * if (result.data.job.status === 'succeeded') {
 *   console.log('Output:', result.data.job.result?.stdout);
 * }
 * ```
 *
 * @example
 * **Storing Validation Results**
 * ```typescript
 * await client.createArtifact({
 *   sessionId: 'my-session-id',
 *   type: 'validation-report',
 *   name: 'utilmd-validation-2024-03.json',
 *   mimeType: 'application/json',
 *   encoding: 'utf8',
 *   content: JSON.stringify({
 *     timestamp: new Date().toISOString(),
 *     validMessages: 142,
 *     errors: []
 *   }),
 *   tags: ['utilmd', 'validation', 'Q1-2024']
 * });
 * ```
 */
export class WilliMakoClient {
  private baseUrl: string;
  private token: string | null;
  private readonly fetchImpl: typeof fetch;

  /**
   * Creates a new Willi-Mako API client instance.
   *
   * @param options - Configuration options for the client
   *
   * @example
   * ```typescript
   * // Use default productive endpoint with token from environment
   * const client = new WilliMakoClient();
   *
   * // Provide token explicitly
   * const client = new WilliMakoClient({
   *   token: 'your-bearer-token'
   * });
   *
   * // Use custom base URL (e.g., for testing)
   * const client = new WilliMakoClient({
   *   baseUrl: 'http://localhost:3000/api/v2',
   *   token: 'test-token'
   * });
   * ```
   */
  constructor(options: WilliMakoClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.token = options.token ?? process.env.WILLI_MAKO_TOKEN ?? null;
    this.fetchImpl = options.fetch ?? globalThis.fetch;

    if (typeof this.fetchImpl !== 'function') {
      throw new Error(
        'A fetch implementation is required. Provide options.fetch or upgrade to Node.js >= 18.'
      );
    }
  }

  /**
   * Updates the bearer token used for API authentication.
   * Useful for implementing token refresh logic or switching between different user sessions.
   *
   * @param token - The new bearer token, or null to clear authentication
   *
   * @example
   * ```typescript
   * client.setToken('new-token-after-refresh');
   * ```
   */
  public setToken(token: string | null): void {
    this.token = token;
  }

  /**
   * Performs a credential based login flow to obtain a JWT bearer token.
   * On success the token is automatically stored on the client instance.
   *
   * @param credentials - Email/password combination issued by the platform
   * @returns Login response including the access token and expiry timestamp
   */
  public async login(
    credentials: LoginRequest,
    options: LoginOptions = {}
  ): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/token', {
      method: 'POST',
      body: JSON.stringify(credentials),
      headers: {
        'Content-Type': 'application/json'
      },
      skipAuth: true
    });

    if (response.success && response.data?.accessToken && options.persistToken !== false) {
      this.setToken(response.data.accessToken);
    }

    return response;
  }

  /**
   * Returns the currently configured base URL.
   *
   * @returns The base URL (without trailing slash)
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Creates a new workspace session. Sessions group tooling jobs, artefacts and
   * conversational state. They also carry policy information such as market role.
   */
  public async createSession(payload: CreateSessionRequest = {}): Promise<SessionEnvelopeResponse> {
    return this.request<SessionEnvelopeResponse>('/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Retrieves the metadata of an existing session.
   */
  public async getSession(sessionId: string): Promise<SessionEnvelopeResponse> {
    return this.request<SessionEnvelopeResponse>(`/sessions/${encodeURIComponent(sessionId)}`);
  }

  /**
   * Deletes a session and all associated sandbox jobs / artefacts.
   */
  public async deleteSession(sessionId: string): Promise<void> {
    await this.request<void>(`/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
  }

  /**
   * Sends a conversational message to the Willi-Mako chat endpoint.
   */
  public async chat(payload: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Executes a hybrid semantic search against the knowledge base.
   */
  public async semanticSearch(payload: SemanticSearchRequest): Promise<SemanticSearchResponse> {
    return this.request<SemanticSearchResponse>('/retrieval/semantic-search', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Triggers the advanced reasoning pipeline.
   */
  public async generateReasoning(
    payload: ReasoningGenerateRequest
  ): Promise<ReasoningGenerateResponse> {
    return this.request<ReasoningGenerateResponse>('/reasoning/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Resolves the most relevant context for a user query.
   */
  public async resolveContext(payload: ContextResolveRequest): Promise<ContextResolveResponse> {
    return this.request<ContextResolveResponse>('/context/resolve', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Analyzes whether clarification questions are required before continuing.
   */
  public async analyzeClarification(
    payload: ClarificationAnalyzeRequest
  ): Promise<ClarificationAnalyzeResponse> {
    return this.request<ClarificationAnalyzeResponse>('/clarification/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Returns the bundled OpenAPI 3.0 specification.
   * This is the schema that was bundled with this package version.
   *
   * @returns The OpenAPI document object
   *
   * @example
   * ```typescript
   * const schema = client.getBundledOpenApiDocument();
   * console.log('API version:', schema.info.version);
   * ```
   */
  public getBundledOpenApiDocument(): typeof openApiDocument {
    return openApiDocument;
  }

  /**
   * Fetches the current OpenAPI specification from the remote API.
   * Use this to get the most up-to-date schema, which may include newer
   * endpoints or fields not yet available in the bundled version.
   *
   * @returns Promise resolving to the OpenAPI document
   *
   * @example
   * ```typescript
   * const remoteSchema = await client.getRemoteOpenApiDocument();
   * console.log('Available endpoints:', Object.keys(remoteSchema.paths));
   * ```
   */
  public async getRemoteOpenApiDocument(): Promise<unknown> {
    return this.request<unknown>('/openapi.json', { skipAuth: true });
  }

  /**
   * Creates a new Node.js sandbox job for executing custom scripts.
   *
   * The tooling sandbox provides a secure environment for running JavaScript/TypeScript
   * code. Common use cases include:
   * - Testing EDIFACT parsing logic before production deployment
   * - Validating market communication message structures
   * - Prototyping data transformations for ETL pipelines
   * - Running compliance checks on energy data
   *
   * Jobs are executed asynchronously. Use {@link getToolJob} to poll for results.
   *
   * @param payload - Job creation request with source code and configuration
   * @returns Promise resolving to the created job with initial status
   *
   * @example
   * ```typescript
   * const job = await client.createNodeScriptJob({
   *   sessionId: 'session-uuid',
   *   source: `
   *     // Parse MSCONS (meter reading) message
   *     const reading = 'SEQ+Z02+1234';
   *     const parts = reading.split('+');
   *     console.log('Reading value:', parts[2]);
   *   `,
   *   timeoutMs: 3000,
   *   metadata: { messageType: 'MSCONS', purpose: 'parsing-test' }
   * });
   *
   * console.log('Job ID:', job.data.job.id);
   * console.log('Initial status:', job.data.job.status);
   * ```
   */
  public async createNodeScriptJob(
    payload: RunNodeScriptJobRequest
  ): Promise<RunNodeScriptJobResponse> {
    return this.request<RunNodeScriptJobResponse>('/tools/run-node-script', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Retrieves the current status and results of a tooling job.
   *
   * Use this method to poll for job completion after creating a job with
   * {@link createNodeScriptJob}. Jobs may take time to execute depending
   * on queue length and code complexity.
   *
   * @param jobId - The unique identifier of the job
   * @returns Promise resolving to the job details including status and results
   *
   * @example
   * ```typescript
   * // Poll until job completes
   * let job = await client.getToolJob('job-uuid');
   *
   * while (job.data.job.status === 'queued' || job.data.job.status === 'running') {
   *   await new Promise(resolve => setTimeout(resolve, 1000));
   *   job = await client.getToolJob('job-uuid');
   * }
   *
   * if (job.data.job.status === 'succeeded') {
   *   console.log('Output:', job.data.job.result?.stdout);
   * } else {
   *   console.error('Error:', job.data.job.result?.error);
   * }
   * ```
   */
  public async getToolJob(jobId: string): Promise<GetToolJobResponse> {
    return this.request<GetToolJobResponse>(`/tools/jobs/${encodeURIComponent(jobId)}`);
  }

  /**
   * Creates a new artifact to store data snapshots, reports, or EDIFACT messages.
   *
   * Artifacts are versioned data objects associated with a session. They serve as
   * an audit trail for ETL processes and can be used to:
   * - Store imported EDIFACT messages (UTILMD, MSCONS, ORDERS, etc.)
   * - Save validation or compliance reports
   * - Archive ETL transformation results
   * - Keep meter reading snapshots for billing periods
   *
   * @param payload - Artifact creation request with content and metadata
   * @returns Promise resolving to the created artifact details
   *
   * @example
   * **Store an EDIFACT Message**
   * ```typescript
   * await client.createArtifact({
   *   sessionId: 'session-uuid',
   *   type: 'edifact-message',
   *   name: 'UTILMD_Stammdaten_2024-03-15.edi',
   *   mimeType: 'text/plain',
   *   encoding: 'utf8',
   *   content: 'UNH+1+UTILMD:D:04B:UN:2.3e...',
   *   description: 'Stammdatenänderung für Marktlokation DE0001234567890',
   *   tags: ['utilmd', 'stammdaten', 'march-2024'],
   *   version: '1.0'
   * });
   * ```
   *
   * @example
   * **Store a Validation Report**
   * ```typescript
   * const report = {
   *   timestamp: new Date().toISOString(),
   *   messageType: 'MSCONS',
   *   totalMessages: 150,
   *   validMessages: 148,
   *   errors: [
   *     { line: 42, message: 'Invalid meter ID format' }
   *   ]
   * };
   *
   * await client.createArtifact({
   *   sessionId: 'session-uuid',
   *   type: 'validation-report',
   *   name: 'mscons-validation-2024-Q1.json',
   *   mimeType: 'application/json',
   *   encoding: 'utf8',
   *   content: JSON.stringify(report, null, 2),
   *   tags: ['mscons', 'validation', 'Q1-2024']
   * });
   * ```
   */
  public async createArtifact(payload: CreateArtifactRequest): Promise<CreateArtifactResponse> {
    return this.request<CreateArtifactResponse>('/artifacts', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generates a deterministic Node.js tooling script using the dedicated tooling endpoint.
   */
  public async generateToolScript(
    payload: GenerateToolScriptRequest
  ): Promise<GenerateToolScriptJobOperationResponse> {
    return this.request<GenerateToolScriptJobOperationResponse>('/tools/generate-script', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  private resolveUrl(path: string): string {
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    return `${this.baseUrl}${path}`;
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth, headers: providedHeaders, ...init } = options;

    const headers = new Headers(providedHeaders ?? {});
    headers.set('Accept', 'application/json');

    if (!skipAuth && this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await this.fetchImpl(this.resolveUrl(path), {
      ...init,
      headers
    });

    const text = await response.text();
    const body = text.length ? parseJsonSafe(text) : undefined;

    if (!response.ok) {
      const message = (body as { error?: string })?.error ?? response.statusText;
      throw new WilliMakoError(message || 'Request failed', response.status, body);
    }

    return body as T;
  }
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return text;
  }
}
