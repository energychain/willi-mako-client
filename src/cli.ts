#!/usr/bin/env node

/**
 * @module willi-mako-client/cli
 * Registers the Commander-powered `willi-mako` CLI exposing authentication, sessions, retrieval,
 * reasoning, tooling, and demo server commands for the Willi-Mako platform.
 */
import { Command } from 'commander';
import { Buffer } from 'node:buffer';
import { promises as fs } from 'node:fs';
import { basename, resolve } from 'node:path';
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
  type ClarificationAnalyzeRequest,
  type GenerateToolScriptJob,
  type ToolScriptAttachment,
  type ToolPromptEnhancement
} from './index.js';
import {
  applyLoginEnvironmentToken,
  applySessionEnvironmentId,
  clearSessionEnvironmentId,
  formatEnvExport,
  type SupportedShell
} from './cli-utils.js';
import { startWebDashboard } from './demos/web-dashboard.js';
import { startMcpServer } from './demos/mcp-server.js';
import {
  extractToolGenerationErrorDetails,
  generateToolScript,
  ToolGenerationJobFailedError,
  ToolGenerationJobTimeoutError,
  ToolGenerationRepairLimitReachedError,
  type ToolGenerationRepairAttempt,
  type ToolScriptInputMode,
  normalizeToolScriptAttachments,
  MAX_TOOL_SCRIPT_ATTACHMENTS,
  MAX_TOOL_SCRIPT_ATTACHMENT_CHARS,
  MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS
} from './tool-generation.js';
import { buildAutoToolHints, type AutoToolHints } from './tool-hints.js';

const program = new Command();
let keepAlive = false;

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

chat
  .command('willi-netz')
  .description(
    'Send a message to the willi-netz chat endpoint (network management, regulation, TAB)'
  )
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
      const payload = {
        sessionId: options.session,
        message: options.message,
        contextSettings: (options.context as Record<string, unknown>) ?? undefined,
        timelineId: options.timeline ?? undefined
      };

      const response = await client.williNetzChat(payload);
      outputJson(response);
    }
  );

chat
  .command('combined')
  .description(
    'Send a message to the combined chat endpoint (both willi_mako and willi-netz collections)'
  )
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
      const payload = {
        sessionId: options.session,
        message: options.message,
        contextSettings: (options.context as Record<string, unknown>) ?? undefined,
        timelineId: options.timeline ?? undefined
      };

      const response = await client.combinedChat(payload);
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

retrieval
  .command('willi-netz-search')
  .description(
    'Run a semantic search query within the willi-netz collection (network management, regulation, TAB)'
  )
  .requiredOption('-s, --session <sessionId>', 'Session identifier owning the retrieval')
  .requiredOption('-q, --query <query>', 'Search query expressed in natural language')
  .option(
    '--options <json>',
    'Additional engine options (limit, alpha, outlineScoping, excludeVisual)',
    parseJsonOptional
  )
  .action(async (options: { session: string; query: string; options?: unknown }) => {
    const client = createClient({ requireToken: true });
    const payload = {
      sessionId: options.session,
      query: options.query,
      options: options.options as SemanticSearchRequest['options']
    };

    const response = await client.williNetzSemanticSearch(payload);
    outputJson(response);
  });

retrieval
  .command('combined-search')
  .description('Run a semantic search across both willi_mako and willi-netz collections')
  .requiredOption('-s, --session <sessionId>', 'Session identifier owning the retrieval')
  .requiredOption('-q, --query <query>', 'Search query expressed in natural language')
  .option(
    '--options <json>',
    'Additional engine options (limit, alpha, outlineScoping, excludeVisual)',
    parseJsonOptional
  )
  .action(async (options: { session: string; query: string; options?: unknown }) => {
    const client = createClient({ requireToken: true });
    const payload = {
      sessionId: options.session,
      query: options.query,
      options: options.options as SemanticSearchRequest['options']
    };

    const response = await client.combinedSemanticSearch(payload);
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
  .command('generate-script')
  .description('Generate a ready-to-run Node.js tool script via the deterministic tooling API')
  .requiredOption('-q, --query <text>', 'Natural language description of the desired tool')
  .option('-s, --session <sessionId>', 'Optional session identifier to reuse')
  .option(
    '--input-mode <mode>',
    'Preferred input mode (file|stdin|environment)',
    parseInputModeOption
  )
  .option('--output-format <format>', 'Expected output format (csv|json|text)')
  .option('-o, --output <file>', 'Write the generated script to a file instead of stdout')
  .option('--artifact', 'Persist the generated script as Willi-Mako artifact', false)
  .option(
    '--artifact-name <name>',
    'Override the artifact name when persisting (defaults to derived file name)'
  )
  .option(
    '--artifact-type <type>',
    'Artifact type used when persisting (default: tool-script)',
    'tool-script'
  )
  .option(
    '--attachment <spec>',
    `Reference attachment (path or JSON). Repeatable. Max ${MAX_TOOL_SCRIPT_ATTACHMENTS} attachments (≤ ${(MAX_TOOL_SCRIPT_ATTACHMENT_CHARS / 1_000_000).toFixed(1)} MB text each, ${(MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS / 1_000_000).toFixed(1)} MB combined).`,
    collectAttachmentOption,
    []
  )
  .option('--json', 'Print JSON metadata (including script) instead of raw script output', false)
  .option('--no-shebang', 'Omit the Node.js shebang from the generated script', false)
  .option('--context <text>', 'Additional context or constraints for the generator')
  .option('--no-auto-repair', 'Disable automatic repair attempts for bekannte Fehlertypen', false)
  .option(
    '--repair-attempts <count>',
    'Maximum automatic repair attempts (default: 3)',
    parseIntBase10
  )
  .option('--repair-context <text>', 'Additional context appended to repair requests')
  .option('--repair-instructions <text>', 'Custom repair hint passed to each attempt')
  .action(
    async (options: {
      query: string;
      session?: string;
      inputMode?: ToolScriptInputMode;
      outputFormat?: string;
      output?: string;
      artifact?: boolean;
      artifactName?: string;
      artifactType?: string;
      attachment?: AttachmentOption[];
      json?: boolean;
      shebang?: boolean;
      context?: string;
      autoRepair?: boolean;
      repairAttempts?: number;
      repairContext?: string;
      repairInstructions?: string;
    }) => {
      const client = createClient({ requireToken: true });

      let sessionId = options.session;
      let createdSessionId: string | null = null;

      let lastStatus: string | null = null;
      let lastStage: string | null = null;
      let lastMessage: string | null = null;

      const logJobUpdate = (job: GenerateToolScriptJob, force = false) => {
        const stage = job.progress?.stage ?? null;
        const message = job.progress?.message ?? null;
        const attemptLabel = job.progress?.attempt ?? (job.attempts > 0 ? job.attempts : null);

        const statusChanged = job.status !== lastStatus;
        const stageChanged = stage !== lastStage;
        const messageChanged = message !== lastMessage;

        if (force || statusChanged || stageChanged || messageChanged) {
          const parts = [
            `Status: ${job.status}`,
            stage ? `Phase: ${stage}` : null,
            typeof attemptLabel === 'number' ? `Versuch ${attemptLabel}` : null,
            message ? `Hinweis: ${message}` : null
          ].filter(Boolean);
          console.error(`⏳ Generator-Job ${job.id} – ${parts.join(' | ')}`);
        }

        lastStatus = job.status;
        lastStage = stage;
        lastMessage = message;
      };

      const logJobAttempts = (job: GenerateToolScriptJob) => {
        if (job.attempts > 1) {
          console.error(`ℹ️  Der Generator benötigte ${job.attempts} Versuche.`);
        }
      };

      const logJobWarnings = (job: GenerateToolScriptJob) => {
        if (job.warnings.length > 0) {
          job.warnings.forEach((warning) => {
            console.error(`⚠️  Generator-Warnung: ${warning}`);
          });
        }
      };

      const truncateForLog = (text: string, maxLength = 200) =>
        text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;

      const logRepairAttempt = (attempt: ToolGenerationRepairAttempt) => {
        const previousCode = attempt.previousJob.error?.code ?? 'unbekannt';
        const status = attempt.repairJob.status;
        const statusLabel =
          status === 'succeeded'
            ? 'erfolgreich'
            : status === 'failed'
              ? `fehlgeschlagen${attempt.repairJob.error?.code ? ` (${attempt.repairJob.error.code})` : ''}`
              : status;
        console.error(
          `♻️  Reparaturversuch ${attempt.attempt} (${attempt.repairJob.id}) – ${statusLabel} nach Fehler ${previousCode}.`
        );
        if (attempt.instructions) {
          console.error(`    Hinweis: ${truncateForLog(attempt.instructions)}`);
        }
        if (status === 'failed' && attempt.repairJob.error?.message) {
          console.error(`    Fehler: ${attempt.repairJob.error.message}`);
        }
      };

      const logRepairHistory = (repairs: ToolGenerationRepairAttempt[]) => {
        if (!repairs || repairs.length === 0) {
          return;
        }
        repairs.forEach((attempt) => logRepairAttempt(attempt));
      };

      let promptEnhancement: ToolPromptEnhancement | null = null;

      const capturePromptEnhancement = (enhancement: ToolPromptEnhancement) => {
        promptEnhancement = enhancement;

        const hasError = enhancement.rawText?.startsWith('ERROR:');
        if (hasError) {
          console.error(
            `⚠️  Gemini-Promptoptimierung fehlgeschlagen (${enhancement.rawText?.slice(7) ?? 'Unbekannter Fehler'}).`
          );
          return;
        }

        const changedQuery =
          enhancement.enhancedQuery &&
          enhancement.enhancedQuery.trim() !== enhancement.originalQuery.trim();

        if (changedQuery) {
          console.error(`🤖 Gemini (${enhancement.model}) hat die Anforderung präzisiert.`);
        } else {
          console.error(`🤖 Gemini (${enhancement.model}) hat die Anforderung bestätigt.`);
        }

        if (enhancement.validationChecklist && enhancement.validationChecklist.length > 0) {
          console.error('   Validierungs-Checkliste:');
          enhancement.validationChecklist.forEach((item) => console.error(`   - ${item}`));
        }
      };

      const attachmentSpecs = options.attachment ?? [];
      let attachmentsForRequest: ToolScriptAttachment[] | undefined;
      let autoHints: AutoToolHints | null = null;

      try {
        let resolvedAttachments: ToolScriptAttachment[] | undefined;
        if (attachmentSpecs.length > 0) {
          resolvedAttachments = await resolveAttachmentFiles(attachmentSpecs);
          autoHints = buildAutoToolHints(options.query, resolvedAttachments);
          const normalizedAttachments = normalizeToolScriptAttachments(resolvedAttachments);
          if (normalizedAttachments && normalizedAttachments.length > 0) {
            attachmentsForRequest = normalizedAttachments;
            const filenames = normalizedAttachments.map((attachment) => attachment.filename);
            console.error(
              `📎 Eingebundene Anhänge (${normalizedAttachments.length}): ${filenames.join(', ')}`
            );
          }
        } else {
          autoHints = buildAutoToolHints(options.query, undefined);
        }

        const finalAdditionalContext = combineContext(
          options.context,
          autoHints?.additionalContext
        );
        const finalRepairContext = combineContext(options.repairContext, autoHints?.repairContext);

        if (autoHints?.summary) {
          console.error(`🧠 ${autoHints.summary}.`);
        }

        if (!sessionId) {
          const sessionResponse = await client.createSession({});
          sessionId = sessionResponse.data.sessionId;
          createdSessionId = sessionId;
          console.error(`ℹ️  Session ${sessionId} wurde temporär erstellt.`);
        }

        const outputNameHint = options.output
          ? options.output.split(/[/\\]/).pop()
          : options.artifactName;

        const generation = await generateToolScript({
          client,
          sessionId,
          query: options.query,
          preferredInputMode: options.inputMode,
          outputFormat: options.outputFormat,
          fileNameHint: outputNameHint,
          includeShebang: options.shebang !== false,
          additionalContext: finalAdditionalContext,
          attachments: attachmentsForRequest,
          autoRepair: options.autoRepair,
          maxAutoRepairAttempts: options.repairAttempts,
          repairAdditionalContext: finalRepairContext,
          repairInstructionBuilder: options.repairInstructions
            ? async () => options.repairInstructions
            : undefined,
          onRepairAttempt: (attempt) => logRepairAttempt(attempt),
          onPromptEnhancement: (enhancement) => capturePromptEnhancement(enhancement),
          onJobUpdate: (job) => logJobUpdate(job)
        });

        const job = generation.job;
        logJobAttempts(job);
        logJobWarnings(job);

        let artifactResponse: unknown = null;
        if (options.artifact) {
          const artifactName = options.artifactName ?? generation.suggestedFileName;
          const artifactDescription = generation.description ?? generation.summary;
          artifactResponse = await client.createArtifact({
            sessionId,
            type: options.artifactType ?? 'tool-script',
            name: artifactName,
            mimeType: 'text/javascript',
            encoding: 'utf8',
            content: generation.code,
            description: `Automatisch generiertes Tool: ${artifactDescription}`
          });
          console.error(`✅ Skript als Artefakt "${artifactName}" gespeichert.`);
        }

        const validation = generation.descriptor.validation;
        if (!validation.syntaxValid) {
          console.error(
            '⚠️  Syntaxprüfung fehlgeschlagen. Bitte prüfe das Skript vor der Ausführung.'
          );
        }
        if (!validation.deterministic) {
          console.error(
            '⚠️  Das Skript wurde als nicht deterministisch markiert. Ergebnisse könnten variieren.'
          );
        }
        if (validation.forbiddenApis.length > 0) {
          console.error(
            `⚠️  Verbotene APIs erkannt: ${validation.forbiddenApis.map((value) => `"${value}"`).join(', ')}.`
          );
        }
        if (validation.warnings.length > 0) {
          validation.warnings.forEach((warning) => {
            console.error(`⚠️  Hinweis: ${warning}`);
          });
        }
        if (generation.descriptor.notes.length > 0) {
          generation.descriptor.notes.forEach((note) => {
            console.error(`ℹ️  Generator-Hinweis: ${note}`);
          });
        }

        if (options.json) {
          outputJson({
            sessionId,
            script: generation.code,
            suggestedFileName: generation.suggestedFileName,
            summary: generation.summary,
            description: generation.description,
            language: generation.language ?? 'javascript',
            descriptor: generation.descriptor,
            inputSchema: generation.inputSchema,
            expectedOutputDescription: generation.expectedOutputDescription,
            artifact: artifactResponse,
            attachments: attachmentsForRequest,
            job,
            attempts: job.attempts,
            warnings: job.warnings,
            repairHistory: generation.repairHistory,
            promptEnhancement
          });
        } else if (options.output) {
          await fs.writeFile(options.output, generation.code, 'utf8');
          console.error(`✅ Skript nach ${options.output} geschrieben.`);
        } else {
          process.stdout.write(`${generation.code}\n`);
        }

        if (createdSessionId) {
          console.error(
            `ℹ️  Die Session ${createdSessionId} wurde automatisch erzeugt. Lösche sie bei Bedarf mit "willi-mako sessions delete ${createdSessionId}".`
          );
        }
      } catch (error) {
        if (error instanceof ToolGenerationJobTimeoutError) {
          const job = error.job;
          console.error(`⏱️  Tool-Generierung abgebrochen: ${error.message}`);
          logJobUpdate(job, true);
          logJobAttempts(job);
          logJobWarnings(job);

          if (createdSessionId) {
            console.error(
              `ℹ️  Die Session ${createdSessionId} wurde automatisch erzeugt. Lösche sie bei Bedarf mit "willi-mako sessions delete ${createdSessionId}".`
            );
          }

          process.exit(1);
        }

        if (error instanceof ToolGenerationRepairLimitReachedError) {
          const job = error.job;
          console.error(
            '♻️  Reparaturlimit erreicht. Weitere automatische Versuche wurden gestoppt.'
          );
          logJobUpdate(job, true);
          logJobAttempts(job);
          logJobWarnings(job);
          logRepairHistory(error.repairs);

          if (createdSessionId) {
            console.error(
              `ℹ️  Die Session ${createdSessionId} wurde automatisch erzeugt. Lösche sie bei Bedarf mit "willi-mako sessions delete ${createdSessionId}".`
            );
          }

          process.exit(1);
        }

        if (error instanceof ToolGenerationJobFailedError) {
          const job = error.job;
          console.error(`❌ Tool-Generierung fehlgeschlagen: ${error.message}`);
          if (job.error?.code) {
            console.error(`   Fehlercode: ${job.error.code}`);
          }
          logJobUpdate(job, true);
          logJobAttempts(job);
          logJobWarnings(job);
          logRepairHistory(error.repairs);
          if (job.error?.details) {
            console.error('ℹ️  Fehlerdetails:');
            console.error(inspect(job.error.details, false, 5, true));
          }

          if (createdSessionId) {
            console.error(
              `ℹ️  Die Session ${createdSessionId} wurde automatisch erzeugt. Lösche sie bei Bedarf mit "willi-mako sessions delete ${createdSessionId}".`
            );
          }

          process.exit(1);
        }

        if (error instanceof WilliMakoError) {
          const details = extractToolGenerationErrorDetails(error.body);
          const message = details?.message ?? error.message ?? 'Tool-Generierung fehlgeschlagen.';
          console.error(`❌ Tool-Generierung fehlgeschlagen: ${message}`);
          if (details?.code) {
            console.error(`   Fehlercode: ${details.code}`);
          }

          const attempts = details?.attempts;
          if (Array.isArray(attempts) && attempts.length > 0) {
            console.error('📋 Generator-Versuche:');
            attempts.forEach((attempt, index) => {
              const label = (attempt as Record<string, unknown>)?.attempt ?? index + 1;
              const status = (attempt as Record<string, unknown>)?.status;
              const reason =
                (attempt as Record<string, unknown>)?.message ??
                ((attempt as Record<string, unknown>)?.error as string | undefined);
              const duration = (attempt as Record<string, unknown>)?.durationMs;
              const prefix = `   #${label}`;
              const statusPart = status ? ` [${status}]` : '';
              const durationPart = typeof duration === 'number' ? ` (${duration} ms)` : '';
              console.error(`${prefix}${statusPart}${durationPart}${reason ? ` – ${reason}` : ''}`);
            });
          } else if (typeof attempts === 'number') {
            console.error(`📋 Generator-Versuche: ${attempts}`);
          } else if (attempts !== undefined) {
            console.error('📋 Generator-Versuche (unbekanntes Format):');
            console.error(inspect(attempts, false, 5, true));
          }

          const metadata = details?.metadata;
          if (metadata) {
            const { attempts: _ignored, ...rest } = metadata;
            if (Object.keys(rest).length > 0) {
              console.error('ℹ️  Weitere Generator-Metadaten:');
              console.error(inspect(rest, false, 5, true));
            }
          }

          if (createdSessionId) {
            console.error(
              `ℹ️  Die Session ${createdSessionId} wurde automatisch erzeugt. Lösche sie bei Bedarf mit "willi-mako sessions delete ${createdSessionId}".`
            );
          }

          process.exit(1);
        }

        throw error;
      }
    }
  );

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

const documents = program.command('documents').description('Document management helpers');

documents
  .command('upload <filePath>')
  .description('Upload a single document to the knowledge base')
  .option('--title <title>', 'Document title (defaults to filename)')
  .option('--description <description>', 'Optional description')
  .option('--tags <list>', 'Comma-separated tags', parseCommaList)
  .option('--ai-context', 'Enable AI context for this document', false)
  .option('--json', 'Print JSON response', true)
  .action(async (filePath: string, options) => {
    const client = createClient({ requireToken: true });
    const absPath = resolve(filePath);
    const fileBuffer = await fs.readFile(absPath);
    const filename = basename(absPath);

    const response = await client.uploadDocument({
      file: fileBuffer,
      title: options.title ?? filename,
      description: options.description,
      tags: options.tags,
      is_ai_context_enabled: options.aiContext
    });

    if (options.json !== false) {
      outputJson(response);
    } else {
      console.log(`✅ Document uploaded: ${response.data.document.id}`);
      console.log(`   Title: ${response.data.document.title}`);
      console.log(`   Size: ${response.data.document.file_size} bytes`);
    }
  });

documents
  .command('upload-multiple <filePaths...>')
  .description('Upload multiple documents at once (max 10)')
  .option('--ai-context', 'Enable AI context for all documents', false)
  .option('--json', 'Print JSON response', true)
  .action(async (filePaths: string[], options) => {
    const client = createClient({ requireToken: true });

    if (filePaths.length > 10) {
      throw new Error('Maximum 10 files allowed per upload');
    }

    const fileBuffers: Buffer[] = [];
    for (const filePath of filePaths) {
      const absPath = resolve(filePath);
      const buffer = await fs.readFile(absPath);
      fileBuffers.push(buffer);
    }

    const response = await client.uploadMultipleDocuments({
      files: fileBuffers,
      is_ai_context_enabled: options.aiContext
    });

    if (options.json !== false) {
      outputJson(response);
    } else {
      console.log(`✅ Uploaded ${response.data.documents.length} documents`);
      response.data.documents.forEach((doc) => {
        console.log(`   - ${doc.title} (${doc.id})`);
      });
    }
  });

documents
  .command('list')
  .description('List all documents with pagination and filtering')
  .option('--page <page>', 'Page number (1-based)', parseIntBase10, 1)
  .option('--limit <limit>', 'Items per page', parseIntBase10, 12)
  .option('--search <term>', 'Search term for title/description')
  .option('--processed', 'Filter by processed documents only')
  .option('--unprocessed', 'Filter by unprocessed documents only')
  .option('--json', 'Print JSON response', true)
  .action(async (options) => {
    const client = createClient({ requireToken: true });

    const query: Parameters<typeof client.listDocuments>[0] = {
      page: options.page,
      limit: options.limit,
      search: options.search
    };

    if (options.processed) {
      query.processed = true;
    } else if (options.unprocessed) {
      query.processed = false;
    }

    const response = await client.listDocuments(query);

    if (options.json !== false) {
      outputJson(response);
    } else {
      const { documents, pagination } = response.data;
      console.log(`📄 Documents (page ${pagination.page}/${pagination.totalPages})`);
      console.log(`   Total: ${pagination.total}\n`);

      documents.forEach((doc) => {
        const processed = doc.is_processed ? '✓' : '⏳';
        const aiContext = doc.is_ai_context_enabled ? '🤖' : '  ';
        console.log(`${processed} ${aiContext} ${doc.title}`);
        console.log(`     ID: ${doc.id}`);
        console.log(`     Size: ${doc.file_size} bytes | Type: ${doc.mime_type}`);
        if (doc.description) {
          console.log(`     ${doc.description}`);
        }
        if (doc.tags && doc.tags.length > 0) {
          console.log(`     Tags: ${doc.tags.join(', ')}`);
        }
        console.log('');
      });
    }
  });

documents
  .command('get <documentId>')
  .description('Retrieve a single document by ID')
  .option('--json', 'Print JSON response', true)
  .action(async (documentId: string, options) => {
    const client = createClient({ requireToken: true });
    const response = await client.getDocument(documentId);

    if (options.json !== false) {
      outputJson(response);
    } else {
      const doc = response.data;
      console.log(`📄 ${doc.title}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Original name: ${doc.original_name}`);
      console.log(`   Size: ${doc.file_size} bytes`);
      console.log(`   MIME type: ${doc.mime_type}`);
      console.log(`   Processed: ${doc.is_processed ? 'Yes' : 'No'}`);
      console.log(`   AI Context: ${doc.is_ai_context_enabled ? 'Enabled' : 'Disabled'}`);
      if (doc.description) {
        console.log(`   Description: ${doc.description}`);
      }
      if (doc.tags && doc.tags.length > 0) {
        console.log(`   Tags: ${doc.tags.join(', ')}`);
      }
      if (doc.extracted_text_length) {
        console.log(`   Extracted text: ${doc.extracted_text_length} characters`);
      }
      if (doc.processing_error) {
        console.log(`   ⚠️  Processing error: ${doc.processing_error}`);
      }
      console.log(`   Created: ${doc.created_at}`);
      console.log(`   Updated: ${doc.updated_at}`);
    }
  });

documents
  .command('update <documentId>')
  .description('Update document metadata')
  .option('--title <title>', 'New title')
  .option('--description <description>', 'New description')
  .option('--tags <list>', 'Comma-separated tags', parseCommaList)
  .option(
    '--ai-context <enabled>',
    'Enable (true) or disable (false) AI context',
    (val) => val === 'true'
  )
  .option('--json', 'Print JSON response', true)
  .action(async (documentId: string, options) => {
    const client = createClient({ requireToken: true });

    const updatePayload: Parameters<typeof client.updateDocument>[1] = {};
    if (options.title) {
      updatePayload.title = options.title;
    }
    if (options.description) {
      updatePayload.description = options.description;
    }
    if (options.tags) {
      updatePayload.tags = options.tags;
    }
    if (options.aiContext !== undefined) {
      updatePayload.is_ai_context_enabled = options.aiContext;
    }

    const response = await client.updateDocument(documentId, updatePayload);

    if (options.json !== false) {
      outputJson(response);
    } else {
      console.log(`✅ Document updated: ${response.data.title}`);
    }
  });

documents
  .command('delete <documentId>')
  .description('Delete a document permanently')
  .option('--confirm', 'Confirm deletion', false)
  .action(async (documentId: string, options) => {
    const client = createClient({ requireToken: true });

    if (!options.confirm) {
      console.error('⚠️  Use --confirm to confirm deletion');
      process.exit(1);
    }

    await client.deleteDocument(documentId);
    console.log('✅ Document deleted');
  });

documents
  .command('download <documentId> <outputPath>')
  .description('Download the original document file')
  .action(async (documentId: string, outputPath: string) => {
    const client = createClient({ requireToken: true });
    const fileData = await client.downloadDocument(documentId);
    const absPath = resolve(outputPath);

    await fs.writeFile(absPath, Buffer.from(fileData));
    console.log(`✅ Document downloaded to: ${absPath}`);
  });

documents
  .command('reprocess <documentId>')
  .description('Trigger reprocessing of a document (re-extract text and re-embed)')
  .option('--json', 'Print JSON response', true)
  .action(async (documentId: string, options) => {
    const client = createClient({ requireToken: true });
    const response = await client.reprocessDocument(documentId);

    if (options.json !== false) {
      outputJson(response);
    } else {
      console.log('✅ Reprocessing started');
    }
  });

documents
  .command('ai-context <documentId> <enabled>')
  .description('Toggle AI context for a document (enable: true, disable: false)')
  .option('--json', 'Print JSON response', true)
  .action(async (documentId: string, enabled: string, options) => {
    const client = createClient({ requireToken: true });
    const enabledBool = enabled === 'true';

    const response = await client.toggleAiContext(documentId, enabledBool);

    if (options.json !== false) {
      outputJson(response);
    } else {
      const status = enabledBool ? 'enabled' : 'disabled';
      console.log(`✅ AI context ${status} for document: ${response.data.title}`);
    }
  });

program
  .command('serv')
  .description('Start the interactive Willi-Mako web dashboard demo')
  .option(
    '-p, --port <port>',
    'Port to bind the dashboard (defaults to $PORT or 4173)',
    parseIntBase10
  )
  .action(async (options: { port?: number }) => {
    const opts = program.opts();
    const token = opts.token ?? process.env.WILLI_MAKO_TOKEN ?? null;

    const instance = await startWebDashboard({
      port: options.port,
      baseUrl: opts.baseUrl,
      token,
      logger: (message) => console.log(message)
    });

    enableKeepAlive();
    if (!token) {
      console.warn('⚠️  No bearer token configured. Use the dashboard login to authenticate.');
    }
    console.log('Press Ctrl+C to stop the dashboard.');

    registerShutdown(async () => {
      console.log('\nStopping web dashboard...');
      await instance.stop();
    });
  });

program
  .command('mcp')
  .description('Expose Willi-Mako capabilities via the Model Context Protocol')
  .option(
    '-p, --port <port>',
    'Port to bind the MCP HTTP server (defaults to $PORT or 7337)',
    parseIntBase10
  )
  .action(async (options: { port?: number }) => {
    const opts = program.opts();
    const token = opts.token ?? process.env.WILLI_MAKO_TOKEN ?? null;

    const instance = await startMcpServer({
      port: options.port,
      baseUrl: opts.baseUrl,
      token,
      logger: (message) => console.log(message)
    });

    enableKeepAlive();
    console.log('Press Ctrl+C to stop the MCP server.');

    registerShutdown(async () => {
      console.log('\nStopping MCP server...');
      await instance.stop();
    });
  });

// =====================================================================
// EDIFACT Message Analyzer Commands (Version 0.7.0)
// =====================================================================

const edifact = program.command('edifact').description('EDIFACT message analysis and manipulation');

edifact
  .command('analyze')
  .description('Structurally analyze an EDIFACT message with code resolution')
  .requiredOption('-m, --message <message>', 'EDIFACT message string')
  .option('-f, --file <path>', 'Read EDIFACT message from file (alternative to --message)')
  .option('--json', 'Output JSON response', true)
  .action(async (options: { message?: string; file?: string; json?: boolean }) => {
    const client = createClient({ requireToken: true });

    let message: string;
    if (options.file) {
      message = await fs.readFile(resolve(options.file), 'utf8');
    } else if (options.message) {
      message = options.message;
    } else {
      throw new Error('Either --message or --file must be provided');
    }

    const response = await client.analyzeEdifactMessage({ message });

    if (options.json !== false) {
      outputJson(response);
    } else {
      console.log('\n📋 EDIFACT Analysis Result\n');
      console.log(`Format: ${response.data.format}`);
      console.log(`Summary: ${response.data.summary}\n`);

      if (response.data.plausibilityChecks.length > 0) {
        console.log('✓ Plausibility Checks:');
        response.data.plausibilityChecks.forEach((check) => console.log(`  - ${check}`));
        console.log('');
      }

      console.log(`Segments (${response.data.structuredData.segments.length}):`);
      response.data.structuredData.segments.forEach((segment) => {
        console.log(`\n  ${segment.tag}: ${segment.description || 'N/A'}`);
        if (segment.resolvedCodes && Object.keys(segment.resolvedCodes).length > 0) {
          console.log('    Resolved codes:', segment.resolvedCodes);
        }
      });
    }
  });

edifact
  .command('chat')
  .description('Interactive chat about an EDIFACT message')
  .requiredOption('-m, --message <message>', 'EDIFACT message string')
  .option('-f, --file <path>', 'Read EDIFACT message from file (alternative to --message)')
  .requiredOption('-q, --query <query>', 'Question about the EDIFACT message')
  .option('--json', 'Output JSON response', true)
  .action(async (options: { message?: string; file?: string; query: string; json?: boolean }) => {
    const client = createClient({ requireToken: true });

    let currentEdifactMessage: string;
    if (options.file) {
      currentEdifactMessage = await fs.readFile(resolve(options.file), 'utf8');
    } else if (options.message) {
      currentEdifactMessage = options.message;
    } else {
      throw new Error('Either --message or --file must be provided');
    }

    const response = await client.chatAboutEdifactMessage({
      message: options.query,
      currentEdifactMessage
    });

    if (options.json !== false) {
      outputJson(response);
    } else {
      console.log('\n💬 AI Assistant Response\n');
      console.log(response.data.response);
      console.log(`\n(${response.data.timestamp})`);
    }
  });

edifact
  .command('explain')
  .description('Generate human-readable explanation of an EDIFACT message')
  .requiredOption('-m, --message <message>', 'EDIFACT message string')
  .option('-f, --file <path>', 'Read EDIFACT message from file (alternative to --message)')
  .option('--json', 'Output JSON response', true)
  .action(async (options: { message?: string; file?: string; json?: boolean }) => {
    const client = createClient({ requireToken: true });

    let message: string;
    if (options.file) {
      message = await fs.readFile(resolve(options.file), 'utf8');
    } else if (options.message) {
      message = options.message;
    } else {
      throw new Error('Either --message or --file must be provided');
    }

    const response = await client.explainEdifactMessage({ message });

    if (options.json !== false) {
      outputJson(response);
    } else {
      console.log('\n📖 EDIFACT Message Explanation\n');
      console.log(response.data.explanation);
    }
  });

edifact
  .command('validate')
  .description('Validate an EDIFACT message structurally and semantically')
  .requiredOption('-m, --message <message>', 'EDIFACT message string')
  .option('-f, --file <path>', 'Read EDIFACT message from file (alternative to --message)')
  .option('--json', 'Output JSON response', true)
  .action(async (options: { message?: string; file?: string; json?: boolean }) => {
    const client = createClient({ requireToken: true });

    let message: string;
    if (options.file) {
      message = await fs.readFile(resolve(options.file), 'utf8');
    } else if (options.message) {
      message = options.message;
    } else {
      throw new Error('Either --message or --file must be provided');
    }

    const response = await client.validateEdifactMessage({ message });

    if (options.json !== false) {
      outputJson(response);
    } else {
      console.log('\n✓ EDIFACT Validation Result\n');
      console.log(`Valid: ${response.data.isValid ? '✓ Yes' : '✗ No'}`);
      console.log(`Message Type: ${response.data.messageType || 'Unknown'}`);
      console.log(`Segment Count: ${response.data.segmentCount || 0}\n`);

      if (response.data.errors.length > 0) {
        console.log('❌ Errors:');
        response.data.errors.forEach((error) => console.log(`  - ${error}`));
        console.log('');
      }

      if (response.data.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        response.data.warnings.forEach((warning) => console.log(`  - ${warning}`));
      }

      if (response.data.errors.length === 0 && response.data.warnings.length === 0) {
        console.log('✓ No errors or warnings found.');
      }
    }
  });

edifact
  .command('modify')
  .description('Modify an EDIFACT message based on natural language instructions')
  .requiredOption('-m, --message <message>', 'Current EDIFACT message string')
  .option('-f, --file <path>', 'Read EDIFACT message from file (alternative to --message)')
  .requiredOption('-i, --instruction <instruction>', 'Modification instruction in natural language')
  .option('-o, --output <path>', 'Write modified message to file')
  .option('--json', 'Output JSON response', true)
  .action(
    async (options: {
      message?: string;
      file?: string;
      instruction: string;
      output?: string;
      json?: boolean;
    }) => {
      const client = createClient({ requireToken: true });

      let currentMessage: string;
      if (options.file) {
        currentMessage = await fs.readFile(resolve(options.file), 'utf8');
      } else if (options.message) {
        currentMessage = options.message;
      } else {
        throw new Error('Either --message or --file must be provided');
      }

      const response = await client.modifyEdifactMessage({
        instruction: options.instruction,
        currentMessage
      });

      if (options.output) {
        await fs.writeFile(resolve(options.output), response.data.modifiedMessage, 'utf8');
        console.log(`✓ Modified message written to ${options.output}`);
      }

      if (options.json !== false) {
        outputJson(response);
      } else if (!options.output) {
        console.log('\n📝 Modified EDIFACT Message\n');
        console.log(response.data.modifiedMessage);
        console.log(`\n✓ Valid: ${response.data.isValid ? 'Yes' : 'No'}`);
        console.log(`(${response.data.timestamp})`);
      }
    }
  );

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
  // Ensure the process exits after async handlers finish unless a long-running server is active
  if (keepAlive) {
    return;
  }
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

interface AttachmentOption {
  path?: string;
  filename?: string;
  mimeType?: string;
  description?: string;
  weight?: number;
  content?: string;
}

function collectAttachmentOption(
  value: string,
  previous: AttachmentOption[] = []
): AttachmentOption[] {
  return [...previous, parseAttachmentOption(value)];
}

function parseAttachmentOption(raw: string): AttachmentOption {
  const value = raw.trim();
  if (!value) {
    throw new Error('Attachment specification cannot be empty.');
  }

  if (value.startsWith('{')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch (error) {
      throw new Error(`Invalid attachment JSON: ${(error as Error).message}`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Attachment JSON must describe an object.');
    }

    const record = parsed as Record<string, unknown>;
    const option: AttachmentOption = {
      path: typeof record.path === 'string' ? record.path : (record.file as string | undefined),
      filename:
        typeof record.filename === 'string' ? record.filename : (record.name as string | undefined),
      mimeType:
        typeof record.mimeType === 'string' ? record.mimeType : (record.type as string | undefined),
      description: typeof record.description === 'string' ? record.description : undefined,
      weight: record.weight as number | undefined,
      content: typeof record.content === 'string' ? record.content : undefined
    };

    if (!option.path && !option.content) {
      throw new Error('Attachment JSON requires either a "path" or "content" property.');
    }

    return option;
  }

  const [path, mimeType, description, weightRaw] = value.split('|');
  const option: AttachmentOption = {
    path: path?.trim()
  };

  if (!option.path) {
    throw new Error('Attachment specification must start with a file path or JSON object.');
  }

  if (mimeType?.trim()) {
    option.mimeType = mimeType.trim();
  }

  if (description?.trim()) {
    option.description = description.trim();
  }

  if (weightRaw?.trim()) {
    const parsedWeight = Number.parseFloat(weightRaw.trim());
    if (Number.isNaN(parsedWeight)) {
      throw new Error(`Invalid attachment weight: ${weightRaw}`);
    }
    option.weight = parsedWeight;
  }

  return option;
}

function parseIntBase10(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer: ${value}`);
  }

  return parsed;
}

function parseInputModeOption(value: string): ToolScriptInputMode {
  const normalized = value.toLowerCase();
  if (normalized === 'file' || normalized === 'stdin' || normalized === 'environment') {
    return normalized;
  }

  throw new Error('Invalid input mode. Supported values: file, stdin, environment');
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

function combineContext(primary?: string, secondary?: string | null): string | undefined {
  const first = typeof primary === 'string' ? primary.trim() : '';
  const second = typeof secondary === 'string' ? secondary.trim() : '';

  if (first && second) {
    return `${first}\n\n${second}`;
  }

  if (first) {
    return first;
  }

  if (second) {
    return second;
  }

  return undefined;
}

function outputJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

interface ClientFactoryOptions {
  requireToken?: boolean;
}

async function resolveAttachmentFiles(specs: AttachmentOption[]): Promise<ToolScriptAttachment[]> {
  const attachments: ToolScriptAttachment[] = [];

  for (let index = 0; index < specs.length; index++) {
    const spec = specs[index];
    const prepared = await resolveAttachment(spec, index);
    attachments.push(prepared);
  }

  return attachments;
}

async function resolveAttachment(
  spec: AttachmentOption,
  index: number
): Promise<ToolScriptAttachment> {
  const inlineContent = spec.content;
  const suppliedFilename =
    typeof spec.filename === 'string' && spec.filename.trim().length > 0
      ? spec.filename.trim()
      : undefined;

  let resolvedFilename = suppliedFilename;
  let content: string;

  if (typeof inlineContent === 'string') {
    content = inlineContent;
  } else {
    const path = spec.path;
    if (!path) {
      throw new Error('Attachment requires either inline content or a file path.');
    }

    const absolutePath = resolve(path);
    try {
      content = await fs.readFile(absolutePath, 'utf8');
    } catch (error) {
      throw new Error(
        `Unable to read attachment file at ${absolutePath}: ${(error as Error).message}`
      );
    }

    if (!resolvedFilename) {
      resolvedFilename = basename(absolutePath);
    }
  }

  if (!resolvedFilename) {
    resolvedFilename = `attachment-${index + 1}.txt`;
  }

  const description =
    typeof spec.description === 'string' && spec.description.trim().length > 0
      ? spec.description.trim()
      : undefined;

  let weight: number | undefined;
  if (spec.weight !== undefined && spec.weight !== null) {
    const numericWeight = Number(spec.weight);
    if (!Number.isFinite(numericWeight)) {
      throw new Error(`Attachment "${resolvedFilename}" has an invalid weight value.`);
    }
    weight = numericWeight;
  }

  const mimeType =
    typeof spec.mimeType === 'string' && spec.mimeType.trim().length > 0
      ? spec.mimeType.trim()
      : inferMimeType(resolvedFilename);

  return {
    filename: resolvedFilename,
    content,
    mimeType,
    description,
    weight
  } satisfies ToolScriptAttachment;
}

function inferMimeType(filename: string): string {
  const extension = filename.toLowerCase().split('.').pop() ?? '';

  switch (extension) {
    case 'json':
      return 'application/json';
    case 'csv':
      return 'text/csv';
    case 'md':
    case 'markdown':
      return 'text/markdown';
    case 'yaml':
    case 'yml':
      return 'application/yaml';
    case 'xml':
      return 'application/xml';
    case 'html':
      return 'text/html';
    case 'tsv':
      return 'text/tab-separated-values';
    case 'edi':
    case 'edifact':
      return 'text/plain';
    case 'js':
    case 'ts':
    case 'txt':
    default:
      return 'text/plain';
  }
}

function enableKeepAlive(): void {
  keepAlive = true;
}

function registerShutdown(callback: () => Promise<void> | void): void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  let shuttingDown = false;

  const handler = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    process.stdout.write(`\nReceived ${signal}. Shutting down...\n`);
    try {
      await callback();
    } catch (error) {
      console.error('Error during shutdown:', error instanceof Error ? error.message : error);
    }
    process.exit(0);
  };

  for (const signal of signals) {
    process.on(signal, handler);
  }
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
