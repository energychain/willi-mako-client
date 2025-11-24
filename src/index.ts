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
  WilliNetzSemanticSearchRequest,
  WilliNetzSemanticSearchResponse,
  WilliNetzChatRequest,
  WilliNetzChatResponse,
  CombinedSemanticSearchRequest,
  CombinedSemanticSearchResponse,
  CombinedChatRequest,
  CombinedChatResponse,
  ReasoningGenerateRequest,
  ReasoningGenerateResponse,
  ContextResolveRequest,
  ContextResolveResponse,
  ClarificationAnalyzeRequest,
  ClarificationAnalyzeResponse,
  GenerateToolScriptRequest,
  GenerateToolScriptJobOperationResponse,
  RepairGenerateToolScriptRequest,
  UploadDocumentRequest,
  UploadDocumentResponse,
  UploadMultipleDocumentsRequest,
  UploadMultipleDocumentsResponse,
  ListDocumentsQuery,
  ListDocumentsResponse,
  GetDocumentResponse,
  UpdateDocumentRequest,
  UpdateDocumentResponse,
  ToggleAiContextRequest,
  ToggleAiContextResponse,
  ReprocessDocumentResponse,
  AnalyzeEdifactMessageRequest,
  AnalyzeEdifactMessageResponse,
  EdifactChatRequest,
  EdifactChatResponse,
  ExplainEdifactMessageRequest,
  ExplainEdifactMessageResponse,
  ValidateEdifactMessageRequest,
  ValidateEdifactMessageResponse,
  ModifyEdifactMessageRequest,
  ModifyEdifactMessageResponse,
  MarketPartnerSearchQuery,
  MarketPartnerSearchResponse,
  StructuredDataQueryRequest,
  StructuredDataQueryResponse,
  ResolveIntentRequest,
  ResolveIntentResponse,
  GetProvidersResponse,
  GetProvidersHealthResponse
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

    if (response.success && response.data?.accessToken) {
      if (options.persistToken === false) {
        this.setToken(null);
      } else {
        this.setToken(response.data.accessToken);
      }
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
   * Executes a semantic search against the willi-netz collection.
   * The willi-netz collection is specialized on network management, regulation, TAB, and asset management.
   * Contains: Energy law (EnWG, StromNEV, ARegV), BNetzA regulations & monitoring reports,
   * TAB from network operators, BDEW guidelines, VDE-FNN instructions, Asset Management (ISO 55000).
   */
  public async williNetzSemanticSearch(
    payload: WilliNetzSemanticSearchRequest
  ): Promise<WilliNetzSemanticSearchResponse> {
    return this.request<WilliNetzSemanticSearchResponse>('/willi-netz/semantic-search', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Chat interaction based on the willi-netz collection.
   * Ideal for questions about: BNetzA regulation, incentive regulation (ARegV),
   * technical connection requirements, §14a EnWG, smart meters, e-mobility, storage, supply quality.
   */
  public async williNetzChat(payload: WilliNetzChatRequest): Promise<WilliNetzChatResponse> {
    return this.request<WilliNetzChatResponse>('/willi-netz/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Executes a combined semantic search across both willi_mako and willi-netz collections.
   * Results include sourceCollection information in the payload.
   * Ideal for cross-cutting research covering both market processes and regulatory/technical network topics.
   */
  public async combinedSemanticSearch(
    payload: CombinedSemanticSearchRequest
  ): Promise<CombinedSemanticSearchResponse> {
    return this.request<CombinedSemanticSearchResponse>('/combined/semantic-search', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Chat interaction with access to both willi_mako and willi-netz collections.
   * Automatically uses the most relevant collection based on the request.
   * Ideal for complex questions covering both market communication aspects (EDIFACT, supplier switch)
   * and regulatory/technical network topics (network fees, TAB, §14a EnWG).
   */
  public async combinedChat(payload: CombinedChatRequest): Promise<CombinedChatResponse> {
    return this.request<CombinedChatResponse>('/combined/chat', {
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

  /**
   * Requests an automatic repair attempt for a failed tooling generation job.
   */
  public async repairToolScript(
    payload: RepairGenerateToolScriptRequest
  ): Promise<GenerateToolScriptJobOperationResponse> {
    return this.request<GenerateToolScriptJobOperationResponse>('/tools/generate-script/repair', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Uploads a single document to the knowledge base.
   *
   * Documents can be PDF, DOCX, TXT, or MD files (max 50MB). They are automatically
   * processed for text extraction and can be included in semantic search and AI chat
   * when `is_ai_context_enabled` is true.
   *
   * @param payload - Document upload request with file and metadata
   * @returns Promise resolving to the uploaded document details
   *
   * @example
   * ```typescript
   * import { readFileSync } from 'fs';
   *
   * const fileBuffer = readFileSync('./compliance-guide.pdf');
   * const response = await client.uploadDocument({
   *   file: fileBuffer,
   *   title: 'GPKE Compliance Guide 2024',
   *   description: 'Internal compliance documentation for GPKE processes',
   *   tags: ['gpke', 'compliance', '2024'],
   *   is_ai_context_enabled: true
   * });
   *
   * console.log('Document ID:', response.data.document.id);
   * ```
   */
  public async uploadDocument(payload: UploadDocumentRequest): Promise<UploadDocumentResponse> {
    const formData = new FormData();

    // Handle file - works in both Node.js and browser
    if (payload.file instanceof Buffer) {
      // Node.js Buffer - convert to ArrayBuffer then to Blob
      const arrayBuffer = payload.file.buffer.slice(
        payload.file.byteOffset,
        payload.file.byteOffset + payload.file.byteLength
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer]);
      formData.append('file', blob, 'document');
    } else {
      // Browser File or Blob
      formData.append('file', payload.file as Blob);
    }

    if (payload.title) {
      formData.append('title', payload.title);
    }

    if (payload.description) {
      formData.append('description', payload.description);
    }

    if (payload.tags) {
      const tagsString = Array.isArray(payload.tags) ? JSON.stringify(payload.tags) : payload.tags;
      formData.append('tags', tagsString);
    }

    if (payload.is_ai_context_enabled !== undefined) {
      formData.append('is_ai_context_enabled', String(payload.is_ai_context_enabled));
    }

    return this.request<UploadDocumentResponse>('/documents/upload', {
      method: 'POST',
      body: formData as unknown as BodyInit,
      // Don't set Content-Type - let fetch set it with boundary for multipart/form-data
      skipAuth: false
    });
  }

  /**
   * Uploads multiple documents at once (max 10 files).
   *
   * @param payload - Multiple document upload request
   * @returns Promise resolving to array of uploaded documents
   *
   * @example
   * ```typescript
   * import { readFileSync } from 'fs';
   *
   * const files = [
   *   readFileSync('./doc1.pdf'),
   *   readFileSync('./doc2.pdf')
   * ];
   *
   * const response = await client.uploadMultipleDocuments({
   *   files: files,
   *   is_ai_context_enabled: true
   * });
   *
   * console.log(`Uploaded ${response.data.documents.length} documents`);
   * ```
   */
  public async uploadMultipleDocuments(
    payload: UploadMultipleDocumentsRequest
  ): Promise<UploadMultipleDocumentsResponse> {
    if (payload.files.length > 10) {
      throw new Error('Maximum 10 files allowed per upload');
    }

    const formData = new FormData();

    for (const file of payload.files) {
      if (file instanceof Buffer) {
        const arrayBuffer = file.buffer.slice(
          file.byteOffset,
          file.byteOffset + file.byteLength
        ) as ArrayBuffer;
        const blob = new Blob([arrayBuffer]);
        formData.append('files', blob, 'document');
      } else {
        formData.append('files', file as Blob);
      }
    }

    if (payload.is_ai_context_enabled !== undefined) {
      formData.append('is_ai_context_enabled', String(payload.is_ai_context_enabled));
    }

    return this.request<UploadMultipleDocumentsResponse>('/documents/upload-multiple', {
      method: 'POST',
      body: formData as unknown as BodyInit,
      skipAuth: false
    });
  } /**
   * Lists all documents with optional pagination, search, and filtering.
   *
   * @param query - Query parameters for filtering and pagination
   * @returns Promise resolving to paginated list of documents
   *
   * @example
   * ```typescript
   * // Get first page with default settings
   * const response = await client.listDocuments();
   *
   * // Search for specific documents
   * const searchResults = await client.listDocuments({
   *   search: 'GPKE',
   *   processed: true,
   *   page: 1,
   *   limit: 20
   * });
   *
   * console.log(`Found ${searchResults.data.pagination.total} documents`);
   * searchResults.data.documents.forEach(doc => {
   *   console.log(`- ${doc.title} (${doc.file_size} bytes)`);
   * });
   * ```
   */
  public async listDocuments(query: ListDocumentsQuery = {}): Promise<ListDocumentsResponse> {
    const params = new URLSearchParams();

    if (query.page) {
      params.append('page', String(query.page));
    }

    if (query.limit) {
      params.append('limit', String(query.limit));
    }

    if (query.search) {
      params.append('search', query.search);
    }

    if (query.processed !== undefined) {
      params.append('processed', String(query.processed));
    }

    const queryString = params.toString();
    const path = queryString ? `/documents?${queryString}` : '/documents';

    return this.request<ListDocumentsResponse>(path);
  }

  /**
   * Retrieves a single document by its ID.
   *
   * @param documentId - The unique document identifier
   * @returns Promise resolving to the document details
   *
   * @example
   * ```typescript
   * const document = await client.getDocument('doc-uuid');
   * console.log('Title:', document.data.title);
   * console.log('Processed:', document.data.is_processed);
   * console.log('Extracted text length:', document.data.extracted_text_length);
   * ```
   */
  public async getDocument(documentId: string): Promise<GetDocumentResponse> {
    return this.request<GetDocumentResponse>(`/documents/${encodeURIComponent(documentId)}`);
  }

  /**
   * Updates document metadata (title, description, tags, AI context setting).
   *
   * @param documentId - The unique document identifier
   * @param payload - Fields to update
   * @returns Promise resolving to the updated document
   *
   * @example
   * ```typescript
   * const updated = await client.updateDocument('doc-uuid', {
   *   title: 'Updated GPKE Guide 2024',
   *   description: 'Revised compliance documentation',
   *   tags: ['gpke', 'compliance', '2024', 'revised'],
   *   is_ai_context_enabled: true
   * });
   * ```
   */
  public async updateDocument(
    documentId: string,
    payload: UpdateDocumentRequest
  ): Promise<UpdateDocumentResponse> {
    return this.request<UpdateDocumentResponse>(`/documents/${encodeURIComponent(documentId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Deletes a document permanently.
   *
   * @param documentId - The unique document identifier
   * @returns Promise that resolves when the document is deleted
   *
   * @example
   * ```typescript
   * await client.deleteDocument('doc-uuid');
   * console.log('Document deleted successfully');
   * ```
   */
  public async deleteDocument(documentId: string): Promise<void> {
    await this.request<void>(`/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE'
    });
  }

  /**
   * Downloads the original document file.
   *
   * @param documentId - The unique document identifier
   * @returns Promise resolving to the file content as ArrayBuffer
   *
   * @example
   * ```typescript
   * import { writeFileSync } from 'fs';
   *
   * const fileData = await client.downloadDocument('doc-uuid');
   * writeFileSync('./downloaded.pdf', Buffer.from(fileData));
   * ```
   */
  public async downloadDocument(documentId: string): Promise<ArrayBuffer> {
    const response = await this.fetchImpl(
      this.resolveUrl(`/documents/${encodeURIComponent(documentId)}/download`),
      {
        method: 'GET',
        headers: {
          Authorization: this.token ? `Bearer ${this.token}` : ''
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      const body = text.length ? parseJsonSafe(text) : undefined;

      // Extract error message from various possible response structures
      let message: string;
      const bodyObj = body as Record<string, unknown> | undefined;

      if (bodyObj?.error) {
        if (typeof bodyObj.error === 'string') {
          message = bodyObj.error;
        } else if (typeof bodyObj.error === 'object' && bodyObj.error !== null) {
          const errorObj = bodyObj.error as Record<string, unknown>;
          message =
            typeof errorObj.message === 'string' ? errorObj.message : JSON.stringify(bodyObj.error);
        } else {
          message = String(bodyObj.error);
        }
      } else if (typeof bodyObj?.message === 'string') {
        message = bodyObj.message;
      } else {
        message = response.statusText || 'Download failed';
      }

      throw new WilliMakoError(message, response.status, body);
    }

    return response.arrayBuffer();
  }

  /**
   * Triggers reprocessing of a document (re-extraction of text and re-embedding).
   *
   * Useful when a document failed to process initially or when you want to
   * refresh the extracted content with updated processing logic.
   *
   * @param documentId - The unique document identifier
   * @returns Promise resolving to the reprocessing status message
   *
   * @example
   * ```typescript
   * const response = await client.reprocessDocument('doc-uuid');
   * console.log(response.data.message); // "Reprocessing started"
   * ```
   */
  public async reprocessDocument(documentId: string): Promise<ReprocessDocumentResponse> {
    return this.request<ReprocessDocumentResponse>(
      `/documents/${encodeURIComponent(documentId)}/reprocess`,
      {
        method: 'POST'
      }
    );
  }

  /**
   * Toggles whether a document should be included in AI context for chat and reasoning.
   *
   * When enabled, the document's content will be available to semantic search and
   * can be referenced in chat responses and reasoning pipelines.
   *
   * @param documentId - The unique document identifier
   * @param enabled - Whether to enable or disable AI context
   * @returns Promise resolving to the updated document
   *
   * @example
   * ```typescript
   * // Enable AI context for a document
   * await client.toggleAiContext('doc-uuid', true);
   *
   * // Disable AI context
   * await client.toggleAiContext('doc-uuid', false);
   * ```
   */
  public async toggleAiContext(
    documentId: string,
    enabled: boolean
  ): Promise<ToggleAiContextResponse> {
    const payload: ToggleAiContextRequest = { enabled };
    return this.request<ToggleAiContextResponse>(
      `/documents/${encodeURIComponent(documentId)}/ai-context`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  // =====================================================================
  // EDIFACT Message Analyzer Methods (Version 0.7.0)
  // =====================================================================

  /**
   * Analyzes an EDIFACT message structurally.
   *
   * Performs a structural analysis of an EDIFACT message, extracts segments,
   * and enriches them with code lookup information from BDEW/EIC databases.
   *
   * @param payload - Request containing the EDIFACT message to analyze
   * @returns Promise resolving to the analysis result with structured data
   *
   * @example
   * ```typescript
   * const analysis = await client.analyzeEdifactMessage({
   *   message: 'UNH+00000000001111+MSCONS:D:11A:UN:2.6e\\nBGM+E01+1234567890+9\\nUNT+3+00000000001111'
   * });
   *
   * console.log('Format:', analysis.data.format);
   * console.log('Summary:', analysis.data.summary);
   * console.log('Segments:', analysis.data.structuredData.segments.length);
   *
   * analysis.data.structuredData.segments.forEach(segment => {
   *   console.log(`${segment.tag}: ${segment.description}`);
   *   if (segment.resolvedCodes) {
   *     console.log('Resolved codes:', segment.resolvedCodes);
   *   }
   * });
   * ```
   */
  public async analyzeEdifactMessage(
    payload: AnalyzeEdifactMessageRequest
  ): Promise<AnalyzeEdifactMessageResponse> {
    return this.request<AnalyzeEdifactMessageResponse>('/message-analyzer/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Enables interactive chat about an EDIFACT message.
   *
   * Ask questions and have discussions about an EDIFACT message with a context-aware
   * AI assistant that understands market communication standards and EDIFACT structure.
   *
   * @param payload - Request with message, chat history, and current EDIFACT context
   * @returns Promise resolving to the AI assistant's response
   *
   * @example
   * ```typescript
   * const edifactMessage = 'UNH+1+MSCONS:D:11A:UN:2.6e\\n...';
   *
   * // First question
   * const response1 = await client.chatAboutEdifactMessage({
   *   message: 'Welche Zählernummer ist in dieser Nachricht enthalten?',
   *   currentEdifactMessage: edifactMessage
   * });
   *
   * console.log('Answer:', response1.data.response);
   *
   * // Follow-up question with history
   * const response2 = await client.chatAboutEdifactMessage({
   *   message: 'In welchem Zeitfenster ist der Verbrauch am höchsten?',
   *   chatHistory: [
   *     { role: 'user', content: 'Welche Zählernummer ist in dieser Nachricht enthalten?' },
   *     { role: 'assistant', content: response1.data.response }
   *   ],
   *   currentEdifactMessage: edifactMessage
   * });
   * ```
   */
  public async chatAboutEdifactMessage(payload: EdifactChatRequest): Promise<EdifactChatResponse> {
    return this.request<EdifactChatResponse>('/message-analyzer/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generates a human-readable explanation of an EDIFACT message.
   *
   * Uses LLM and expert knowledge to create a structured, understandable explanation
   * of what the EDIFACT message contains and represents in business terms.
   *
   * @param payload - Request containing the EDIFACT message to explain
   * @returns Promise resolving to the generated explanation
   *
   * @example
   * ```typescript
   * const explanation = await client.explainEdifactMessage({
   *   message: 'UNH+1+UTILMD:D:04B:UN:2.3e\\nBGM+E01+123456+9\\n...'
   * });
   *
   * console.log('Explanation:');
   * console.log(explanation.data.explanation);
   * ```
   */
  public async explainEdifactMessage(
    payload: ExplainEdifactMessageRequest
  ): Promise<ExplainEdifactMessageResponse> {
    return this.request<ExplainEdifactMessageResponse>('/message-analyzer/explanation', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Validates an EDIFACT message structurally and semantically.
   *
   * Performs comprehensive validation with detailed error and warning lists.
   * Checks both EDIFACT structure and business logic according to market communication rules.
   *
   * @param payload - Request containing the EDIFACT message to validate
   * @returns Promise resolving to the validation result with errors and warnings
   *
   * @example
   * ```typescript
   * const validation = await client.validateEdifactMessage({
   *   message: 'UNH+1+MSCONS:D:11A:UN:2.6e\\n...'
   * });
   *
   * console.log('Valid:', validation.data.isValid);
   * console.log('Message Type:', validation.data.messageType);
   * console.log('Segments:', validation.data.segmentCount);
   *
   * if (validation.data.errors.length > 0) {
   *   console.log('Errors:');
   *   validation.data.errors.forEach(error => console.log(`  - ${error}`));
   * }
   *
   * if (validation.data.warnings.length > 0) {
   *   console.log('Warnings:');
   *   validation.data.warnings.forEach(warning => console.log(`  - ${warning}`));
   * }
   * ```
   */
  public async validateEdifactMessage(
    payload: ValidateEdifactMessageRequest
  ): Promise<ValidateEdifactMessageResponse> {
    return this.request<ValidateEdifactMessageResponse>('/message-analyzer/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Modifies an EDIFACT message based on natural language instructions.
   *
   * Uses AI to understand and apply modifications while maintaining valid EDIFACT structure.
   * Perfect for testing scenarios or creating message variants.
   *
   * @param payload - Request with modification instruction and current message
   * @returns Promise resolving to the modified message and validation status
   *
   * @example
   * ```typescript
   * const modified = await client.modifyEdifactMessage({
   *   instruction: 'Erhöhe den Verbrauch in jedem Zeitfenster um 10%',
   *   currentMessage: 'UNH+1+MSCONS:D:11A:UN:2.6e\\n...'
   * });
   *
   * console.log('Modified message:');
   * console.log(modified.data.modifiedMessage);
   * console.log('Valid:', modified.data.isValid);
   *
   * // Save modified message
   * await client.createArtifact({
   *   sessionId: 'session-uuid',
   *   type: 'edifact-message',
   *   name: 'modified-mscons.edi',
   *   mimeType: 'text/plain',
   *   encoding: 'utf8',
   *   content: modified.data.modifiedMessage,
   *   tags: ['mscons', 'modified']
   * });
   * ```
   */
  public async modifyEdifactMessage(
    payload: ModifyEdifactMessageRequest
  ): Promise<ModifyEdifactMessageResponse> {
    return this.request<ModifyEdifactMessageResponse>('/message-analyzer/modify', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Searches for market partners using BDEW/EIC codes, company names, cities, etc.
   * This is a public endpoint that does not require authentication.
   *
   * @param query - Search parameters including the search term, optional limit, and optional role filter
   * @returns Search results containing market partner information
   *
   * @example
   * ```typescript
   * // Search by company name
   * const results = await client.searchMarketPartners({
   *   q: 'Stadtwerke München',
   *   limit: 5
   * });
   *
   * // Search for distribution network operators (VNB)
   * const vnbResults = await client.searchMarketPartners({
   *   q: 'Stadtwerke',
   *   role: 'VNB',
   *   limit: 20
   * });
   *
   * for (const partner of results.data.results) {
   *   console.log(`${partner.companyName} (${partner.code})`);
   *   console.log(`  Type: ${partner.codeType}, Source: ${partner.source}`);
   *   if (partner.contacts?.length) {
   *     console.log(`  Contacts: ${partner.contacts.length}`);
   *   }
   *   if (partner.allSoftwareSystems?.length) {
   *     console.log(`  Software: ${partner.allSoftwareSystems.map(s => s.name).join(', ')}`);
   *   }
   * }
   *
   * // Search by BDEW code
   * const codeResults = await client.searchMarketPartners({
   *   q: '9900123456789'
   * });
   * ```
   */
  public async searchMarketPartners(
    query: MarketPartnerSearchQuery
  ): Promise<MarketPartnerSearchResponse> {
    const params = new URLSearchParams();

    if (query.q !== undefined) {
      params.set('q', query.q);
    }

    if (query.limit !== undefined) {
      params.set('limit', query.limit.toString());
    }

    if (query.role !== undefined) {
      params.set('role', query.role);
    }

    return this.request<MarketPartnerSearchResponse>(
      `/market-partners/search?${params.toString()}`,
      {
        method: 'GET',
        skipAuth: true // Public endpoint
      }
    );
  }

  /**
   * Executes a structured data query against registered Data Providers.
   * Supports two modes:
   * 1. Explicit capability with parameters
   * 2. Natural language query with automatic intent resolution
   *
   * @param payload - Query request (explicit or natural language)
   * @returns Provider-specific data and metadata
   *
   * @example
   * ```typescript
   * // Explicit capability query
   * const explicitResult = await client.structuredDataQuery({
   *   capability: 'market-partner-search',
   *   parameters: {
   *     q: 'netz',
   *     limit: 5
   *   }
   * });
   *
   * // Natural language query
   * const nlResult = await client.structuredDataQuery({
   *   query: 'Wie viele Solaranlagen gibt es in Bayern?'
   * });
   *
   * console.log('Provider:', nlResult.metadata.providerId);
   * console.log('Capability:', nlResult.metadata.capability);
   * console.log('Execution time:', nlResult.metadata.executionTimeMs, 'ms');
   * console.log('Cache hit:', nlResult.metadata.cacheHit);
   *
   * if (nlResult.metadata.intentResolution) {
   *   console.log('Original query:', nlResult.metadata.intentResolution.originalQuery);
   *   console.log('Confidence:', nlResult.metadata.intentResolution.confidence);
   * }
   *
   * console.log('Data:', nlResult.data);
   * ```
   */
  public async structuredDataQuery(
    payload: StructuredDataQueryRequest
  ): Promise<StructuredDataQueryResponse> {
    return this.request<StructuredDataQueryResponse>('/structured-data/query', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Analyzes a natural language query and shows detected capabilities without execution.
   * Useful for testing intent detection and understanding how queries are interpreted.
   *
   * @param payload - Request with natural language query
   * @returns Detected capabilities, suggested capability, and reasoning
   *
   * @example
   * ```typescript
   * const intent = await client.resolveIntent({
   *   query: 'Wie viele Windkraftanlagen gibt es in Schleswig-Holstein?'
   * });
   *
   * console.log('Original query:', intent.data.originalQuery);
   * console.log('Suggested capability:', intent.data.suggestedCapability);
   * console.log('Confidence:', intent.data.confidence);
   * console.log('Reasoning:', intent.data.reasoning);
   *
   * console.log('\nDetected capabilities:');
   * for (const cap of intent.data.detectedCapabilities) {
   *   console.log(`  - ${cap.capability} (confidence: ${cap.confidence})`);
   *   console.log(`    Parameters:`, cap.parameters);
   * }
   *
   * console.log('\nAvailable capabilities:');
   * for (const cap of intent.data.availableCapabilities) {
   *   console.log(`  - ${cap.capability} (provider: ${cap.providerId})`);
   *   console.log(`    Examples:`, cap.examples);
   * }
   * ```
   */
  public async resolveIntent(payload: ResolveIntentRequest): Promise<ResolveIntentResponse> {
    return this.request<ResolveIntentResponse>('/structured-data/resolve-intent', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Lists all registered Data Providers with their capabilities and health status.
   *
   * @returns List of providers with their metadata and aggregate statistics
   *
   * @example
   * ```typescript
   * const providers = await client.getProviders();
   *
   * console.log(`Total providers: ${providers.data.stats.totalProviders}`);
   * console.log(`Available capabilities: ${providers.data.stats.capabilities.join(', ')}`);
   *
   * for (const provider of providers.data.providers) {
   *   console.log(`\n${provider.displayName} (${provider.id}) - v${provider.version}`);
   *   console.log(`  Status: ${provider.healthy ? 'healthy' : 'degraded'}`);
   *   console.log(`  Description: ${provider.description}`);
   *   console.log(`  Capabilities: ${provider.capabilities.join(', ')}`);
   * }
   * ```
   */
  public async getProviders(): Promise<GetProvidersResponse> {
    return this.request<GetProvidersResponse>('/structured-data/providers', {
      method: 'GET'
    });
  }

  /**
   * Checks the health status of all registered Data Providers.
   *
   * @returns Overall health status and individual provider health information
   *
   * @example
   * ```typescript
   * const health = await client.getProvidersHealth();
   *
   * console.log(`Overall status: ${health.data.overall}`);
   *
   * for (const provider of health.data.providers) {
   *   const status = provider.healthy ? '✓' : '✗';
   *   console.log(`${status} ${provider.providerId}`);
   *   console.log(`  Last check: ${provider.lastCheckAt}`);
   *   if (provider.errorMessage) {
   *     console.log(`  Error: ${provider.errorMessage}`);
   *   }
   * }
   * ```
   */
  public async getProvidersHealth(): Promise<GetProvidersHealthResponse> {
    return this.request<GetProvidersHealthResponse>('/structured-data/health', {
      method: 'GET'
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
      // Extract error message from various possible response structures
      let message: string;
      const bodyObj = body as Record<string, unknown> | undefined;

      if (bodyObj?.error) {
        if (typeof bodyObj.error === 'string') {
          // Simple string error: { error: "message" }
          message = bodyObj.error;
        } else if (typeof bodyObj.error === 'object' && bodyObj.error !== null) {
          // Nested error object: { error: { message: "..." } }
          const errorObj = bodyObj.error as Record<string, unknown>;
          message =
            typeof errorObj.message === 'string' ? errorObj.message : JSON.stringify(bodyObj.error);
        } else {
          message = String(bodyObj.error);
        }
      } else if (typeof bodyObj?.message === 'string') {
        // Direct message: { message: "..." }
        message = bodyObj.message;
      } else {
        message = response.statusText || 'Request failed';
      }

      throw new WilliMakoError(message, response.status, body);
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
