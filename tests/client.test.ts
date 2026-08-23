import { describe, expect, it } from 'vitest';
import {
  MemoryCookieStore,
  WilliMakoClient,
  WilliMakoError,
  type AvvOnboardingResponse,
  type AvvRecordResponse,
  type AuthMeResponse,
  type CoachMessageResponse,
  type CoachStartResponse,
  type CoachTurnResponse,
  type MandantMembersResponse,
  type MandantUsageResponse,
  type RequestLinkResponse,
  type SessionDetailResponse,
  type SessionListResponse,
  type TokenPeekResponse,
  type VerifyAuthResponse
} from '../src/index.js';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

interface RecordedRequest {
  url: string;
  init: RequestInit;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', ...(init.headers as Record<string, string> | undefined) },
    ...init
  });
}

function recordingFetch(response: Response) {
  const calls: RecordedRequest[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    calls.push({ url: String(input), init: init ?? {} });
    return response.clone();
  };
  return { fetch, calls };
}

describe('WilliMakoClient response types', () => {
  it('exposes concrete API response types for common Node.js calls', () => {
    type Client = WilliMakoClient;
    type Cases = [
      Expect<Equal<Awaited<ReturnType<Client['requestMagicLink']>>, RequestLinkResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['peekToken']>>, TokenPeekResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['verifyMagicLink']>>, VerifyAuthResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['currentUser']>>, AuthMeResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['listMandantMembers']>>, MandantMembersResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['getMandantUsage']>>, MandantUsageResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['getAvvRecord']>>, AvvRecordResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['getAvvOnboarding']>>, AvvOnboardingResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['startCoach']>>, CoachStartResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['sendCoachMessage']>>, CoachMessageResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['getCoachTurn']>>, CoachTurnResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['listSessions']>>, SessionListResponse>>,
      Expect<Equal<Awaited<ReturnType<Client['getSession']>>, SessionDetailResponse>>
    ];
    const _typed: Cases = [true, true, true, true, true, true, true, true, true, true, true, true, true];
    function assertNodeUsageTypes(
      started: Awaited<ReturnType<Client['startCoach']>>,
      messaged: Awaited<ReturnType<Client['sendCoachMessage']>>,
      turn: Awaited<ReturnType<Client['getCoachTurn']>>,
      sessions: Awaited<ReturnType<Client['listSessions']>>,
      detail: Awaited<ReturnType<Client['getSession']>>,
      verified: Awaited<ReturnType<Client['verifyMagicLink']>>
    ): void {
      const startSessionId: string = started.sessionId;
      const startTurnId: string = started.turnId;
      const messageTurnId: string = messaged.turnId;
      const turnStatus: string = turn.status;
      const sessionCount: number = sessions.sessions.length;
      const detailMessages: unknown[] | undefined = detail.messages;
      void [startSessionId, startTurnId, messageTurnId, turnStatus, sessionCount, detailMessages];
    }
    void assertNodeUsageTypes;
    expect(_typed).toHaveLength(13);
  });
});

describe('WilliMakoClient runtime behavior', () => {
  it('requests magic links with JSON content type against willi.cernion.de', async () => {
    const { fetch, calls } = recordingFetch(jsonResponse({ ok: true }));
    const client = new WilliMakoClient({ fetch });

    await client.requestMagicLink({ email: 'thorsten@example.test' });

    expect(calls[0].url).toBe('https://willi.cernion.de/api/auth/request-link');
    expect(calls[0].init.method).toBe('POST');
    expect(new Headers(calls[0].init.headers).get('content-type')).toBe('application/json');
    expect(calls[0].init.body).toBe(JSON.stringify({ email: 'thorsten@example.test' }));
  });

  it('captures wm_sid from verify responses and sends it on subsequent requests', async () => {
    const calls: RecordedRequest[] = [];
    const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(input), init: init ?? {} });
      if (calls.length === 1) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json', 'set-cookie': 'wm_sid=session-123; HttpOnly; SameSite=Strict' }
        });
      }
      return jsonResponse({ data: [] });
    };
    const cookieStore = new MemoryCookieStore();
    const client = new WilliMakoClient({ fetch, cookieStore });

    await client.verifyMagicLink({ token: 'token-from-mail' });
    await client.listSessions();

    expect(cookieStore.snapshot()).toEqual({ wm_sid: 'session-123' });
    expect(new Headers(calls[1].init.headers).get('cookie')).toBe('wm_sid=session-123');
  });

  it('does not attach or store session credentials for absolute cross-origin URLs', async () => {
    const calls: RecordedRequest[] = [];
    const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      calls.push({ url: String(input), init: init ?? {} });
      if (calls.length === 1) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json', 'set-cookie': 'wm_sid=session-123; HttpOnly; SameSite=Strict' }
        });
      }
      if (String(input).startsWith('https://evil.example')) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json', 'set-cookie': 'wm_sid=evil-session; HttpOnly' }
        });
      }
      return jsonResponse({ data: [] });
    };
    const cookieStore = new MemoryCookieStore();
    const client = new WilliMakoClient({ fetch, cookieStore, sessionId: 'saved-session-123' });

    await client.verifyMagicLink({ token: 'token-from-mail' });
    await client.get('https://evil.example/api/probe');
    await client.listSessions();

    const crossOriginHeaders = new Headers(calls[1].init.headers);
    expect(calls[1].url).toBe('https://evil.example/api/probe');
    expect(crossOriginHeaders.get('cookie')).toBeNull();
    expect(crossOriginHeaders.get('authorization')).toBeNull();
    expect(calls[1].init.credentials).toBe('omit');
    expect(cookieStore.snapshot()).toEqual({ wm_sid: 'session-123' });
    expect(new Headers(calls[2].init.headers).get('cookie')).toBe('wm_sid=session-123');
  });

  it('sends a saved session id as wm_sid cookie without overriding an explicit cookie', async () => {
    const { fetch, calls } = recordingFetch(jsonResponse({ data: [] }));
    const client = new WilliMakoClient({ fetch, sessionId: 'saved-session-123' });

    await client.listSessions();

    expect(new Headers(calls[0].init.headers).get('cookie')).toBe('wm_sid=saved-session-123');
    expect(new Headers(calls[0].init.headers).get('authorization')).toBeNull();

    const explicit = recordingFetch(jsonResponse({ data: [] }));
    const explicitClient = new WilliMakoClient({
      fetch: explicit.fetch,
      sessionId: 'saved-session-123',
      defaultHeaders: { cookie: 'wm_sid=explicit-session' }
    });

    await explicitClient.listSessions();

    expect(new Headers(explicit.calls[0].init.headers).get('cookie')).toBe('wm_sid=explicit-session');
  });

  it('maps sessions, coach, markdown and review endpoints from the current OpenAPI', async () => {
    const { fetch, calls } = recordingFetch(jsonResponse({ ok: true }));
    const client = new WilliMakoClient({ fetch, baseUrl: 'https://example.test/' });

    await client.startCoach({ text: 'GPKE' });
    await client.listMandantMembers();
    await client.getMandantUsage();
    await client.getAvvRecord();
    await client.getAvvOnboarding();
    await client.sendCoachMessage({ sessionId: 's1', text: 'Hallo' });
    await client.getCoachTurn('turn 1');
    await client.getSession('session/1');
    await client.closeSession('session/1');
    await client.setLiveCoaching('session/1', { enabled: true });
    await client.reviewSession({ sessionId: 'session/1' });

    expect(calls.map((call) => [call.init.method, call.url])).toEqual([
      ['POST', 'https://example.test/api/coach/start'],
      ['GET', 'https://example.test/api/mandant/members'],
      ['GET', 'https://example.test/api/mandant/usage'],
      ['GET', 'https://example.test/api/mandant/avv-record'],
      ['GET', 'https://example.test/api/onboarding/avv'],
      ['POST', 'https://example.test/api/coach/message'],
      ['GET', 'https://example.test/api/coach/turn/turn%201'],
      ['GET', 'https://example.test/api/sessions/session%2F1'],
      ['POST', 'https://example.test/api/sessions/session%2F1/close'],
      ['POST', 'https://example.test/api/sessions/session%2F1/live-coaching'],
      ['POST', 'https://example.test/api/review/session']
    ]);
  });

  it('returns markdown responses as text', async () => {
    const { fetch } = recordingFetch(new Response('# Karte', { headers: { 'content-type': 'text/markdown' } }));
    const client = new WilliMakoClient({ fetch });

    await expect(client.getSessionCardMarkdown('abc')).resolves.toBe('# Karte');
  });

  it('throws WilliMakoError with parsed JSON body on non-2xx responses', async () => {
    const { fetch } = recordingFetch(jsonResponse({ error: 'no session' }, { status: 404 }));
    const client = new WilliMakoClient({ fetch });

    await expect(client.currentUser()).rejects.toMatchObject({
      name: 'WilliMakoError',
      status: 404,
      body: { error: 'no session' }
    } satisfies Partial<WilliMakoError>);
  });
});
