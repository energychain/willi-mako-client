export const DEFAULT_BASE_URL = 'https://willi.cernion.de';

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface CookieStore {
  getCookieHeader(url: string): string | undefined;
  storeFromResponse(url: string, response: Response): void;
}

export interface WilliMakoClientOptions {
  baseUrl?: string;
  fetch?: FetchLike;
  cookieStore?: CookieStore;
  defaultHeaders?: HeadersInit;
  /**
   * Stored `wm_sid` session value for non-browser clients.
   * The client only attaches it to same-origin requests for the configured base URL.
   */
  readonly sessionId?: string;
}

export class MemoryCookieStore implements CookieStore {
  private readonly cookies = new Map<string, string>();

  getCookieHeader(): string | undefined {
    const pairs = Array.from(this.cookies.entries()).map(([name, value]) => `${name}=${value}`);
    return pairs.length > 0 ? pairs.join('; ') : undefined;
  }

  storeFromResponse(_url: string, response: Response): void {
    const setCookieHeaders = collectSetCookieHeaders(response.headers);
    for (const header of setCookieHeaders) {
      const [pair] = header.split(';', 1);
      const separator = pair.indexOf('=');
      if (separator > 0) {
        const name = pair.slice(0, separator).trim();
        const value = pair.slice(separator + 1).trim();
        if (value === '') {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, value);
        }
      }
    }
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.cookies.entries());
  }
}

function collectSetCookieHeaders(headers: Headers): string[] {
  const anyHeaders = headers as Headers & { getSetCookie?: () => string[]; raw?: () => Record<string, string[]> };
  if (typeof anyHeaders.getSetCookie === 'function') {
    return anyHeaders.getSetCookie();
  }
  if (typeof anyHeaders.raw === 'function') {
    return anyHeaders.raw()['set-cookie'] ?? [];
  }
  const single = headers.get('set-cookie');
  return single ? [single] : [];
}

export class WilliMakoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly response: Response,
    readonly body: unknown
  ) {
    super(message);
    this.name = 'WilliMakoError';
  }
}

export interface RequestLinkRequest { email: string; }
export interface VerifyRequest { token: string; }
export interface InviteRequest { email: string; role?: string; }
export interface SwitchMandantRequest { mandantId: string; }
export interface AcceptAvvRequest { accepted: boolean; name?: string; role?: string; }
export interface StartCoachRequest { text: string; caseId?: string; [key: string]: unknown; }
export interface CoachMessageRequest { sessionId: string; text: string; [key: string]: unknown; }
export interface ReviewSessionRequest { sessionId: string; feedback?: string; reviewer?: string; [key: string]: unknown; }
export interface LiveCoachingRequest { enabled?: boolean; requested?: boolean; }

export interface ApiEnvelope<T = unknown> {
  success?: boolean;
  data?: T;
  ok?: boolean;
  error?: string | null;
  [key: string]: unknown;
}

export interface ApiSuccessEnvelope<T = unknown> extends ApiEnvelope<T> {
  success: true;
}

export interface RequestLinkResponse extends ApiSuccessEnvelope {
  message?: string;
}

export interface TokenPeekResponse extends ApiEnvelope {
  valid: boolean;
  purpose?: string;
  emailMasked?: string;
}

export interface PendingMandantSwitch {
  mandantId?: string;
  mandantName?: string | null;
  [key: string]: unknown;
}

export interface VerifyAuthResponse extends ApiSuccessEnvelope {
  email?: string;
  emailMasked?: string;
  mandantId?: string;
  mandantName?: string | null;
  pendingMandantSwitch?: PendingMandantSwitch | null;
  /** Backwards-compatible session aliases observed by older API deployments. */
  sessionId?: string;
  sid?: string;
  token?: string;
}

export interface AuthMeResponse extends ApiSuccessEnvelope {
  email?: string;
  mandantId?: string;
  mandantName?: string | null;
  isStaff?: boolean;
  avvAccepted?: boolean;
}

export interface GenericSuccessResponse extends ApiSuccessEnvelope {}

export interface MandantInviteResponse extends ApiSuccessEnvelope {
  email?: string;
  role?: string;
}

export interface SwitchMandantResponse extends ApiSuccessEnvelope {
  mandantId: string;
  mandantName: string | null;
}

export interface MandantMember {
  email?: string;
  role?: string;
  isStaff?: boolean;
  createdAt?: string;
  [key: string]: unknown;
}

export interface MandantMembersResponse extends ApiSuccessEnvelope<MandantMember[]> {
  members?: MandantMember[];
}

export interface UsageDay {
  date?: string;
  turns?: number;
  [key: string]: unknown;
}

export interface MandantUsageResponse extends ApiSuccessEnvelope<UsageDay[]> {
  totalTurns: number;
  last30Days: UsageDay[];
}

export interface AvvSection {
  title?: string;
  body?: string;
  [key: string]: unknown;
}

export interface AvvRecordResponse extends ApiSuccessEnvelope<AvvSection[]> {
  avvVersion: string;
  acceptedAt: string;
  sections: AvvSection[];
}

export interface CompanyDetails {
  name?: string;
  address?: string;
  [key: string]: unknown;
}

export interface AvvOnboardingResponse extends ApiSuccessEnvelope<AvvSection[]> {
  avvVersion: string;
  sections: AvvSection[];
  company?: CompanyDetails | null;
  needsCompanyDetails: boolean;
  userName: string | null;
}

export interface AcceptAvvResponse extends ApiSuccessEnvelope {
  avvVersion?: string;
  acceptedAt?: string;
}

export interface CoachStartResponse extends ApiSuccessEnvelope {
  sessionId: string;
  turnId: string;
}

export interface CoachMessageResponse extends ApiSuccessEnvelope {
  sessionId: string;
  turnId: string;
}

export type CoachTurnKickoff = CoachStartResponse;

export interface CoachTurnResult {
  success?: boolean;
  sessionId?: string;
  assistant?: string;
  answer?: string;
  markdown?: string;
  card?: unknown;
  [key: string]: unknown;
}

export interface TurnProgressStep {
  stage?: string;
  message?: string;
  at?: string;
  [key: string]: unknown;
}

export interface CoachTurnResponse extends ApiSuccessEnvelope<CoachTurnResult | null> {
  status: 'running' | 'done' | 'error' | (string & {});
  progress: TurnProgressStep[];
  result: CoachTurnResult | null;
  error: string | null;
}

export interface LiveCoachingState {
  enabled?: boolean;
  requested?: boolean;
  [key: string]: unknown;
}

export interface CaseSessionSummary {
  sessionId: string;
  id?: string;
  title?: string;
  summary?: string;
  status?: string;
  domain?: string | null;
  updatedAt: string;
  createdAt: string;
  turns?: number;
  openQuestions?: number;
  sources?: number;
  reviews?: number;
  liveCoaching?: LiveCoachingState;
  [key: string]: unknown;
}

export interface SessionListResponse extends ApiSuccessEnvelope<CaseSessionSummary[]> {
  sessions: CaseSessionSummary[];
}

export interface ChatTurn {
  role?: string;
  content?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface SessionVersionSummary {
  versionId?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface SessionDetailResponse extends ApiSuccessEnvelope {
  sessionId: string;
  title?: string;
  summary?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  card?: unknown;
  chat?: ChatTurn[];
  calls?: unknown[];
  versions?: SessionVersionSummary[];
  reviewCount?: number;
  liveCoaching?: LiveCoachingState;
  messages?: unknown[];
  [key: string]: unknown;
}

export interface LiveCoachingResponse extends ApiSuccessEnvelope {
  sessionId: string;
  liveCoaching: LiveCoachingState;
}

export interface ReviewResponse extends ApiSuccessEnvelope<string[]> {
  sessionId: string;
  reviewMarkdown: string;
  proposals: string[];
  persisted: true;
}

export class WilliMakoClient {
  readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly cookieStore?: CookieStore;
  private readonly defaultHeaders?: HeadersInit;
  private readonly sessionId?: string;

  constructor(options: WilliMakoClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.cookieStore = options.cookieStore;
    this.defaultHeaders = options.defaultHeaders;
    this.sessionId = options.sessionId;
  }

  requestMagicLink(body: RequestLinkRequest): Promise<RequestLinkResponse> {
    return this.post('/api/auth/request-link', body);
  }

  peekToken(token: string): Promise<TokenPeekResponse> {
    return this.get(`/api/auth/token-peek?token=${encodeURIComponent(token)}`);
  }

  verifyMagicLink(body: VerifyRequest): Promise<VerifyAuthResponse> {
    return this.post('/api/auth/verify', body);
  }

  currentUser(): Promise<AuthMeResponse> {
    return this.get('/api/auth/me');
  }

  logout(): Promise<GenericSuccessResponse> {
    return this.post('/api/auth/logout', {});
  }

  inviteMandantMember(body: InviteRequest): Promise<MandantInviteResponse> {
    return this.post('/api/mandant/invite', body);
  }

  switchMandant(body: SwitchMandantRequest): Promise<SwitchMandantResponse> {
    return this.post('/api/mandant/switch', body);
  }

  listMandantMembers(): Promise<MandantMembersResponse> {
    return this.get('/api/mandant/members');
  }

  getMandantUsage(): Promise<MandantUsageResponse> {
    return this.get('/api/mandant/usage');
  }

  getAvvRecord(): Promise<AvvRecordResponse> {
    return this.get('/api/mandant/avv-record');
  }

  getAvvOnboarding(): Promise<AvvOnboardingResponse> {
    return this.get('/api/onboarding/avv');
  }

  acceptAvv(body: AcceptAvvRequest): Promise<AcceptAvvResponse> {
    return this.post('/api/onboarding/avv/accept', body);
  }

  startCoach(body: StartCoachRequest): Promise<CoachStartResponse> {
    return this.post('/api/coach/start', body);
  }

  sendCoachMessage(body: CoachMessageRequest): Promise<CoachMessageResponse> {
    return this.post('/api/coach/message', body);
  }

  getCoachTurn(turnId: string): Promise<CoachTurnResponse> {
    return this.get(`/api/coach/turn/${encodeURIComponent(turnId)}`);
  }

  listSessions(): Promise<SessionListResponse> {
    return this.get('/api/sessions');
  }

  getSession(sessionId: string): Promise<SessionDetailResponse> {
    return this.get(`/api/sessions/${encodeURIComponent(sessionId)}`);
  }

  getSessionCardMarkdown(sessionId: string): Promise<string> {
    return this.getText(`/api/sessions/${encodeURIComponent(sessionId)}/card.md`);
  }

  getSessionReviewMarkdown(sessionId: string): Promise<string> {
    return this.getText(`/api/sessions/${encodeURIComponent(sessionId)}/review.md`);
  }

  closeSession(sessionId: string): Promise<GenericSuccessResponse> {
    return this.post(`/api/sessions/${encodeURIComponent(sessionId)}/close`, {});
  }

  setLiveCoaching(sessionId: string, body: LiveCoachingRequest): Promise<LiveCoachingResponse> {
    return this.post(`/api/sessions/${encodeURIComponent(sessionId)}/live-coaching`, body);
  }

  reviewSession(body: ReviewSessionRequest): Promise<ReviewResponse> {
    return this.post('/api/review/session', body);
  }

  rawOpenApi(): Promise<Record<string, unknown>> {
    return this.get('/api/openapi.json');
  }

  get<T = unknown>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T = unknown>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async getText(path: string): Promise<string> {
    const requestUrl = this.url(path);
    const response = await this.perform('GET', path);
    if (!response.ok) {
      throw await this.toError(response);
    }
    if (this.isSameOrigin(requestUrl)) {
      this.cookieStore?.storeFromResponse(requestUrl, response);
    }
    return response.text();
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const requestUrl = this.url(path);
    const response = await this.perform(method, path, body);
    if (this.isSameOrigin(requestUrl)) {
      this.cookieStore?.storeFromResponse(requestUrl, response);
    }
    if (!response.ok) {
      throw await this.toError(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      return (await response.json()) as T;
    }
    return (await response.text()) as T;
  }

  private async perform(method: string, path: string, body?: unknown): Promise<Response> {
    const url = this.url(path);
    const sameOrigin = this.isSameOrigin(url);
    const headers = new Headers(this.defaultHeaders);
    headers.set('accept', 'application/json');
    if (!sameOrigin) {
      headers.delete('cookie');
      headers.delete('authorization');
    }
    if (body !== undefined) {
      headers.set('content-type', 'application/json');
    }
    if (sameOrigin) {
      const cookie = this.cookieStore?.getCookieHeader(url);
      if (cookie) {
        headers.set('cookie', cookie);
      } else if (this.sessionId && !headers.has('cookie')) {
        headers.set('cookie', `wm_sid=${this.sessionId}`);
      }
    }
    return this.fetchImpl(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: sameOrigin ? 'include' : 'omit'
    });
  }

  private url(path: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private isSameOrigin(url: string): boolean {
    return new URL(url).origin === new URL(this.baseUrl).origin;
  }

  private async toError(response: Response): Promise<WilliMakoError> {
    let parsed: unknown;
    try {
      const contentType = response.headers.get('content-type') ?? '';
      parsed = contentType.includes('application/json') ? await response.json() : await response.text();
    } catch {
      parsed = undefined;
    }
    const detail = typeof parsed === 'object' && parsed && 'error' in parsed
      ? String((parsed as { error?: unknown }).error)
      : response.statusText || `HTTP ${response.status}`;
    return new WilliMakoError(`Willi Mako API request failed (${response.status}): ${detail}`, response.status, response, parsed);
  }
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export default WilliMakoClient;
