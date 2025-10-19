import type {
  GenerateToolScriptJob,
  GenerateToolScriptJobOperationResponse,
  GenerateToolScriptRequest,
  GenerateToolScriptResponse,
  GetToolJobResponse,
  ToolJob,
  ToolScriptConstraints,
  ToolScriptDescriptor,
  ToolScriptAttachment,
  ToolScriptInputSchema,
  RepairGenerateToolScriptRequest,
  ToolPromptEnhancement
} from './types.js';
import { GEMINI_MODEL, enhanceToolGenerationRequest, isGeminiAvailable } from './gemini.js';

type UnknownRecord = Record<string, unknown>;

export type ToolScriptInputMode = 'stdin' | 'file' | 'environment';

export interface ToolGenerationClient {
  generateToolScript(
    payload: GenerateToolScriptRequest
  ): Promise<GenerateToolScriptJobOperationResponse>;
  getToolJob(jobId: string): Promise<GetToolJobResponse>;
  repairToolScript(
    payload: RepairGenerateToolScriptRequest
  ): Promise<GenerateToolScriptJobOperationResponse>;
}

export interface GenerateToolScriptParams {
  client: ToolGenerationClient;
  sessionId: string;
  query: string;
  preferredInputMode?: ToolScriptInputMode;
  outputFormat?: string;
  fileNameHint?: string;
  includeShebang?: boolean;
  additionalContext?: string;
  attachments?: ToolScriptAttachment[];
  pollIntervalMs?: number;
  timeoutMs?: number;
  maxSubmitRetries?: number;
  submitRetryBackoffMs?: number;
  signal?: AbortSignal;
  onJobUpdate?: (job: GenerateToolScriptJob) => void;
  /** Enables automatic repair attempts for known failure codes (default: true). */
  autoRepair?: boolean;
  /** Maximum number of automatic repair attempts (default: 3). */
  maxAutoRepairAttempts?: number;
  /** Optional context appended to each repair request. */
  repairAdditionalContext?: string;
  /**
   * Optional custom instruction builder. Return `undefined` to fall back to the
   * default error-specific instructions.
   */
  repairInstructionBuilder?:
    | ((job: GenerateToolScriptJob) => string | undefined | Promise<string | undefined>)
    | null;
  /** Callback invoked before a repair attempt is submitted. */
  onRepairAttempt?: (attempt: ToolGenerationRepairAttempt) => void;
  /** Callback invoked after a prompt enhancement has been generated. */
  onPromptEnhancement?: (enhancement: ToolPromptEnhancement) => void;
}

export interface GeneratedToolScript {
  code: string;
  language?: string;
  summary: string;
  description?: string;
  descriptor: ToolScriptDescriptor;
  inputSchema?: ToolScriptInputSchema;
  expectedOutputDescription?: string | null;
  suggestedFileName: string;
  job: GenerateToolScriptJob;
  initialResponse: GenerateToolScriptJobOperationResponse;
  result: GenerateToolScriptResponse;
  repairHistory: ToolGenerationRepairAttempt[];
  promptEnhancement?: ToolPromptEnhancement | null;
}

const DEFAULT_OUTPUT_FORMAT = 'text';
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_GENERATOR_INSTRUCTIONS_LENGTH = 1_600;

export const MAX_TOOL_SCRIPT_ATTACHMENTS = 4;
export const MAX_TOOL_SCRIPT_ATTACHMENT_CHARS = 1_000_000;
export const MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS = 2_000_000;

const DEFAULT_SUBMIT_RETRIES = 2;
const DEFAULT_SUBMIT_RETRY_DELAY_MS = 1_500;
const RETRYABLE_STATUS_CODES = new Set([429, 503]);
const DEFAULT_MAX_REPAIR_ATTEMPTS = 3;
const REPAIRABLE_ERROR_CODES = new Set([
  'missing_code',
  'invalid_llm_payload',
  'script_generation_failed'
]);
const DEFAULT_REPAIR_INSTRUCTION_BY_CODE: Record<string, string> = {
  missing_code:
    'Antwort enthielt keinen ausführbaren Code. Bitte liefere ein vollständiges CommonJS-Modul mit exportierter run-Funktion.',
  invalid_llm_payload:
    'Die Antwort konnte nicht verarbeitet werden. Strukturieren Sie den Schritt mit gültigem JavaScript-Code und vollständigen Blöcken.',
  script_generation_failed:
    'Der Generator konnte das Skript nicht validieren. Bitte beheben Sie alle Fehler und liefern Sie lauffähigen Node.js-Code.'
};
const FALLBACK_REPAIR_INSTRUCTION =
  'Automatische Reparatur: Bitte korrigiere das Skript und liefere lauffähigen Node.js-Code einschließlich module.exports = { run }.';
const MAX_REPAIR_INSTRUCTIONS_LENGTH = 600;
const MAX_REPAIR_CONTEXT_LENGTH = 2_000;

export class ToolGenerationJobFailedError extends Error {
  public readonly job: GenerateToolScriptJob;
  public readonly repairs: ToolGenerationRepairAttempt[];

  constructor(job: GenerateToolScriptJob, repairs: ToolGenerationRepairAttempt[] = []) {
    super(job.error?.message ?? 'Tool generation job failed');
    this.name = 'ToolGenerationJobFailedError';
    this.job = job;
    this.repairs = repairs;
  }
}

export class ToolGenerationJobTimeoutError extends Error {
  public readonly job: GenerateToolScriptJob;

  constructor(job: GenerateToolScriptJob, timeoutMs: number) {
    super(`Tool generation job timed out after ${timeoutMs} ms`);
    this.name = 'ToolGenerationJobTimeoutError';
    this.job = job;
  }
}

export interface ToolGenerationRepairAttempt {
  attempt: number;
  previousJob: GenerateToolScriptJob;
  repairJob: GenerateToolScriptJob;
  instructions?: string;
}

export class ToolGenerationRepairLimitReachedError extends Error {
  public readonly job: GenerateToolScriptJob;
  public readonly repairs: ToolGenerationRepairAttempt[];

  constructor(job: GenerateToolScriptJob, repairs: ToolGenerationRepairAttempt[] = []) {
    super('Automatic repair limit reached for tool generation job');
    this.name = 'ToolGenerationRepairLimitReachedError';
    this.job = job;
    this.repairs = repairs;
  }
}

export interface ToolGenerationErrorDetails {
  code?: string;
  message?: string;
  metadata?: UnknownRecord;
  attempts?: unknown;
  rawBody: unknown;
}

export function buildToolGenerationPrompt(
  query: string,
  options: {
    preferredInputMode?: ToolScriptInputMode;
    outputFormat?: string;
    includeShebang?: boolean;
    additionalContext?: string;
  } = {}
): string {
  const inputMode = options.preferredInputMode ?? 'file';
  const outputFormat = (options.outputFormat ?? DEFAULT_OUTPUT_FORMAT).toLowerCase();
  const shebangInstruction =
    options.includeShebang === false
      ? '- Liefere das Skript ohne Shebang.'
      : '- Füge am Anfang einen Shebang `#!/usr/bin/env node` hinzu.';

  const inputInstructions: Record<ToolScriptInputMode, string> = {
    file: 'Das Skript nimmt den Pfad zur Eingabedatei als erstes Argument (`process.argv[2]`) entgegen. Validiere, dass das Argument vorhanden ist, und wirf bei Fehlern einen verständlichen Hinweis aus.',
    stdin:
      'Das Skript liest die Eingabe über STDIN (`process.stdin`) ein. Verarbeite die Daten vollständig, bevor du mit der Konvertierung startest.',
    environment:
      'Das Skript liest die Eingabe aus der Umgebungsvariable `WILLI_MAKO_INPUT`. Prüfe, ob die Variable gesetzt ist, und gib andernfalls eine hilfreiche Fehlermeldung aus.'
  };

  const outputInstruction =
    outputFormat === 'csv'
      ? 'Erzeuge eine CSV-Datei im Arbeitsverzeichnis. Der Dateiname soll sprechend sein und auf `.csv` enden. Nutze `fs/promises`.'
      : outputFormat === 'json'
        ? 'Erzeuge eine JSON-Datei im Arbeitsverzeichnis und speichere sie mit `fs/promises`. Strukturierte Daten sollen sauber formatiert werden.'
        : 'Schreibe das Ergebnis in eine Textdatei im Arbeitsverzeichnis und benutze `fs/promises`.';

  const baseLines = [
    'Du bist Senior Node.js-Ingenieur*in mit Fokus auf Energie-Marktkommunikation.',
    'Erstelle ein eigenständig lauffähiges CommonJS-Skript für Node.js 18+.',
    `Auftrag:\n${query}`,
    '',
    'Vorgaben:',
    '- Verwende ausschließlich die Node.js-Standardbibliothek (keine externen Abhängigkeiten).',
    '- Dokumentiere am Anfang in Kurzform Zweck und Nutzung (Kommentarblock).',
    '- Baue eine robuste Fehlerbehandlung ein und gib sinnvolle Fehlermeldungen aus.',
    `- ${inputInstructions[inputMode]}`,
    `- ${outputInstruction}`,
    '- Stelle sicher, dass Pfade plattformunabhängig über `path` aufgelöst werden.',
    '- Verwende moderne Sprachfeatures (async/await, const/let, Template Strings).',
    '- Nutze ausschließlich `require()`-Aufrufe auf Standardbibliotheken (z. B. `fs/promises`, `path`).',
    '- Exportiere eine asynchrone Funktion `run` (`module.exports = { run }`).',
    '- Führe `run()` automatisch aus, wenn das Skript direkt gestartet wird (`if (require.main === module) { run().catch(...) }`).',
    '- Führe am Ende eine kurze Erfolgsnachricht über `console.log` aus.',
    '- Überschreibe keine bestehenden Dateien ohne Benutzerbestätigung.',
    shebangInstruction
  ].filter(Boolean);

  let prompt = baseLines.join('\n');

  const additionalContext = options.additionalContext?.trim();
  if (additionalContext) {
    const header = '\nZusätzliche Hinweise:\n';
    let remaining = MAX_GENERATOR_INSTRUCTIONS_LENGTH - (prompt.length + header.length);

    if (remaining > 0) {
      let trimmed = additionalContext;
      if (additionalContext.length > remaining) {
        // Try to cut at a word boundary to keep hints readable.
        trimmed = additionalContext.slice(0, Math.max(0, remaining - 1));
        const lastWhitespace = trimmed.lastIndexOf(' ');
        if (lastWhitespace > 0 && trimmed.length - lastWhitespace < 40) {
          trimmed = trimmed.slice(0, lastWhitespace);
        }
        trimmed = trimmed.trimEnd();
        if (trimmed.length === 0) {
          remaining = 0;
        } else {
          trimmed = `${trimmed}…`;
        }
      }

      if (remaining > 0) {
        prompt = `${prompt}${header}${trimmed}`;
      }
    }
  }

  if (prompt.length > MAX_GENERATOR_INSTRUCTIONS_LENGTH) {
    prompt = prompt.slice(0, MAX_GENERATOR_INSTRUCTIONS_LENGTH);
  }

  return prompt;
}

export function extractPrimaryCodeBlock(value: string): { code: string; language?: string } | null {
  const pattern = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    const language = match[1]?.trim();
    const code = match[2]?.trim();
    if (code) {
      return { code, language: language && language.length > 0 ? language : undefined };
    }
  }

  return null;
}

export function deriveSuggestedFileName(query: string, explicitName?: string): string {
  if (explicitName && explicitName.trim()) {
    return explicitName.trim();
  }

  const normalized = query
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-');

  const slug = normalized.length > 0 ? normalized.slice(0, 48) : 'generated-tool';
  const base = slug.length > 0 ? slug : 'tool-script';
  const name = base.replace(/-+/g, '-');
  const extension = name.endsWith('.js') ? '' : '.js';
  return `${name}${extension}`;
}

export function normalizeToolScriptAttachments(
  attachments?: ToolScriptAttachment[] | null
): ToolScriptAttachment[] | undefined {
  if (!attachments || attachments.length === 0) {
    return undefined;
  }

  const sanitized = attachments.map((attachment, index) => {
    if (!attachment || typeof attachment !== 'object') {
      throw new Error(`Attachment at position ${index + 1} is invalid.`);
    }

    const filename = typeof attachment.filename === 'string' ? attachment.filename.trim() : '';
    if (!filename) {
      throw new Error(`Attachment at position ${index + 1} is missing a filename.`);
    }

    if (typeof attachment.content !== 'string') {
      throw new Error(`Attachment "${filename}" must provide textual content.`);
    }

    if (attachment.content.length === 0) {
      throw new Error(`Attachment "${filename}" must not be empty.`);
    }

    const mimeType =
      typeof attachment.mimeType === 'string' && attachment.mimeType.trim().length > 0
        ? attachment.mimeType.trim()
        : undefined;

    const description =
      typeof attachment.description === 'string' && attachment.description.trim().length > 0
        ? attachment.description.trim()
        : undefined;

    let weight: number | undefined;
    if (attachment.weight !== undefined && attachment.weight !== null) {
      const numericWeight = Number(attachment.weight);
      if (!Number.isFinite(numericWeight)) {
        throw new Error(
          `Attachment "${filename}" has an invalid weight. Expected a finite number between 0 and 100.`
        );
      }
      if (numericWeight < 0 || numericWeight > 100) {
        throw new Error(
          `Attachment "${filename}" has a weight (${numericWeight}) outside the allowed range 0-100.`
        );
      }
      weight = numericWeight;
    }

    return {
      filename,
      content: attachment.content,
      mimeType,
      description,
      weight
    } satisfies ToolScriptAttachment;
  });

  const expanded = sanitized.flatMap((attachment) => splitAttachmentIfNeeded(attachment));

  if (expanded.length > MAX_TOOL_SCRIPT_ATTACHMENTS) {
    throw new Error(
      `Too many attachments provided (${expanded.length}). Maximum allowed is ${MAX_TOOL_SCRIPT_ATTACHMENTS}.`
    );
  }

  let totalCharacters = 0;
  for (const attachment of expanded) {
    const length = attachment.content.length;
    if (length > MAX_TOOL_SCRIPT_ATTACHMENT_CHARS) {
      throw new Error(
        `Attachment "${attachment.filename}" exceeds the maximum size of ${MAX_TOOL_SCRIPT_ATTACHMENT_CHARS} characters.`
      );
    }
    totalCharacters += length;
  }

  if (totalCharacters > MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS) {
    throw new Error(
      `Combined attachment size (${totalCharacters} characters) exceeds the allowed maximum of ${MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS}.`
    );
  }

  return expanded;
}

function splitAttachmentIfNeeded(attachment: ToolScriptAttachment): ToolScriptAttachment[] {
  const content = attachment.content;
  if (content.length <= MAX_TOOL_SCRIPT_ATTACHMENT_CHARS) {
    return [attachment];
  }

  const parts = Math.ceil(content.length / MAX_TOOL_SCRIPT_ATTACHMENT_CHARS);
  if (parts > MAX_TOOL_SCRIPT_ATTACHMENTS) {
    throw new Error(
      `Attachment "${attachment.filename}" is too large to split within the ${MAX_TOOL_SCRIPT_ATTACHMENTS} attachment limit.`
    );
  }

  const weightPerChunk =
    attachment.weight !== undefined ? Number(attachment.weight) / parts : undefined;

  const slices: ToolScriptAttachment[] = [];
  for (let index = 0; index < parts; index++) {
    const start = index * MAX_TOOL_SCRIPT_ATTACHMENT_CHARS;
    const end = start + MAX_TOOL_SCRIPT_ATTACHMENT_CHARS;
    const chunkContent = content.slice(start, end);

    slices.push({
      filename: appendPartSuffix(attachment.filename, index + 1, parts),
      content: chunkContent,
      mimeType: attachment.mimeType,
      description: attachment.description
        ? `${attachment.description} (part ${index + 1}/${parts})`
        : `Part ${index + 1}/${parts} of ${attachment.filename}`,
      weight: weightPerChunk
    });
  }

  return slices;
}

function appendPartSuffix(filename: string, part: number, total: number): string {
  const trimmed = filename.trim();
  if (!trimmed) {
    return `attachment-part-${part}-of-${total}`;
  }

  const dotIndex = trimmed.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === trimmed.length - 1) {
    return `${trimmed} (part ${part}/${total})`;
  }

  const name = trimmed.slice(0, dotIndex);
  const extension = trimmed.slice(dotIndex);
  return `${name} (part ${part}/${total})${extension}`;
}

function sanitizeRepairInstructions(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > MAX_REPAIR_INSTRUCTIONS_LENGTH
    ? trimmed.slice(0, MAX_REPAIR_INSTRUCTIONS_LENGTH)
    : trimmed;
}

function sanitizeRepairContext(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.length > MAX_REPAIR_CONTEXT_LENGTH
    ? trimmed.slice(0, MAX_REPAIR_CONTEXT_LENGTH)
    : trimmed;
}

async function buildRepairInstructionsForJob(
  job: GenerateToolScriptJob,
  builder: GenerateToolScriptParams['repairInstructionBuilder']
): Promise<string | undefined> {
  if (builder) {
    const custom = await builder(job);
    const sanitized = sanitizeRepairInstructions(custom ?? undefined);
    if (sanitized) {
      return sanitized;
    }
  }

  const code = job.error?.code;
  const hints: string[] = [];
  if (code && DEFAULT_REPAIR_INSTRUCTION_BY_CODE[code]) {
    hints.push(DEFAULT_REPAIR_INSTRUCTION_BY_CODE[code]);
  }

  const message = typeof job.error?.message === 'string' ? job.error.message.trim() : '';
  if (message) {
    hints.push(message);
  }

  const detail = extractPrimaryErrorDetail(job.error?.details);
  if (detail) {
    hints.push(detail);
  }

  const composed = hints.length > 0 ? hints.join(' ') : FALLBACK_REPAIR_INSTRUCTION;
  return sanitizeRepairInstructions(composed);
}

function extractPrimaryErrorDetail(details: unknown): string | undefined {
  if (!details || typeof details !== 'object') {
    return undefined;
  }

  if ('hint' in details && typeof (details as { hint?: unknown }).hint === 'string') {
    return (details as { hint: string }).hint;
  }

  if ('reason' in details && typeof (details as { reason?: unknown }).reason === 'string') {
    return (details as { reason: string }).reason;
  }

  return undefined;
}

function shouldAttemptRepair(job: GenerateToolScriptJob, remainingAttempts: number): boolean {
  if (remainingAttempts <= 0) {
    return false;
  }
  if (job.status !== 'failed') {
    return false;
  }
  const code = job.error?.code;
  return Boolean(code && REPAIRABLE_ERROR_CODES.has(code));
}

async function pollGenerateJob(
  client: ToolGenerationClient,
  job: GenerateToolScriptJob,
  options: {
    pollIntervalMs: number;
    timeoutMs: number;
    signal?: AbortSignal;
    onJobUpdate?: (job: GenerateToolScriptJob) => void;
  }
): Promise<GenerateToolScriptJob> {
  let currentJob: GenerateToolScriptJob = job;
  const startedAt = Date.now();

  while (!isTerminalStatus(currentJob.status)) {
    if (options.signal?.aborted) {
      throw new Error('Tool generation aborted by caller');
    }

    if (Date.now() - startedAt > options.timeoutMs) {
      throw new ToolGenerationJobTimeoutError(currentJob, options.timeoutMs);
    }

    await delay(options.pollIntervalMs);
    const pollResponse = await client.getToolJob(currentJob.id);
    currentJob = ensureGenerateScriptJob(pollResponse.data.job);
    options.onJobUpdate?.(currentJob);
  }

  return currentJob;
}

export async function generateToolScript({
  client,
  sessionId,
  query,
  preferredInputMode,
  outputFormat,
  fileNameHint,
  includeShebang,
  additionalContext,
  attachments,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxSubmitRetries = DEFAULT_SUBMIT_RETRIES,
  submitRetryBackoffMs = DEFAULT_SUBMIT_RETRY_DELAY_MS,
  signal,
  onJobUpdate,
  autoRepair,
  maxAutoRepairAttempts,
  repairAdditionalContext,
  repairInstructionBuilder,
  onRepairAttempt,
  onPromptEnhancement
}: GenerateToolScriptParams): Promise<GeneratedToolScript> {
  let finalQuery = query;
  let finalAdditionalContext = additionalContext;
  let promptEnhancement: ToolPromptEnhancement | null = null;

  if (isGeminiAvailable()) {
    try {
      const enhancement = await enhanceToolGenerationRequest({
        query,
        additionalContext,
        attachments
      });

      if (enhancement) {
        promptEnhancement = {
          engine: 'gemini',
          model: GEMINI_MODEL,
          originalQuery: query,
          enhancedQuery: enhancement.enhancedQuery,
          additionalContext: enhancement.additionalContext,
          validationChecklist: enhancement.validationChecklist,
          rawText: enhancement.rawText
        };

        if (enhancement.enhancedQuery && enhancement.enhancedQuery.trim().length > 0) {
          finalQuery = enhancement.enhancedQuery.trim();
        }

        const contextParts: string[] = [];
        if (additionalContext && additionalContext.trim().length > 0) {
          contextParts.push(additionalContext.trim());
        }
        if (enhancement.additionalContext && enhancement.additionalContext.trim().length > 0) {
          contextParts.push(enhancement.additionalContext.trim());
        }
        if (enhancement.validationChecklist && enhancement.validationChecklist.length > 0) {
          const checklist = ['Gemini Validierungs-Checkliste:']
            .concat(enhancement.validationChecklist.map((item) => `- ${item}`))
            .join('\n');
          contextParts.push(checklist);
        }

        const combinedContext = contextParts.join('\n\n').trim();
        finalAdditionalContext = combinedContext.length > 0 ? combinedContext : undefined;
      }
    } catch (error) {
      promptEnhancement = {
        engine: 'gemini',
        model: GEMINI_MODEL,
        originalQuery: query,
        rawText: error instanceof Error ? `ERROR: ${error.message}` : String(error)
      };
    }

    if (promptEnhancement) {
      onPromptEnhancement?.(promptEnhancement);
    }
  }

  const instructions = buildToolGenerationPrompt(finalQuery, {
    preferredInputMode,
    outputFormat,
    includeShebang,
    additionalContext: finalAdditionalContext
  });
  const expectedOutputDescription = deriveExpectedOutputDescription(outputFormat);
  const constraints = buildDefaultConstraints(preferredInputMode);

  const normalizedAttachments = normalizeToolScriptAttachments(attachments);

  const requestPayload: GenerateToolScriptRequest = {
    sessionId,
    instructions,
    expectedOutputDescription,
    additionalContext: finalAdditionalContext,
    constraints
  };

  if (normalizedAttachments) {
    requestPayload.attachments = normalizedAttachments;
  }

  const retryAttempts =
    typeof maxSubmitRetries === 'number' && Number.isFinite(maxSubmitRetries)
      ? Math.max(0, Math.trunc(maxSubmitRetries))
      : DEFAULT_SUBMIT_RETRIES;
  const retryDelay =
    typeof submitRetryBackoffMs === 'number' && Number.isFinite(submitRetryBackoffMs)
      ? Math.max(0, submitRetryBackoffMs)
      : DEFAULT_SUBMIT_RETRY_DELAY_MS;

  const initialResponse = await retryWithBackoff(() => client.generateToolScript(requestPayload), {
    retries: retryAttempts,
    initialDelayMs: retryDelay
  });

  let currentJob = ensureGenerateScriptJob(initialResponse.data.job);
  onJobUpdate?.(currentJob);

  currentJob = await pollGenerateJob(client, currentJob, {
    pollIntervalMs,
    timeoutMs,
    signal,
    onJobUpdate
  });

  const repairHistory: ToolGenerationRepairAttempt[] = [];
  const autoRepairEnabled = autoRepair !== false;
  const instructionBuilder = repairInstructionBuilder ?? undefined;
  const sharedRepairContext = sanitizeRepairContext(repairAdditionalContext);

  const maxRepairAttempts =
    typeof maxAutoRepairAttempts === 'number' && Number.isFinite(maxAutoRepairAttempts)
      ? Math.max(0, Math.trunc(maxAutoRepairAttempts))
      : DEFAULT_MAX_REPAIR_ATTEMPTS;

  let remainingRepairs = autoRepairEnabled ? maxRepairAttempts : 0;

  while (autoRepairEnabled && shouldAttemptRepair(currentJob, remainingRepairs)) {
    remainingRepairs -= 1;

    const instructions = await buildRepairInstructionsForJob(currentJob, instructionBuilder);
    const repairRequest: RepairGenerateToolScriptRequest = {
      sessionId,
      jobId: currentJob.id
    };

    if (instructions) {
      repairRequest.repairInstructions = instructions;
    }

    if (sharedRepairContext) {
      repairRequest.additionalContext = sharedRepairContext;
    }

    if (normalizedAttachments) {
      repairRequest.attachments = normalizedAttachments;
    }

    const repairResponse = await client.repairToolScript(repairRequest);
    let repairJob = ensureGenerateScriptJob(repairResponse.data.job);

    const attempt: ToolGenerationRepairAttempt = {
      attempt: repairHistory.length + 1,
      previousJob: currentJob,
      repairJob,
      instructions
    };

    repairHistory.push(attempt);
    onJobUpdate?.(repairJob);

    repairJob = await pollGenerateJob(client, repairJob, {
      pollIntervalMs,
      timeoutMs,
      signal,
      onJobUpdate
    });

    attempt.repairJob = repairJob;
    onRepairAttempt?.(attempt);
    currentJob = repairJob;

    if (currentJob.status === 'succeeded' && currentJob.result) {
      break;
    }
  }

  const repairLimitReached =
    autoRepairEnabled &&
    repairHistory.length > 0 &&
    remainingRepairs <= 0 &&
    shouldAttemptRepair(currentJob, 1);

  if (currentJob.status !== 'succeeded' || !currentJob.result) {
    if (repairLimitReached) {
      throw new ToolGenerationRepairLimitReachedError(currentJob, repairHistory);
    }

    throw new ToolGenerationJobFailedError(currentJob, repairHistory);
  }

  const result = currentJob.result;
  const descriptor = result.script;

  return {
    code: descriptor.code,
    language: descriptor.language,
    summary: finalQuery,
    description: descriptor.description,
    descriptor,
    inputSchema: result.inputSchema,
    expectedOutputDescription: result.expectedOutputDescription ?? null,
    suggestedFileName: deriveSuggestedFileName(finalQuery, fileNameHint),
    job: currentJob,
    initialResponse,
    result,
    repairHistory,
    promptEnhancement
  };
}

function deriveExpectedOutputDescription(outputFormat?: string): string | undefined {
  if (!outputFormat) {
    return undefined;
  }

  const format = outputFormat.toLowerCase();
  if (format === 'csv') {
    return 'Das Tool soll eine CSV-Datei erzeugen und im aktuellen Arbeitsverzeichnis speichern.';
  }
  if (format === 'json') {
    return 'Das Tool soll eine JSON-Datei mit strukturierten Ergebnissen erzeugen.';
  }
  return 'Das Tool soll eine Textausgabe erzeugen und speichern.';
}

function buildDefaultConstraints(inputMode?: ToolScriptInputMode): ToolScriptConstraints {
  const constraints: ToolScriptConstraints = {
    deterministic: true,
    allowNetwork: false,
    allowFilesystem: true
  };

  if (inputMode === 'environment') {
    constraints.allowFilesystem = true;
  }

  return constraints;
}

function ensureGenerateScriptJob(job: ToolJob): GenerateToolScriptJob {
  if (job.type !== 'generate-script') {
    throw new Error(`Unexpected job type ${job.type}. Expected generate-script.`);
  }

  return job;
}

function isTerminalStatus(status: string): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}

async function delay(ms: number): Promise<void> {
  if (ms <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, ms));
}

interface RetryOptions {
  retries: number;
  initialDelayMs: number;
  multiplier?: number;
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  { retries, initialDelayMs, multiplier = 2 }: RetryOptions
): Promise<T> {
  let attempt = 0;
  let delayMs = initialDelayMs;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isRetryableError(error)) {
        throw error;
      }

      if (delayMs > 0) {
        await delay(delayMs);
      }

      attempt += 1;
      delayMs = delayMs > 0 ? Math.min(delayMs * multiplier, 30_000) : 0;
    }
  }

  throw new Error('Retry attempts exhausted.');
}

function isRetryableError(error: unknown): boolean {
  const status = extractErrorStatus(error);
  if (status !== null && RETRYABLE_STATUS_CODES.has(status)) {
    return true;
  }

  return false;
}

function extractErrorStatus(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const statusValue = (error as { status?: unknown }).status;
    if (typeof statusValue === 'number') {
      return statusValue;
    }
  }

  return null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function findAttemptsDeep(value: unknown, visited: Set<unknown> = new Set()): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (visited.has(value)) {
    return undefined;
  }
  visited.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findAttemptsDeep(entry, visited);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if ('attempts' in value) {
    const attemptValue = (value as UnknownRecord).attempts;
    if (Array.isArray(attemptValue) || typeof attemptValue === 'number') {
      return attemptValue;
    }
  }

  for (const nested of Object.values(value)) {
    const found = findAttemptsDeep(nested, visited);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

export function extractToolGenerationErrorDetails(
  body: unknown
): ToolGenerationErrorDetails | null {
  if (!isRecord(body)) {
    return null;
  }

  const errorInfo = isRecord(body.error) ? (body.error as UnknownRecord) : undefined;

  const primaryMetadata = (() => {
    if (isRecord(body.metadata)) {
      return body.metadata as UnknownRecord;
    }
    if (isRecord(body.data) && isRecord((body.data as UnknownRecord).metadata)) {
      return (body.data as UnknownRecord).metadata as UnknownRecord;
    }
    return undefined;
  })();

  const attempts = findAttemptsDeep(primaryMetadata ?? body);

  return {
    code: typeof errorInfo?.code === 'string' ? (errorInfo.code as string) : undefined,
    message: typeof errorInfo?.message === 'string' ? (errorInfo.message as string) : undefined,
    metadata: primaryMetadata,
    attempts,
    rawBody: body
  };
}
