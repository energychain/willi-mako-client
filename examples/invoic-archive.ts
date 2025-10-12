#!/usr/bin/env ts-node
/*
 * Example: INVOIC Compliance Archiving
 * ------------------------------------
 * Shows how Netzbetreiber teams can archive invoice documents (binary/PDF)
 * together with metadata for audit and downstream analytics.
 */

import { WilliMakoClient } from '@stromdao/willi-mako-client';

const SESSION_ID = `invoic-archive-${Date.now()}`;

// Minimal PDF ("Hello Willi-Mako") encoded as base64, safe for demos.
const SAMPLE_PDF_BASE64 =
  'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlcyA8PC9Gb250IDw8L0YwIDMgMCBSPj4+Pi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzIFszIDAgUl0vQ291bnQgMT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL05hbWUvRjAvQmFzZUZvbnQvSGVsdmV0aWNhPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDkwPj4Kc3RyZWFtCkJUIAogICAgICAgICAgICBIZWxsbyBXaWxsaS1NYWtvISEKRVQKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUi9PcGVuQWN0aW9uIFsvVmlldy9QcmludF0+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAxMDUgMDAwMDAgbiAKMDAwMDAwMDA3NiAwMDAwMCBuIAowMDAwMDAwMjAyIDAwMDAwIG4gCjAwMDAwMDAzMjIgMDAwMDAgbiAKdHJhaWxlcgo8PC9Sb290IDEgMCBSL1NpemUgNi9JRCBbPDA1ZTM0ODBiMzgyMzUyNjZhYTYxYjExNjliYTk4NzFjPjw1ZTQwNzc0MzRiYzFmYjNkZTg0ZTRkOTkxMmMxMDkwPl0+PgpzdGFydHhyZWYKMzk4CiUlRU9G';

async function main(): Promise<void> {
  const client = new WilliMakoClient();

  await client.createArtifact({
    sessionId: SESSION_ID,
    type: 'invoice-document',
    name: 'INVOIC_2024-02-28.pdf',
    mimeType: 'application/pdf',
    encoding: 'base64',
    content: SAMPLE_PDF_BASE64,
    tags: ['invoic', 'invoice', 'netzbetreiber'],
    metadata: {
      customerId: '9876543210',
      billingPeriod: '2024-02',
      format: 'INVOIC'
    }
  });

  console.log('Invoice archived successfully. Session:', SESSION_ID);
}

main().catch((error) => {
  console.error('Failed to archive invoice:', error);
  process.exit(1);
});
