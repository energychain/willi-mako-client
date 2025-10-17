import { describe, expect, it } from 'vitest';
import {
  buildToolGenerationPrompt,
  deriveSuggestedFileName,
  extractPrimaryCodeBlock,
  extractToolGenerationErrorDetails
} from '../src/tool-generation.js';

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
});
