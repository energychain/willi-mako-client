#!/usr/bin/env node

import { Command } from 'commander';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { inspect } from 'node:util';
import {
  DEFAULT_BASE_URL,
  WilliMakoClient,
  bundledOpenApiDocument,
  WilliMakoError,
  type WilliMakoClientOptions,
  type RunNodeScriptJobRequest,
  type CreateSessionRequest,
  type ChatRequest,
  type SemanticSearchRequest,
  type ReasoningGenerateRequest,
  type ContextResolveRequest,
  type ClarificationAnalyzeRequest
} from './index.js';
import {
  applyLoginEnvironmentToken,
  applySessionEnvironmentId,
  clearSessionEnvironmentId,
  formatEnvExport,
  type SupportedShell
} from './cli-utils.js';

const program = new Command();

program
  .name('willi-mako')
  .description('CLI tooling for the Willi-Mako API v2')
  .option('-b, --base-url <url>', 'Override the API base URL', DEFAULT_BASE_URL)
  .option('-t, --token <token>', 'Bearer token (falls back to $WILLI_MAKO_TOKEN)');

program
  .command('openapi')
  .description('Print the OpenAPI document (remote by default)')
  .option('--local', 'Use the bundled schema instead of fetching the remote document', false)
  .action(async (options) => {
    const client = createClient();

    if (options.local) {
      outputJson(bundledOpenApiDocument);
      return;
    }

    const document = await client.getRemoteOpenApiDocument();
    outputJson(document);
  });

const auth = program.command('auth').description('Authentication helpers');

auth
  .command('login')
  .description('Exchange email/password credentials for a JWT access token')
  .requiredOption('-e, --email <email>', 'Email address used for authentication')
  .requiredOption('-p, --password <password>', 'Password used for authentication')
  .option('--no-store', 'Do not persist the retrieved token on this client instance')
  .option('--export-env', 'Print shell export statement for WILLI_MAKO_TOKEN', false)
  .option('--shell <shell>', 'Shell for --export-env output (posix|powershell|cmd)', 'posix')
  .option('--json', 'Print JSON response payload', true)
  .action(
    async (options: {
      email: string;
      password: string;
      store?: boolean;
      exportEnv?: boolean;
      shell?: SupportedShell;
      json?: boolean;
    }) => {
      const client = createClient();
      const response = await client.login(
        {
          email: options.email,
          password: options.password
        },
        {
          persistToken: options.store !== false
        }
      );

      applyLoginEnvironmentToken(response);

      if (options.exportEnv && response.success) {
        const token = response.data?.accessToken;
        if (token) {
          process.stdout.write(
            `${formatEnvExport('WILLI_MAKO_TOKEN', token, resolveShell(options.shell))}\n`
          );
        }
      }

      if (options.json !== false) {
        outputJson(response);
      }
    }
  );

const sessions = program.command('sessions').description('Manage Willi-Mako sessions');

sessions
  .command('create')
  .description('Create a new session with optional preferences or context overrides')
  .option(
    '--preferences <json>',
    'JSON encoded preferences (companiesOfInterest, preferredTopics)',
    parseJsonOptional
  )
  .option('--context <json>', 'JSON encoded context settings object', parseJsonOptional)
  .option('--ttl <minutes>', 'Time-to-live in minutes', parseIntBase10)
  .option('--export-env', 'Print shell export statement for WILLI_MAKO_SESSION_ID', false)
  .option('--shell <shell>', 'Shell for --export-env output (posix|powershell|cmd)', 'posix')
  .option('--json', 'Print JSON response payload', true)
  .action(
    async (options: {
      preferences?: unknown;
      context?: unknown;
      ttl?: number;
      exportEnv?: boolean;
      shell?: SupportedShell;
      json?: boolean;
    }) => {
      const client = createClient({ requireToken: true });
      const payload: CreateSessionRequest = {
        preferences: (options.preferences as CreateSessionRequest['preferences']) ?? undefined,
        contextSettings: (options.context as Record<string, unknown>) ?? undefined,
        ttlMinutes: options.ttl ?? undefined
      };

      const response = await client.createSession(payload);
      applySessionEnvironmentId(response);

      if (options.exportEnv && response.success) {
        const sessionId = response.data?.sessionId;
        if (sessionId) {
          process.stdout.write(
            `${formatEnvExport('WILLI_MAKO_SESSION_ID', sessionId, resolveShell(options.shell))}\n`
          );
        }
      }

      if (options.json !== false) {
        outputJson(response);
      }
    }
  );

sessions
  .command('get <sessionId>')
  .description('Retrieve an existing session by its identifier')
  .option('--export-env', 'Print shell export statement for WILLI_MAKO_SESSION_ID', false)
  .option('--shell <shell>', 'Shell for --export-env output (posix|powershell|cmd)', 'posix')
  .option('--json', 'Print JSON response payload', true)
  .action(
    async (
      sessionId: string,
      options: { exportEnv?: boolean; shell?: SupportedShell; json?: boolean }
    ) => {
      const client = createClient({ requireToken: true });
      const response = await client.getSession(sessionId);
      applySessionEnvironmentId(response);

      if (options.exportEnv && response.success) {
        const sessionIdValue = response.data?.sessionId;
        if (sessionIdValue) {
          process.stdout.write(
            `${formatEnvExport('WILLI_MAKO_SESSION_ID', sessionIdValue, resolveShell(options.shell))}\n`
          );
        }
      }

      if (options.json !== false) {
        outputJson(response);
      }
    }
  );

sessions
  .command('delete <sessionId>')
  .description('Delete an existing session')
  .option('--json', 'Print JSON response payload', true)
  .action(async (sessionId: string, options: { json?: boolean }) => {
    const client = createClient({ requireToken: true });
    await client.deleteSession(sessionId);
    clearSessionEnvironmentId(sessionId);

    if (options.json !== false) {
      outputJson({ success: true, sessionId });
    }
  });

const chat = program.command('chat').description('Conversational interface helpers');

chat
  .command('send')
  .description('Send a message to the conversational Willi-Mako endpoint')
  .requiredOption('-s, --session <sessionId>', 'Session identifier used for the conversation')
  .requiredOption('-m, --message <message>', 'Message content to send to the assistant')
  .option('--context <json>', 'Optional JSON object overriding context settings', parseJsonOptional)
  .option(
    '--timeline <uuid>',
    'Optional Timeline identifier to link the message to an existing flow'
  )
  .action(
    async (options: { session: string; message: string; context?: unknown; timeline?: string }) => {
      const client = createClient({ requireToken: true });
      const payload: ChatRequest = {
        sessionId: options.session,
        message: options.message,
        contextSettings: (options.context as Record<string, unknown>) ?? undefined,
        timelineId: options.timeline ?? undefined
      };

      const response = await client.chat(payload);
      outputJson(response);
    }
  );

const retrieval = program.command('retrieval').description('Knowledge retrieval helpers');

retrieval
  .command('semantic-search')
  .description('Run a semantic search query within the Willi-Mako knowledge base')
  .requiredOption('-s, --session <sessionId>', 'Session identifier owning the retrieval')
  .requiredOption('-q, --query <query>', 'Search query expressed in natural language')
  .option(
    '--options <json>',
    'Additional engine options (limit, alpha, outlineScoping, excludeVisual)',
    parseJsonOptional
  )
  .action(async (options: { session: string; query: string; options?: unknown }) => {
    const client = createClient({ requireToken: true });
    const payload: SemanticSearchRequest = {
      sessionId: options.session,
      query: options.query,
      options: options.options as SemanticSearchRequest['options']
    };

    const response = await client.semanticSearch(payload);
    outputJson(response);
  });

const reasoning = program.command('reasoning').description('Advanced reasoning workflows');

reasoning
  .command('generate')
  .description('Trigger the hybrid reasoning engine for a given query')
  .requiredOption('-s, --session <sessionId>', 'Session identifier to scope the reasoning')
  .requiredOption('-q, --query <query>', 'Primary question or instruction')
  .option(
    '--messages <json>',
    'Optional JSON array of prior conversation messages',
    parseJsonOptional
  )
  .option('--context <json>', 'Optional JSON object overriding context settings', parseJsonOptional)
  .option('--preferences <json>', 'Optional JSON object overriding preferences', parseJsonOptional)
  .option('--pipeline <json>', 'Optional JSON pipeline overrides', parseJsonOptional)
  .option('--detailed-intent', 'Enable detailed intent analysis', false)
  .action(
    async (options: {
      session: string;
      query: string;
      messages?: unknown;
      context?: unknown;
      preferences?: unknown;
      pipeline?: unknown;
      detailedIntent?: boolean;
    }) => {
      const client = createClient({ requireToken: true });
      const payload: ReasoningGenerateRequest = {
        sessionId: options.session,
        query: options.query,
        messages: options.messages as ReasoningGenerateRequest['messages'],
        contextSettingsOverride: (options.context as Record<string, unknown>) ?? undefined,
        preferencesOverride: (options.preferences as Record<string, unknown>) ?? undefined,
        overridePipeline: (options.pipeline as Record<string, unknown>) ?? undefined,
        useDetailedIntentAnalysis: options.detailedIntent ?? undefined
      };

      const response = await client.generateReasoning(payload);
      outputJson(response);
    }
  );

const context = program.command('context').description('Context resolution helpers');

context
  .command('resolve')
  .description('Resolve workspace context and decision scaffolding for a query')
  .requiredOption('-s, --session <sessionId>', 'Session identifier used for the request')
  .requiredOption('-q, --query <query>', 'User request requiring context resolution')
  .option('--messages <json>', 'Optional JSON array of prior messages', parseJsonOptional)
  .option('--context <json>', 'Optional context override', parseJsonOptional)
  .action(
    async (options: { session: string; query: string; messages?: unknown; context?: unknown }) => {
      const client = createClient({ requireToken: true });
      const payload: ContextResolveRequest = {
        sessionId: options.session,
        query: options.query,
        messages: options.messages as ContextResolveRequest['messages'],
        contextSettingsOverride: (options.context as Record<string, unknown>) ?? undefined
      };

      const response = await client.resolveContext(payload);
      outputJson(response);
    }
  );

const clarification = program
  .command('clarification')
  .description('Clarification workflow helpers');

clarification
  .command('analyze')
  .description('Analyze whether clarification questions are required before progressing')
  .requiredOption('-s, --session <sessionId>', 'Session identifier used for the analysis')
  .requiredOption('-q, --query <query>', 'User query that may need clarification')
  .option('--enhanced-query', 'Request an enhanced query suggestion', false)
  .action(async (options: { session: string; query: string; enhancedQuery?: boolean }) => {
    const client = createClient({ requireToken: true });
    const payload: ClarificationAnalyzeRequest = {
      sessionId: options.session,
      query: options.query,
      includeEnhancedQuery: options.enhancedQuery ?? undefined
    };

    const response = await client.analyzeClarification(payload);
    outputJson(response);
  });

const tools = program.command('tools').description('Tooling sandbox helpers');

tools
  .command('run-node-script')
  .description('Create a sandbox job for evaluating Node.js source code')
  .requiredOption('-s, --session <sessionId>', 'Session ID that owns the job')
  .requiredOption('--source <code>', 'Node.js source code to execute')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds (500-60000)', parseIntBase10)
  .option('-m, --metadata <json>', 'Optional JSON metadata payload', parseJsonOptional)
  .action(async (options) => {
    const client = createClient({ requireToken: true });

    const payload: RunNodeScriptJobRequest = {
      sessionId: options.session,
      source: options.source,
      timeoutMs: options.timeout,
      metadata: options.metadata ?? undefined
    };

    const response = await client.createNodeScriptJob(payload);
    outputJson(response);
  });

tools
  .command('job <jobId>')
  .description('Retrieve the status of a tooling job')
  .action(async (jobId: string) => {
    const client = createClient({ requireToken: true });
    const response = await client.getToolJob(jobId);
    outputJson(response);
  });

const artifacts = program.command('artifacts').description('Artifact service helpers');

artifacts
  .command('create')
  .description('Create an inline artifact from stdin or a string literal')
  .requiredOption('-s, --session <sessionId>', 'Session ID that owns the artifact')
  .requiredOption('-n, --name <name>', 'Human-readable artifact name')
  .requiredOption('-t, --type <type>', 'Domain-specific type (e.g. etl-output)')
  .requiredOption('--mime <mimeType>', 'Mime type, e.g. application/json')
  .option('-e, --encoding <encoding>', 'Encoding (utf8|base64)', 'utf8')
  .option('-c, --content <encoded>', 'Provide content as a literal string (omit to read stdin)')
  .option('--description <text>', 'Optional description')
  .option('--version <version>', 'Optional version tag')
  .option('--tags <list>', 'Comma separated tags', parseCommaList)
  .option('-m, --metadata <json>', 'Optional JSON metadata payload', parseJsonOptional)
  .action(async (options) => {
    const client = createClient({ requireToken: true });
    const content = options.content ?? (await readStdin());

    const response = await client.createArtifact({
      sessionId: options.session,
      name: options.name,
      type: options.type,
      mimeType: options.mime,
      encoding: options.encoding,
      content,
      description: options.description ?? undefined,
      version: options.version ?? undefined,
      tags: options.tags ?? undefined,
      metadata: options.metadata ?? undefined
    });

    outputJson(response);
  });

program
  .command('whoami')
  .description('Display the current configuration (safe to share)')
  .action(() => {
    const opts = program.opts();
    const token = opts.token ?? process.env.WILLI_MAKO_TOKEN;
    outputJson({
      baseUrl: opts.baseUrl,
      hasToken: Boolean(token)
    });
  });

program.hook('postAction', () => {
  // Ensure the process exits after async handlers finish
  setImmediate(() => process.exit(0));
});

program.parseAsync(process.argv).catch((error) => {
  if (error instanceof WilliMakoError) {
    console.error(`Request failed (${error.status})`);
    console.error(inspect(error.body, false, 4, true));
    process.exit(1);
  }

  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

function parseIntBase10(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer: ${value}`);
  }

  return parsed;
}

function parseJsonOptional(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function outputJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

interface ClientFactoryOptions {
  requireToken?: boolean;
}

function resolveShell(shell?: string): SupportedShell {
  if (shell === 'powershell' || shell === 'cmd') {
    return shell;
  }

  return 'posix';
}

function createClient(options: ClientFactoryOptions = {}): WilliMakoClient {
  const opts = program.opts();
  const token = opts.token ?? process.env.WILLI_MAKO_TOKEN ?? null;

  if (options.requireToken && !token) {
    throw new Error('A bearer token is required. Set --token or WILLI_MAKO_TOKEN.');
  }

  const clientOptions: WilliMakoClientOptions = {
    baseUrl: opts.baseUrl,
    token
  };

  return new WilliMakoClient(clientOptions);
}
