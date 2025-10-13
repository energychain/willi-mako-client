import { afterEach, describe, expect, it } from 'vitest';
import {
  applyLoginEnvironmentToken,
  applySessionEnvironmentId,
  clearSessionEnvironmentId,
  formatEnvExport
} from '../src/cli-utils.js';
import type { LoginResponse, SessionEnvelopeResponse } from '../src/types.js';

const ORIGINAL_TOKEN = process.env.WILLI_MAKO_TOKEN;
const ORIGINAL_SESSION = process.env.WILLI_MAKO_SESSION_ID;

afterEach(() => {
  if (ORIGINAL_TOKEN) {
    process.env.WILLI_MAKO_TOKEN = ORIGINAL_TOKEN;
  } else {
    delete process.env.WILLI_MAKO_TOKEN;
  }

  if (ORIGINAL_SESSION) {
    process.env.WILLI_MAKO_SESSION_ID = ORIGINAL_SESSION;
  } else {
    delete process.env.WILLI_MAKO_SESSION_ID;
  }
});

describe('applyLoginEnvironmentToken', () => {
  it('stores the access token in the environment when login succeeds', () => {
    delete process.env.WILLI_MAKO_TOKEN;

    const response: LoginResponse = {
      success: true,
      data: {
        accessToken: 'cli-env-token',
        expiresAt: '2099-01-01T00:00:00Z'
      }
    };

    const result = applyLoginEnvironmentToken(response);

    expect(result).toBe(true);
    expect(process.env.WILLI_MAKO_TOKEN).toBe('cli-env-token');
  });

  it('does not modify the environment when login fails', () => {
    process.env.WILLI_MAKO_TOKEN = 'previous-token';

    const response: LoginResponse = {
      success: false,
      data: {
        accessToken: 'new-token',
        expiresAt: '2099-01-01T00:00:00Z'
      }
    };

    const result = applyLoginEnvironmentToken(response);

    expect(result).toBe(false);
    expect(process.env.WILLI_MAKO_TOKEN).toBe('previous-token');
  });
});

describe('applySessionEnvironmentId', () => {
  const successfulResponse: SessionEnvelopeResponse = {
    success: true,
    data: {
      sessionId: 'session-123',
      userId: 'user-1',
      workspaceContext: {},
      policyFlags: {},
      preferences: {},
      contextSettings: {},
      expiresAt: '2099-01-01T00:00:00Z'
    }
  };

  it('stores the session identifier in the environment when successful', () => {
    delete process.env.WILLI_MAKO_SESSION_ID;

    const result = applySessionEnvironmentId(successfulResponse);

    expect(result).toBe(true);
    expect(process.env.WILLI_MAKO_SESSION_ID).toBe('session-123');
  });

  it('ignores unsuccessful responses', () => {
    process.env.WILLI_MAKO_SESSION_ID = 'existing';

    const result = applySessionEnvironmentId({ ...successfulResponse, success: false });

    expect(result).toBe(false);
    expect(process.env.WILLI_MAKO_SESSION_ID).toBe('existing');
  });
});

describe('clearSessionEnvironmentId', () => {
  it('removes the environment variable when it matches the provided session', () => {
    process.env.WILLI_MAKO_SESSION_ID = 'session-123';

    const result = clearSessionEnvironmentId('session-123');

    expect(result).toBe(true);
    expect(process.env.WILLI_MAKO_SESSION_ID).toBeUndefined();
  });

  it('keeps the environment variable when provided id differs', () => {
    process.env.WILLI_MAKO_SESSION_ID = 'session-123';

    const result = clearSessionEnvironmentId('other-session');

    expect(result).toBe(false);
    expect(process.env.WILLI_MAKO_SESSION_ID).toBe('session-123');
  });
});

describe('formatEnvExport', () => {
  it('formats POSIX export statements', () => {
    expect(formatEnvExport('FOO', 'bar"baz', 'posix')).toBe('export FOO="bar\\"baz"');
  });

  it('formats PowerShell export statements', () => {
    expect(formatEnvExport('FOO', 'bar"baz', 'powershell')).toBe('$Env:FOO = "bar`"baz"');
  });

  it('formats CMD export statements', () => {
    expect(formatEnvExport('FOO', '100% ready', 'cmd')).toBe('set FOO=100%% ready');
  });
});
