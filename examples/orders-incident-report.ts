#!/usr/bin/env ts-node
/*
 * Example: ORDERS Incident Replay
 * --------------------------------
 * Useful for Netzbetreiber service teams to reproduce incidents, extract key
 * identifiers, and create audit artifacts during Klärfallanalyse.
 */

import { WilliMakoClient } from '@stromhaltig/willi-mako-client';

const SESSION_ID = `orders-incident-${Date.now()}`;
const ORDERS_PAYLOAD = "UNH+1+ORDERS:D:96A:UN:EAN005'BGM+220+20240409-0001+9'...";

async function main(): Promise<void> {
  const client = new WilliMakoClient();

  await client.createArtifact({
    sessionId: SESSION_ID,
    type: 'incident-input',
    name: 'ORDERS_incident.edi',
    mimeType: 'text/plain',
    encoding: 'utf8',
    content: ORDERS_PAYLOAD,
    tags: ['orders', 'incident', 'klaerfallanalyse']
  });

  const job = await client.createNodeScriptJob({
    sessionId: SESSION_ID,
    source: `
      const payload = ${JSON.stringify(ORDERS_PAYLOAD)};
      const supplierMatch = payload.match(/\\+([0-9A-Z]{13})'/);
      const supplierId = supplierMatch ? supplierMatch[1] : null;
      console.log(JSON.stringify({ supplierId, incidentTs: new Date().toISOString() }));
    `,
    metadata: { format: 'ORDERS', purpose: 'incident-replay' }
  });

  const outcome = await waitForJob(client, job.data.job.id);

  await client.createArtifact({
    sessionId: SESSION_ID,
    type: 'incident-report',
    name: 'ORDERS_incident_report.json',
    mimeType: 'application/json',
    encoding: 'utf8',
    content: outcome.data.job.result?.stdout ?? '{}',
    tags: ['orders', 'incident', 'audit']
  });

  console.log('Incident report stored. Session:', SESSION_ID);
}

async function waitForJob(client: WilliMakoClient, jobId: string) {
  let job = await client.getToolJob(jobId);
  while (job.data.job.status === 'queued' || job.data.job.status === 'running') {
    await new Promise((resolve) => setTimeout(resolve, 750));
    job = await client.getToolJob(jobId);
  }
  if (job.data.job.status !== 'succeeded') {
    throw new Error(`Job failed: ${job.data.job.result?.error ?? job.data.job.status}`);
  }
  return job;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
