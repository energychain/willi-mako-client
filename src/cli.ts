#!/usr/bin/env node

import { Command } from 'commander';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { inspect } from 'node:util';
import {
  DEFAULT_BASE_URL,
  WilliMakoClient,
  bundledOpenApiDocument,
  WilliMakoError,
  type WilliMakoClientOptions,
  type RunNodeScriptJobRequest
} from './index.js';

const program = new Command();

program
  .name('willi-mako')
  .description('CLI tooling for the Willi-Mako API v2')
  .option('-b, --base-url <url>', 'Override the API base URL', DEFAULT_BASE_URL)
  .option('-t, --token <token>', 'Bearer token (falls back to $WILLI_MAKO_TOKEN)');

program
  .command('openapi')
  .description('Print the OpenAPI document (remote by default)')
  .option('--local', 'Use the bundled schema instead of fetching the remote document', false)
  .action(async (options) => {
    const client = createClient();

    if (options.local) {
      outputJson(bundledOpenApiDocument);
      return;
    }

    const document = await client.getRemoteOpenApiDocument();
    outputJson(document);
  });

const tools = program.command('tools').description('Tooling sandbox helpers');

tools
  .command('run-node-script')
  .description('Create a sandbox job for evaluating Node.js source code')
  .requiredOption('-s, --session <sessionId>', 'Session ID that owns the job')
  .requiredOption('--source <code>', 'Node.js source code to execute')
  .option('-t, --timeout <ms>', 'Timeout in milliseconds (500-60000)', parseIntBase10)
  .option('-m, --metadata <json>', 'Optional JSON metadata payload', parseJsonOptional)
  .action(async (options) => {
    const client = createClient({ requireToken: true });

    const payload: RunNodeScriptJobRequest = {
      sessionId: options.session,
      source: options.source,
      timeoutMs: options.timeout,
      metadata: options.metadata ?? undefined
    };

    const response = await client.createNodeScriptJob(payload);
    outputJson(response);
  });

tools
  .command('job <jobId>')
  .description('Retrieve the status of a tooling job')
  .action(async (jobId: string) => {
    const client = createClient({ requireToken: true });
    const response = await client.getToolJob(jobId);
    outputJson(response);
  });

const artifacts = program.command('artifacts').description('Artifact service helpers');

artifacts
  .command('create')
  .description('Create an inline artifact from stdin or a string literal')
  .requiredOption('-s, --session <sessionId>', 'Session ID that owns the artifact')
  .requiredOption('-n, --name <name>', 'Human-readable artifact name')
  .requiredOption('-t, --type <type>', 'Domain-specific type (e.g. etl-output)')
  .requiredOption('--mime <mimeType>', 'Mime type, e.g. application/json')
  .option('-e, --encoding <encoding>', 'Encoding (utf8|base64)', 'utf8')
  .option('-c, --content <encoded>', 'Provide content as a literal string (omit to read stdin)')
  .option('--description <text>', 'Optional description')
  .option('--version <version>', 'Optional version tag')
  .option('--tags <list>', 'Comma separated tags', parseCommaList)
  .option('-m, --metadata <json>', 'Optional JSON metadata payload', parseJsonOptional)
  .action(async (options) => {
    const client = createClient({ requireToken: true });
    const content = options.content ?? (await readStdin());

    const response = await client.createArtifact({
      sessionId: options.session,
      name: options.name,
      type: options.type,
      mimeType: options.mime,
      encoding: options.encoding,
      content,
      description: options.description ?? undefined,
      version: options.version ?? undefined,
      tags: options.tags ?? undefined,
      metadata: options.metadata ?? undefined
    });

    outputJson(response);
  });

program
  .command('whoami')
  .description('Display the current configuration (safe to share)')
  .action(() => {
    const opts = program.opts();
    const token = opts.token ?? process.env.WILLI_MAKO_TOKEN;
    outputJson({
      baseUrl: opts.baseUrl,
      hasToken: Boolean(token)
    });
  });

program.hook('postAction', () => {
  // Ensure the process exits after async handlers finish
  setImmediate(() => process.exit(0));
});

program.parseAsync(process.argv).catch((error) => {
  if (error instanceof WilliMakoError) {
    console.error(`Request failed (${error.status})`);
    console.error(inspect(error.body, false, 4, true));
    process.exit(1);
  }

  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

function parseIntBase10(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer: ${value}`);
  }

  return parsed;
}

function parseJsonOptional(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON: ${(error as Error).message}`);
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function parseCommaList(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function outputJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

interface ClientFactoryOptions {
  requireToken?: boolean;
}

function createClient(options: ClientFactoryOptions = {}): WilliMakoClient {
  const opts = program.opts();
  const token = opts.token ?? process.env.WILLI_MAKO_TOKEN ?? null;

  if (options.requireToken && !token) {
    throw new Error('A bearer token is required. Set --token or WILLI_MAKO_TOKEN.');
  }

  const clientOptions: WilliMakoClientOptions = {
    baseUrl: opts.baseUrl,
    token
  };

  return new WilliMakoClient(clientOptions);
}
