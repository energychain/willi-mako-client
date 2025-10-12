#!/usr/bin/env ts-node
/*
 * Example: MSCONS Meter Reading Clearing
 * --------------------------------------
 * Demonstrates how Messstellenbetreiber can analyse meter readings, detect
 * anomalies, and persist clearing results with metadata.
 */

import { WilliMakoClient } from '@stromdao/willi-mako-client';

const SESSION_ID = `mscons-clearing-${new Date().toISOString()}`;

const meterReadings = [
  { marktlokation: 'DE000123456789012345', value: 2312.44, timestamp: '2024-03-31T22:00:00Z' },
  { marktlokation: 'DE000123456789012346', value: 0, timestamp: '2024-03-31T22:00:00Z' },
  { marktlokation: 'DE000123456789012347', value: -12, timestamp: '2024-03-31T22:00:00Z' }
];

async function main(): Promise<void> {
  const client = new WilliMakoClient();

  await client.createArtifact({
    sessionId: SESSION_ID,
    type: 'etl-input',
    name: 'MSCONS_readings.json',
    mimeType: 'application/json',
    encoding: 'utf8',
    content: JSON.stringify(meterReadings, null, 2),
    tags: ['mscons', 'clearing', 'input']
  });

  const job = await client.createNodeScriptJob({
    sessionId: SESSION_ID,
    source: `
      const readings = ${JSON.stringify(meterReadings)};
      const threshold = 0;
      const anomalies = readings.filter((entry) => entry.value <= threshold);
      console.log(JSON.stringify({
        total: readings.length,
        anomalies,
        status: anomalies.length === 0 ? 'ok' : 'review'
      }));
    `,
    metadata: {
      format: 'MSCONS',
      purpose: 'clearing',
      owner: 'messstellenbetreiber'
    },
    timeoutMs: 5000
  });

  const result = await waitForJob(client, job.data.job.id);

  await client.createArtifact({
    sessionId: SESSION_ID,
    type: 'clearing-report',
    name: 'MSCONS_clearing_result.json',
    mimeType: 'application/json',
    encoding: 'utf8',
    content: result.data.job.result?.stdout ?? '{}',
    tags: ['mscons', 'clearing', 'report']
  });

  console.log('Clearing complete. Review anomalies if present.');
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
