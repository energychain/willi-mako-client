/**
 * Encoding type for artifact content storage.
 * - `utf8`: Plain text content (recommended for JSON, XML, CSV, EDIFACT text)
 * - `base64`: Binary content (for PDFs, images, or encrypted files)
 */
export type ArtifactEncoding = 'utf8' | 'base64';

/**
 * Login request payload for exchanging credentials against a JWT token.
 */
export interface LoginRequest {
  /** User email used to authenticate against the platform */
  email: string;
  /** Clear text password. Ensure to handle with care and do not log this information. */
  password: string;
}

/**
 * Response returned after a successful login.
 */
export interface LoginResponse {
  /** Indicates whether the authentication succeeded */
  success: boolean;
  data: {
    /** JWT access token that can be used as bearer token */
    accessToken: string;
    /** ISO8601 timestamp when the token expires */
    expiresAt: string;
  };
}

/**
 * Options to control client side handling of the login response.
 */
export interface LoginOptions {
  /**
   * Whether the obtained access token should automatically be stored on the client instance.
   * Defaults to true to simplify common workflows.
   */
  persistToken?: boolean;
}

/**
 * Optional preferences that can be attached to a session during creation.
 */
export interface SessionPreferences {
  /** Companies the user is interested in (used for retrieval biasing) */
  companiesOfInterest?: string[];
  /** Topics the user prefers (used for intent analysis nudging) */
  preferredTopics?: string[];
}

/**
 * Request payload when creating a new Willi-Mako session.
 */
export interface CreateSessionRequest {
  /** Optional preferences to pre-configure the session context */
  preferences?: SessionPreferences;
  /** Arbitrary context configuration passed to the backend */
  contextSettings?: Record<string, unknown>;
  /** Time-to-live in minutes for the session (minimum 1) */
  ttlMinutes?: number;
}

/**
 * Policy flags returned for a session (market role, feature access, ...).
 */
export interface SessionPolicyFlags {
  role?: string;
  canAccessCs30?: boolean;
  [key: string]: unknown;
}

/**
 * Envelope returned when querying or creating a session.
 */
export interface SessionEnvelope {
  sessionId: string;
  userId: string;
  legacyChatId?: string;
  workspaceContext: Record<string, unknown>;
  policyFlags: SessionPolicyFlags;
  preferences: SessionPreferences;
  contextSettings?: Record<string, unknown>;
  expiresAt: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Wrapper response for session operations.
 */
export interface SessionEnvelopeResponse {
  success: boolean;
  data: SessionEnvelope;
}

/**
 * Request payload used to send a chat message through the platform.
 */
export interface ChatRequest {
  sessionId: string;
  message: string;
  contextSettings?: Record<string, unknown>;
  timelineId?: string | null;
}

/**
 * Response returned by the chat endpoint.
 * The exact data structure is subject to change, so it is typed loosely.
 */
export interface ChatResponse {
  success: boolean;
  data: Record<string, unknown>;
}

/**
 * Options that control the semantic retrieval behaviour.
 */
export interface SemanticSearchOptions {
  limit?: number;
  alpha?: number;
  outlineScoping?: boolean;
  excludeVisual?: boolean;
  [key: string]: unknown;
}

/**
 * Single match returned by the semantic search pipeline.
 */
export interface SemanticSearchResultItem {
  id: string;
  score?: number | null;
  payload: Record<string, unknown>;
  highlight?: string | null;
  metadata?: {
    rank?: number;
    originalScore?: number | null;
    mergedScore?: number | null;
    version?: string | number | null;
    [key: string]: unknown;
  };
}

/**
 * Request payload for the semantic search endpoint.
 */
export interface SemanticSearchRequest {
  sessionId: string;
  query: string;
  options?: SemanticSearchOptions;
}

/**
 * Response payload for the semantic search endpoint.
 */
export interface SemanticSearchResponse {
  success: boolean;
  data: {
    sessionId: string;
    query: string;
    totalResults: number;
    durationMs: number;
    options: SemanticSearchOptions;
    results: SemanticSearchResultItem[];
    [key: string]: unknown;
  };
}

/**
 * Message supplied to the reasoning endpoint to provide conversational context.
 */
export interface ReasoningMessage {
  role: string;
  content: string;
}

/**
 * Request payload for the reasoning endpoint.
 */
export interface ReasoningGenerateRequest {
  sessionId: string;
  query: string;
  messages?: ReasoningMessage[];
  contextSettingsOverride?: Record<string, unknown>;
  preferencesOverride?: Record<string, unknown>;
  overridePipeline?: Record<string, unknown>;
  useDetailedIntentAnalysis?: boolean;
}

/**
 * Response payload for the reasoning endpoint.
 */
export interface ReasoningGenerateResponse {
  success: boolean;
  data: {
    sessionId: string;
    response: string;
    reasoningSteps?: unknown[];
    finalQuality?: number;
    iterationsUsed?: number;
    contextAnalysis?: Record<string, unknown>;
    qaAnalysis?: Record<string, unknown>;
    pipelineDecisions?: Record<string, unknown>;
    apiCallsUsed?: number;
    hybridSearchUsed?: boolean;
    hybridSearchAlpha?: number | null;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/**
 * Request payload for context resolution.
 */
export interface ContextResolveRequest {
  sessionId: string;
  query: string;
  messages?: ReasoningMessage[];
  contextSettingsOverride?: Record<string, unknown>;
}

/**
 * Response payload for context resolution.
 */
export interface ContextResolveResponse {
  success: boolean;
  data: {
    sessionId: string;
    contextSettingsUsed: Record<string, unknown>;
    decision: Record<string, unknown>;
    publicContext: string[];
    userContext?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

/**
 * Clarification question suggested by the platform.
 */
export interface ClarificationQuestion {
  id: string;
  question: string;
  category: 'scope' | 'context' | 'detail_level' | 'stakeholder' | 'energy_type' | string;
  options?: string[] | null;
  priority?: number;
}

/**
 * Result of a clarification analysis.
 */
export interface ClarificationAnalysis {
  clarificationNeeded: boolean;
  ambiguityScore?: number;
  detectedTopics?: string[];
  reasoning?: string;
  suggestedQuestions?: ClarificationQuestion[];
  clarificationSessionId?: string | null;
  enhancedQuery?: string | null;
  [key: string]: unknown;
}

/**
 * Request payload for clarification analysis.
 */
export interface ClarificationAnalyzeRequest {
  sessionId: string;
  query: string;
  includeEnhancedQuery?: boolean;
}

/**
 * Response payload for clarification analysis.
 */
export interface ClarificationAnalyzeResponse {
  success: boolean;
  data: {
    sessionId: string;
    query: string;
    analysis: ClarificationAnalysis;
    [key: string]: unknown;
  };
}

/**
 * Storage configuration for inline artifact content.
 * Currently only inline mode is supported where content is stored directly in the API response.
 */
export interface ArtifactStorage {
  /** Storage mode - currently only 'inline' is supported */
  mode: 'inline';
  /** Content encoding type */
  encoding: ArtifactEncoding;
  /** The actual content (encoded according to the encoding property) */
  content: string;
}

/**
 * Optional metadata fields that can be attached to artifacts.
 * Useful for organizing and filtering artifacts in larger ETL workflows.
 */
export interface ArtifactOptionalMetadata {
  /** Human-readable description of the artifact's purpose */
  description?: string;
  /** Semantic version tag (e.g., "1.0.0", "2024-Q1") */
  version?: string;
  /** Array of tags for categorization (e.g., ["mscons", "clearing", "Q1-2024"]) */
  tags?: string[];
  /** Arbitrary JSON metadata for custom application data */
  metadata?: Record<string, unknown> | null;
}

/**
 * Complete artifact object returned by the Willi-Mako API.
 * Artifacts represent snapshots of data at specific points in an ETL process,
 * such as imported EDIFACT files, validation results, or compliance reports.
 */
export interface Artifact extends ArtifactOptionalMetadata {
  /** Unique artifact identifier */
  id: string;
  /** Session ID this artifact belongs to */
  sessionId: string;
  /** Human-readable name (e.g., "import-report.json", "utilmd-validation.xml") */
  name: string;
  /** Domain-specific type (e.g., "etl-output", "edifact-message", "validation-report") */
  type: string;
  /** MIME type of the content (e.g., "application/json", "text/plain") */
  mimeType: string;
  /** Size of the content in bytes */
  byteSize: number;
  /** SHA-256 checksum for content integrity verification */
  checksum: string;
  /** ISO 8601 timestamp when the artifact was created */
  createdAt: string;
  /** ISO 8601 timestamp when the artifact was last updated */
  updatedAt: string;
  /** Storage configuration and content */
  storage: ArtifactStorage;
  /** Optional preview snippet of the content (first few lines/characters) */
  preview: string | null;
}

/**
 * Request payload for creating a new artifact.
 * Use this to store ETL outputs, EDIFACT messages, validation results, or any other data
 * that should be preserved for auditing, debugging, or downstream processing.
 *
 * @example
 * ```typescript
 * const request: CreateArtifactRequest = {
 *   sessionId: 'session-uuid',
 *   type: 'edifact-message',
 *   name: 'UTILMD_20240312.edi',
 *   mimeType: 'text/plain',
 *   encoding: 'utf8',
 *   content: 'UNH+1+UTILMD:D:04B:UN:2.3e...',
 *   tags: ['utilmd', 'stammdaten'],
 *   description: 'UTILMD Stammdatenänderung vom 12.03.2024'
 * };
 * ```
 */
export interface CreateArtifactRequest extends ArtifactOptionalMetadata {
  /** Session ID that owns this artifact */
  sessionId: string;
  /** Domain-specific artifact type */
  type: string;
  /** Human-readable artifact name */
  name: string;
  /** MIME type of the content */
  mimeType: string;
  /** Content encoding (utf8 or base64) */
  encoding: ArtifactEncoding;
  /** The actual content to store (encoded according to encoding parameter) */
  content: string;
}

/**
 * API response after successfully creating an artifact.
 */
export interface CreateArtifactResponse {
  /** Indicates if the operation was successful */
  success: boolean;
  /** Response payload containing the created artifact */
  data: {
    /** Session ID the artifact belongs to */
    sessionId: string;
    /** The complete artifact object with generated ID and metadata */
    artifact: Artifact;
  };
}

/**
 * Status of a tooling sandbox job.
 * Jobs progress through these states as they are processed by the execution engine.
 */
export type ToolJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

/**
 * Metadata about the source code submitted for execution.
 */
export interface ToolJobSourceInfo {
  /** Programming language of the source (currently only 'node' is supported) */
  language: 'node';
  /** SHA-256 hash of the source code */
  hash: string;
  /** Size of the source code in bytes */
  bytes: number;
  /** Preview of the first few lines of code */
  preview: string;
  /** Number of lines in the source code */
  lineCount: number;
}

/**
 * Execution result of a completed or failed job.
 * Contains output streams and timing information.
 */
export interface ToolJobResult {
  /** ISO 8601 timestamp when execution completed */
  completedAt?: string;
  /** Execution duration in milliseconds */
  durationMs?: number;
  /** Standard output captured during execution */
  stdout?: string;
  /** Standard error output captured during execution */
  stderr?: string;
  /** Error message if the job failed */
  error?: string;
}

/**
 * Diagnostic information about job execution capabilities and constraints.
 */
export interface ToolJobDiagnostics {
  /** Whether code execution is currently enabled for this job */
  executionEnabled: boolean;
  /** Additional notes about execution constraints or warnings */
  notes: string[];
}

/**
 * Complete tooling sandbox job object.
 * Represents a Node.js script execution in the Willi-Mako sandbox environment.
 * Useful for testing EDIFACT parsing logic, validation rules, or data transformations
 * before deploying to production ETL pipelines.
 */
export interface ToolJob {
  /** Unique job identifier */
  id: string;
  /** Job type (currently only 'run-node-script' is supported) */
  type: 'run-node-script';
  /** Session ID this job belongs to */
  sessionId: string;
  /** Current execution status */
  status: ToolJobStatus;
  /** ISO 8601 timestamp when the job was created */
  createdAt: string;
  /** ISO 8601 timestamp when the job was last updated */
  updatedAt: string;
  /** Maximum execution time in milliseconds (500-60000) */
  timeoutMs: number;
  /** Optional custom metadata attached to the job */
  metadata: Record<string, unknown> | null;
  /** Information about the submitted source code */
  source: ToolJobSourceInfo;
  /** Execution result (null if job hasn't completed) */
  result: ToolJobResult | null;
  /** Array of warning messages generated during processing */
  warnings: string[];
  /** Execution diagnostics and constraints */
  diagnostics: ToolJobDiagnostics;
}

/**
 * Request payload for creating a Node.js sandbox job.
 * Submit JavaScript/TypeScript code to be executed in a secure sandbox environment.
 *
 * @example
 * ```typescript
 * const request: RunNodeScriptJobRequest = {
 *   sessionId: 'session-uuid',
 *   source: `
 *     // Validate EDIFACT message structure
 *     const message = 'UNH+1+UTILMD:D:04B:UN:2.3e';
 *     const segments = message.split('+');
 *     console.log('Segments:', segments.length);
 *   `,
 *   timeoutMs: 5000,
 *   metadata: { purpose: 'validation-test' }
 * };
 * ```
 */
export interface RunNodeScriptJobRequest {
  /** Session ID that owns the job */
  sessionId: string;
  /** JavaScript/Node.js source code to execute */
  source: string;
  /** Optional timeout in milliseconds (defaults to API-defined value, range: 500-60000) */
  timeoutMs?: number;
  /** Optional custom metadata for tracking and organization */
  metadata?: Record<string, unknown>;
}

/**
 * API response after successfully creating a sandbox job.
 * The job may still be queued or running; poll using getToolJob() to check status.
 */
export interface RunNodeScriptJobResponse {
  /** Indicates if the job was successfully created */
  success: boolean;
  /** Response payload containing the created job */
  data: {
    /** Session ID the job belongs to */
    sessionId: string;
    /** The complete job object with initial status */
    job: ToolJob;
  };
}

/**
 * API response when retrieving an existing tooling job.
 */
export interface GetToolJobResponse {
  /** Indicates if the retrieval was successful */
  success: boolean;
  /** Response payload containing the job */
  data: {
    /** The complete job object with current status and results */
    job: ToolJob;
  };
}

/**
 * Standard API error response structure.
 * Returned when requests fail validation or encounter server errors.
 */
export interface ApiProblem {
  /** Human-readable error message */
  error: string;
  /** Optional machine-readable error code for specific error types */
  code?: string;
  /** HTTP status code of the error response */
  status?: number;
}
