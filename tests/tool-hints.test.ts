import { describe, expect, it } from 'vitest';
import { buildAutoToolHints } from '../src/tool-hints.js';
import type { ToolScriptAttachment } from '../src/types.js';

describe('buildAutoToolHints', () => {
  const sampleMscons = [
    "UNH+0001+MSCONS:D:04B:UN:2.4c'",
    "BGM+Z06+0000001+9'",
    "LOC+Z04+HZ0'",
    "PIA+5+1-1?:1.29.0:SRW'",
    "QTY+187:19.542'",
    "DTM+163:202508232000?+00:303'",
    "DTM+164:202508232015?+00:303'"
  ].join('');

  it('returns MSCONS hints when query and attachment indicate MSCONS', () => {
    const attachments: ToolScriptAttachment[] = [
      {
        filename: 'mscons.edi',
        content: sampleMscons,
        mimeType: 'text/plain'
      }
    ];

    const hints = buildAutoToolHints('MSCONS zu CSV konvertieren', attachments);
    expect(hints).not.toBeNull();
    expect(hints?.additionalContext).toContain('MSCONS');
    expect(hints?.additionalContext).toContain('Messlokations-ID');
    expect(hints?.additionalContext).toContain('QTY+187');
    expect(hints?.repairContext).toEqual(hints?.additionalContext);
  });

  it('returns null when no MSCONS indicators are present', () => {
    const attachments: ToolScriptAttachment[] = [
      {
        filename: 'data.txt',
        content: 'Just some plain text without edifact markers.',
        mimeType: 'text/plain'
      }
    ];

    const hints = buildAutoToolHints('Ein anderes Skript erstellen', attachments);
    expect(hints).toBeNull();
  });
});
