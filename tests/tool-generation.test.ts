import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildToolGenerationPrompt,
  deriveSuggestedFileName,
  extractPrimaryCodeBlock,
  extractToolGenerationErrorDetails,
  normalizeToolScriptAttachments,
  generateToolScript,
  ToolGenerationJobFailedError,
  ToolGenerationRepairLimitReachedError,
  type ToolGenerationClient,
  MAX_TOOL_SCRIPT_ATTACHMENT_CHARS,
  MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS
} from '../src/tool-generation.js';
import type {
  GenerateToolScriptJob,
  GenerateToolScriptResponse,
  ToolScriptDescriptor,
  ToolPromptEnhancement,
  ToolJobError,
  ToolJobStatus
} from '../src/types.js';

const mockGenerateContent = vi.fn(async () => ({
  response: {
    text: () =>
      JSON.stringify({
        enhanced_query: 'Erweitere MSCONS-Validierung mit formalen Prüfschritten',
        additional_context: 'Stelle sicher, dass alle Profilwerte numerisch sind.',
        validation_checklist: ['Pflichtfelder überprüfen', 'Fehler bei fehlenden Werten melden']
      })
  }
}));

vi.mock('@google/generative-ai', () => {
  class MockModel {
    generateContent = mockGenerateContent;
  }

  class MockGeminiClient {
    constructor(_apiKey: string) {}
    getGenerativeModel() {
      return new MockModel();
    }
  }

  return {
    GoogleGenerativeAI: MockGeminiClient
  };
});

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  mockGenerateContent.mockClear();
});

describe('tool generation helpers', () => {
  it('extracts the first code block from reasoning text', () => {
    const reasoning = [
      'Intro text',
      '',
      '```javascript',
      "console.log('hello');",
      '```',
      '',
      'More text'
    ].join('\n');

    const result = extractPrimaryCodeBlock(reasoning);
    expect(result).not.toBeNull();
    expect(result?.language).toBe('javascript');
    expect(result?.code).toContain("console.log('hello');");
  });

  it('derives a default file name from the query', () => {
    const name = deriveSuggestedFileName('MSCONS Nachricht in CSV umwandeln');
    expect(name).toMatch(/mscons-nachricht-in-csv-umwandeln/);
    expect(name.endsWith('.js')).toBe(true);
  });

  it('builds a prompt including input instructions', () => {
    const prompt = buildToolGenerationPrompt('Erstelle ein Tool für UTILMD Validierung', {
      preferredInputMode: 'stdin',
      outputFormat: 'json'
    });

    expect(prompt).toContain('STDIN');
    expect(prompt).toContain('JSON-Datei');
    expect(prompt).toContain('Erstelle ein eigenständig lauffähiges CommonJS-Skript');
  });

  it('extracts attempts metadata from error payloads', () => {
    const body = {
      error: { code: 'generation_failed', message: 'Unable to generate script' },
      metadata: {
        attempts: [
          { attempt: 1, status: 'failed', message: 'Invalid instructions' },
          { attempt: 2, status: 'failed', message: 'Timeout' }
        ],
        lastAttemptedAt: '2025-10-16T08:00:00.000Z'
      }
    };

    const details = extractToolGenerationErrorDetails(body);
    expect(details).not.toBeNull();
    expect(details?.code).toBe('generation_failed');
    expect(details?.message).toBe('Unable to generate script');
    expect(Array.isArray(details?.attempts)).toBe(true);
    expect((details?.attempts as unknown[]).length).toBe(2);
    expect(details?.metadata?.lastAttemptedAt).toBe('2025-10-16T08:00:00.000Z');
  });

  it('normalizes attachments and splits oversized content into weighted parts', () => {
    const oversized = 'x'.repeat(MAX_TOOL_SCRIPT_ATTACHMENT_CHARS + 42);
    const attachments = normalizeToolScriptAttachments([
      {
        filename: 'context.txt',
        content: oversized,
        description: 'Long domain guide',
        weight: 0.9
      }
    ]);

    expect(attachments).toBeDefined();
    expect(attachments).toHaveLength(2);
    const [first, second] = attachments ?? [];
    expect(first.filename).toContain('part 1/2');
    expect(second?.filename).toContain('part 2/2');
    expect(first.description).toContain('part 1/2');
    expect(second?.description).toContain('part 2/2');
    expect(first.weight).toBeCloseTo(0.45, 5);
    expect(second?.weight).toBeCloseTo(0.45, 5);
  });

  it('rejects attachments that exceed the combined character budget', () => {
    const part = 'a'.repeat(Math.floor(MAX_TOOL_SCRIPT_ATTACHMENT_TOTAL_CHARS / 3) + 500);

    expect(() =>
      normalizeToolScriptAttachments([
        { filename: 'one.txt', content: part },
        { filename: 'two.txt', content: part },
        { filename: 'three.txt', content: part }
      ])
    ).toThrow(/Combined attachment size/i);
  });

  it('rejects attachments with invalid weight values', () => {
    expect(() =>
      normalizeToolScriptAttachments([{ filename: 'low.txt', content: 'foo', weight: -1 }])
    ).toThrow(/weight/i);

    expect(() =>
      normalizeToolScriptAttachments([{ filename: 'high.txt', content: 'foo', weight: 101 }])
    ).toThrow(/weight/i);
  });
});

describe('generateToolScript repairs', () => {
  const baseDescriptor: ToolScriptDescriptor = {
    code: 'module.exports = { run: async () => {} };',
    language: 'javascript',
    entrypoint: 'run',
    description: 'Test tool',
    runtime: 'node18',
    deterministic: true,
    dependencies: [],
    source: {
      language: 'node',
      hash: 'abc123',
      bytes: 42,
      preview: 'module.exports = { run: async () => {} };',
      lineCount: 1
    },
    validation: {
      syntaxValid: true,
      deterministic: true,
      forbiddenApis: [],
      warnings: []
    },
    notes: []
  };

  const successfulResult: GenerateToolScriptResponse = {
    sessionId: 'session-1',
    script: baseDescriptor,
    inputSchema: undefined,
    expectedOutputDescription: null
  };

  const now = () => new Date().toISOString();

  const createJob = (options: {
    id: string;
    status: ToolJobStatus;
    attempts?: number;
    error?: ToolJobError | null;
    result?: GenerateToolScriptResponse | null;
    continuedFromJobId?: string | null;
  }): GenerateToolScriptJob => ({
    id: options.id,
    type: 'generate-script',
    sessionId: 'session-1',
    status: options.status,
    attempts: options.attempts ?? 1,
    continuedFromJobId: options.continuedFromJobId ?? null,
    createdAt: now(),
    updatedAt: now(),
    progress: null,
    metadata: null,
    warnings: [],
    result: options.result ?? null,
    error:
      options.error ??
      (options.status === 'failed'
        ? { message: 'Fehler', code: 'unknown_error', details: null }
        : null)
  });

  it('repairs a missing_code failure and returns repair history', async () => {
    const initialJob = createJob({
      id: 'job-initial',
      status: 'failed',
      error: { message: 'Kein Code gefunden', code: 'missing_code', details: null }
    });

    const repairJobQueued = createJob({
      id: 'job-repair',
      status: 'queued',
      attempts: 2,
      continuedFromJobId: 'job-initial',
      error: null
    });

    const repairJobSucceeded = createJob({
      id: 'job-repair',
      status: 'succeeded',
      attempts: 2,
      continuedFromJobId: 'job-initial',
      result: successfulResult,
      error: null
    });

    const client: ToolGenerationClient = {
      generateToolScript: vi.fn(async () => ({
        success: true,
        data: { sessionId: 'session-1', job: initialJob }
      })),
      getToolJob: vi.fn(async (jobId: string) => {
        if (jobId === repairJobQueued.id) {
          return { success: true, data: { job: repairJobSucceeded } };
        }
        throw new Error(`Unexpected jobId: ${jobId}`);
      }),
      repairToolScript: vi.fn(async () => ({
        success: true,
        data: { sessionId: 'session-1', job: repairJobQueued }
      }))
    };

    const generation = await generateToolScript({
      client,
      sessionId: 'session-1',
      query: 'Erzeuge ein Test-Tool',
      pollIntervalMs: 0
    });

    expect(generation.job.id).toBe('job-repair');
    expect(generation.repairHistory).toHaveLength(1);
    expect(generation.repairHistory[0].previousJob.id).toBe('job-initial');
    expect(client.repairToolScript).toHaveBeenCalledTimes(1);
  });

  it('throws when repair attempts exceed configured limit', async () => {
    const initialJob = createJob({
      id: 'job-initial',
      status: 'failed',
      error: { message: 'Kein Code gefunden', code: 'missing_code', details: null }
    });

    const repairJobFailed = createJob({
      id: 'job-repair',
      status: 'failed',
      attempts: 2,
      continuedFromJobId: 'job-initial',
      error: { message: 'Weiterhin fehlender Code', code: 'missing_code', details: null }
    });

    const client: ToolGenerationClient = {
      generateToolScript: vi.fn(async () => ({
        success: true,
        data: { sessionId: 'session-1', job: initialJob }
      })),
      getToolJob: vi.fn(async (jobId: string) => {
        if (jobId === repairJobFailed.id) {
          return { success: true, data: { job: repairJobFailed } };
        }
        throw new Error(`Unexpected jobId: ${jobId}`);
      }),
      repairToolScript: vi.fn(async () => ({
        success: true,
        data: { sessionId: 'session-1', job: repairJobFailed }
      }))
    };

    await expect(
      generateToolScript({
        client,
        sessionId: 'session-1',
        query: 'Erzeuge ein Test-Tool',
        pollIntervalMs: 0,
        maxAutoRepairAttempts: 1
      })
    ).rejects.toBeInstanceOf(ToolGenerationRepairLimitReachedError);

    expect(client.repairToolScript).toHaveBeenCalledTimes(1);
  });

  it('propagates failure when auto repair is disabled', async () => {
    const initialJob = createJob({
      id: 'job-initial',
      status: 'failed',
      error: { message: 'Validierungsfehler', code: 'missing_code', details: null }
    });

    const client: ToolGenerationClient = {
      generateToolScript: vi.fn(async () => ({
        success: true,
        data: { sessionId: 'session-1', job: initialJob }
      })),
      getToolJob: vi.fn(async () => {
        throw new Error('Should not be called');
      }),
      repairToolScript: vi.fn(async () => {
        throw new Error('Should not be called');
      })
    };

    await expect(
      generateToolScript({
        client,
        sessionId: 'session-1',
        query: 'Erzeuge ein Test-Tool',
        pollIntervalMs: 0,
        autoRepair: false
      })
    ).rejects.toBeInstanceOf(ToolGenerationJobFailedError);

    expect(client.repairToolScript).not.toHaveBeenCalled();
  });
});

describe('generateToolScript prompt enhancements', () => {
  it('applies Gemini enhancements when API key is present', async () => {
    process.env.GEMINI_API_KEY = 'test-api-key';

    const baseDescriptor: ToolScriptDescriptor = {
      code: 'module.exports = { run: async () => {} };',
      language: 'javascript',
      entrypoint: 'run',
      description: 'Test tool',
      runtime: 'node18',
      deterministic: true,
      dependencies: [],
      source: {
        language: 'node',
        hash: 'abc123',
        bytes: 42,
        preview: 'module.exports = { run: async () => {} };',
        lineCount: 1
      },
      validation: {
        syntaxValid: true,
        deterministic: true,
        forbiddenApis: [],
        warnings: []
      },
      notes: []
    };

    const successfulResult: GenerateToolScriptResponse = {
      sessionId: 'session-1',
      script: baseDescriptor,
      inputSchema: undefined,
      expectedOutputDescription: null
    };

    const job: GenerateToolScriptJob = {
      id: 'job-success',
      type: 'generate-script',
      sessionId: 'session-1',
      status: 'succeeded',
      attempts: 1,
      continuedFromJobId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: null,
      metadata: null,
      warnings: [],
      result: successfulResult,
      error: null
    };

    const client: ToolGenerationClient = {
      generateToolScript: vi.fn(async () => ({
        success: true,
        data: { sessionId: 'session-1', job }
      })),
      getToolJob: vi.fn(async () => ({
        success: true,
        data: { job }
      })),
      repairToolScript: vi.fn(async () => ({
        success: true,
        data: { sessionId: 'session-1', job }
      }))
    };

    let capturedEnhancement: ToolPromptEnhancement | null = null;

    const generation = await generateToolScript({
      client,
      sessionId: 'session-1',
      query: 'Validiere MSCONS Nachrichten',
      additionalContext: 'Protokolliere fehlerhafte Profilwerte.',
      pollIntervalMs: 0,
      autoRepair: false,
      onPromptEnhancement: (enhancement) => {
        capturedEnhancement = enhancement;
      }
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(client.generateToolScript).toHaveBeenCalledTimes(1);

    const payload = vi.mocked(client.generateToolScript).mock.calls[0][0];
    expect(payload.instructions).toContain('Gemini Validierungs-Checkliste');
    expect(payload.instructions).toContain('Erweitere MSCONS-Validierung');

    expect(generation.summary).toContain('Erweitere MSCONS-Validierung');
    expect(generation.promptEnhancement?.engine).toBe('gemini');
    expect(generation.promptEnhancement?.model).toBe('gemini-2.5-pro');
    expect(generation.promptEnhancement?.validationChecklist).toHaveLength(2);
    expect(capturedEnhancement).not.toBeNull();
  });
});
