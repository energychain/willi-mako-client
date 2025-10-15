import type {
  GenerateToolScriptRequest,
  GenerateToolScriptOperationResponse,
  ToolScriptConstraints,
  ToolScriptDescriptor,
  ToolScriptInputSchema
} from './types.js';

export type ToolScriptInputMode = 'stdin' | 'file' | 'environment';

export interface ToolGenerationClient {
  generateToolScript(
    payload: GenerateToolScriptRequest
  ): Promise<GenerateToolScriptOperationResponse>;
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
  rawResponse: GenerateToolScriptOperationResponse;
}

const DEFAULT_OUTPUT_FORMAT = 'text';

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
  additionalContext
}: GenerateToolScriptParams): Promise<GeneratedToolScript> {
  const instructions = buildToolGenerationPrompt(query, {
    preferredInputMode,
    outputFormat,
    includeShebang,
    additionalContext
  });
  const expectedOutputDescription = deriveExpectedOutputDescription(outputFormat);
  const constraints = buildDefaultConstraints(preferredInputMode);

  const response = await client.generateToolScript({
    sessionId,
    instructions,
    expectedOutputDescription,
    additionalContext,
    constraints
  });

  const descriptor = response.data.script;

  return {
    code: descriptor.code,
    language: descriptor.language,
    summary: query,
    description: descriptor.description,
    descriptor,
    inputSchema: response.data.inputSchema,
    expectedOutputDescription: response.data.expectedOutputDescription ?? null,
    suggestedFileName: deriveSuggestedFileName(query, fileNameHint),
    rawResponse: response
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
