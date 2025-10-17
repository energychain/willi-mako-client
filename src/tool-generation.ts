import type {
  GenerateToolScriptJob,
  GenerateToolScriptJobOperationResponse,
  GenerateToolScriptRequest,
  GenerateToolScriptResponse,
  GetToolJobResponse,
  ToolJob,
  ToolScriptConstraints,
  ToolScriptDescriptor,
  ToolScriptInputSchema
} from './types.js';

type UnknownRecord = Record<string, unknown>;

export type ToolScriptInputMode = 'stdin' | 'file' | 'environment';

export interface ToolGenerationClient {
  generateToolScript(
    payload: GenerateToolScriptRequest
  ): Promise<GenerateToolScriptJobOperationResponse>;
  getToolJob(jobId: string): Promise<GetToolJobResponse>;
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
  pollIntervalMs?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  onJobUpdate?: (job: GenerateToolScriptJob) => void;
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
}

const DEFAULT_OUTPUT_FORMAT = 'text';
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_TIMEOUT_MS = 120_000;

export class ToolGenerationJobFailedError extends Error {
  public readonly job: GenerateToolScriptJob;

  constructor(job: GenerateToolScriptJob) {
    super(job.error?.message ?? 'Tool generation job failed');
    this.name = 'ToolGenerationJobFailedError';
    this.job = job;
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

  const additional = options.additionalContext
    ? `\nZusätzliche Hinweise:\n${options.additionalContext}`
    : '';

  return [
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
    shebangInstruction,
    additional
  ]
    .filter(Boolean)
    .join('\n');
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

export async function generateToolScript({
  client,
  sessionId,
  query,
  preferredInputMode,
  outputFormat,
  fileNameHint,
  includeShebang,
  additionalContext,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal,
  onJobUpdate
}: GenerateToolScriptParams): Promise<GeneratedToolScript> {
  const instructions = buildToolGenerationPrompt(query, {
    preferredInputMode,
    outputFormat,
    includeShebang,
    additionalContext
  });
  const expectedOutputDescription = deriveExpectedOutputDescription(outputFormat);
  const constraints = buildDefaultConstraints(preferredInputMode);

  const initialResponse = await client.generateToolScript({
    sessionId,
    instructions,
    expectedOutputDescription,
    additionalContext,
    constraints
  });

  let job = ensureGenerateScriptJob(initialResponse.data.job);
  onJobUpdate?.(job);

  const startedAt = Date.now();

  while (!isTerminalStatus(job.status)) {
    if (signal?.aborted) {
      throw new Error('Tool generation aborted by caller');
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new ToolGenerationJobTimeoutError(job, timeoutMs);
    }

    await delay(pollIntervalMs);

    const pollResponse = await client.getToolJob(job.id);
    job = ensureGenerateScriptJob(pollResponse.data.job);
    onJobUpdate?.(job);
  }

  if (job.status !== 'succeeded' || !job.result) {
    throw new ToolGenerationJobFailedError(job);
  }

  const result = job.result;
  const descriptor = result.script;

  return {
    code: descriptor.code,
    language: descriptor.language,
    summary: query,
    description: descriptor.description,
    descriptor,
    inputSchema: result.inputSchema,
    expectedOutputDescription: result.expectedOutputDescription ?? null,
    suggestedFileName: deriveSuggestedFileName(query, fileNameHint),
    job,
    initialResponse,
    result
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
