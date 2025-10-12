#!/usr/bin/env ts-node
/*
 * Example: UTILMD Contract Change Validation
 * -----------------------------------------
 * Demonstrates how Lieferanten can validate UTILMD messages and archive results
 * using the Willi-Mako tooling sandbox and artifact store.
 *
 * Run locally (after npm install && npm run build):
 *   node --loader ts-node/esm examples/utilmd-audit.ts
 */

import { WilliMakoClient } from 'willi-mako-client';

const SESSION_ID = `utilmd-audit-${new Date().toISOString()}`;
const UTILMD_PAYLOAD = "UNH+1+UTILMD:D:04B:UN:2.3e'BGM+Z01+47110815+9'...";

async function main(): Promise<void> {
  const client = new WilliMakoClient();

  // Persist raw UTILMD message for audit trail
  await client.createArtifact({
    sessionId: SESSION_ID,
    type: 'edifact-message',
    name: 'UTILMD_Lieferantenwechsel.edi',
    mimeType: 'text/plain',
    encoding: 'utf8',
    content: UTILMD_PAYLOAD,
    tags: ['utilmd', 'lieferant', 'compliance']
  });

  // Validate message structure in sandbox
  const validationJob = await client.createNodeScriptJob({
    sessionId: SESSION_ID,
    source: `
      const payload = ${JSON.stringify(UTILMD_PAYLOAD)};
      const hasBGM = payload.includes('BGM+');
      const hasDTM = payload.includes('DTM+137');
      console.log(JSON.stringify({
        valid: hasBGM && hasDTM,
        checks: {
          hasBGM,
          hasDTM
        }
      }));
    `,
    timeoutMs: 4000,
    metadata: { format: 'UTILMD', purpose: 'compliance' }
  });

  const jobId = validationJob.data.job.id;
  let job = await client.getToolJob(jobId);

  while (job.data.job.status === 'queued' || job.data.job.status === 'running') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    job = await client.getToolJob(jobId);
  }

  if (job.data.job.status !== 'succeeded') {
    throw new Error(`Validation failed: ${job.data.job.result?.error ?? job.data.job.status}`);
  }

  await client.createArtifact({
    sessionId: SESSION_ID,
    type: 'validation-report',
    name: 'UTILMD_validation.json',
    mimeType: 'application/json',
    encoding: 'utf8',
    content: job.data.job.result?.stdout ?? '{}',
    tags: ['utilmd', 'validation', 'audit']
  });

  console.log('Validation stored. Session:', SESSION_ID);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
