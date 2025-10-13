import type { LoginResponse, SessionEnvelopeResponse } from './types.js';

export type SupportedShell = 'posix' | 'powershell' | 'cmd';

const QUOTE_REGEX = /"/g;

const SESSION_ENV_VAR = 'WILLI_MAKO_SESSION_ID';
const TOKEN_ENV_VAR = 'WILLI_MAKO_TOKEN';

/**
 * Applies side effects after a successful CLI login, such as updating the
 * process environment with the latest token. Returns true when the token was
 * written to the environment.
 */
export function applyLoginEnvironmentToken(response: LoginResponse): boolean {
  if (!response.success) {
    return false;
  }

  const token = response.data?.accessToken;

  if (!token) {
    return false;
  }

  process.env[TOKEN_ENV_VAR] = token;
  return true;
}

export function applySessionEnvironmentId(response: SessionEnvelopeResponse): boolean {
  if (!response.success) {
    return false;
  }

  const sessionId = response.data?.sessionId;

  if (!sessionId) {
    return false;
  }

  process.env[SESSION_ENV_VAR] = sessionId;
  return true;
}

export function clearSessionEnvironmentId(sessionId?: string): boolean {
  const current = process.env[SESSION_ENV_VAR];
  if (!current) {
    return false;
  }

  if (sessionId && current !== sessionId) {
    return false;
  }

  delete process.env[SESSION_ENV_VAR];
  return true;
}

export function formatEnvExport(
  variable: string,
  value: string,
  shell: SupportedShell = 'posix'
): string {
  if (shell === 'powershell') {
    return `$Env:${variable} = "${escapePowerShell(value)}"`;
  }

  if (shell === 'cmd') {
    return `set ${variable}=${escapeCmd(value)}`;
  }

  return `export ${variable}="${escapePosix(value)}"`;
}

function escapePosix(value: string): string {
  return value.replace(QUOTE_REGEX, '\\"');
}

function escapePowerShell(value: string): string {
  return value.replace(/`/g, '``').replace(QUOTE_REGEX, '`"');
}

function escapeCmd(value: string): string {
  return value.replace(/\^/g, '^^').replace(/%/g, '%%');
}
