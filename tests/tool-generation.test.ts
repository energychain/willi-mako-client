import { describe, expect, it } from 'vitest';
import {
  buildToolGenerationPrompt,
  deriveSuggestedFileName,
  extractPrimaryCodeBlock
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
    expect(name.endsWith('.mjs')).toBe(true);
  });

  it('builds a prompt including input instructions', () => {
    const prompt = buildToolGenerationPrompt('Erstelle ein Tool für UTILMD Validierung', {
      preferredInputMode: 'stdin',
      outputFormat: 'json'
    });

    expect(prompt).toContain('STDIN');
    expect(prompt).toContain('JSON-Datei');
    expect(prompt).toContain('Erstelle ein eigenständig lauffähiges ES-Modul-Skript');
  });
});
