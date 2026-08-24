export const PACKAGE_VERSION = "0.2.0";

export type IntegrationMode = "LIVE" | "SYNTHETIC";
export type IntegrationProvider = "GMAIL" | "GOOGLE_CALENDAR" | "SYNTHETIC_ATS";

export interface HttpResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type HttpFetcher = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<HttpResponse>;

export interface IntegrationRequest {
  mode: IntegrationMode;
  accessToken?: string;
  fetcher?: HttpFetcher;
}

export interface IntegrationHealth {
  provider: IntegrationProvider;
  mode: IntegrationMode;
  status: "READY" | "BLOCKED";
  detail: string;
}

export interface IntegrationWriteResult {
  provider: IntegrationProvider;
  mode: IntegrationMode;
  delivered: boolean;
  synthetic: boolean;
  externalId: string | null;
  idempotencyKey: string;
  detail: string;
}

export interface NormalizedMessage {
  provider: "GMAIL";
  externalMessageId: string;
  externalThreadId: string;
  direction: "INBOUND" | "OUTBOUND";
  fromParty: "CANDIDATE" | "RECRUITER" | "SYSTEM" | "INTERVIEWER";
  subject: string | null;
  body: string;
  sentAt: Date;
}

export interface NormalizedCalendarEvent {
  provider: "GOOGLE_CALENDAR";
  externalEventId: string;
  startUtc: Date;
  endUtc: Date;
  status: "BOOKED" | "CANCELLED" | "TENTATIVE";
  attendeeEmails: string[];
}

function liveAccess(
  request: IntegrationRequest,
  provider: IntegrationProvider,
): { fetcher: HttpFetcher; token: string } {
  if (request.mode !== "LIVE" || !request.accessToken)
    throw new Error(`${provider}_LIVE_CREDENTIAL_REQUIRED`);
  const fetcher = request.fetcher ?? (globalThis as unknown as { fetch?: HttpFetcher }).fetch;
  if (!fetcher) throw new Error(`${provider}_FETCH_UNAVAILABLE`);
  return { fetcher, token: request.accessToken };
}

function assertApprovedWrite(approvedActionKey: string | undefined, idempotencyKey: string) {
  if (!approvedActionKey) throw new Error("APPROVAL_REQUIRED");
  if (!idempotencyKey.trim()) throw new Error("IDEMPOTENCY_KEY_REQUIRED");
}

function syntheticId(provider: string, idempotencyKey: string) {
  // ponytail: stable non-secret fixture id; provider IDs are not security tokens.
  let hash = 2_166_136_261;
  for (const character of `${provider}:${idempotencyKey}`)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  return `synthetic:${provider.toLowerCase()}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function base64Url(value: string) {
  const binary = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_match, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  const btoa = (globalThis as unknown as { btoa?: (input: string) => string }).btoa;
  if (!btoa) throw new Error("GMAIL_BASE64_UNAVAILABLE");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export class GmailAdapter {
  readonly health: IntegrationHealth;
  private readonly request: IntegrationRequest;

  constructor(request: IntegrationRequest) {
    this.request = request;
    this.health =
      request.mode === "LIVE"
        ? {
            provider: "GMAIL",
            mode: "LIVE",
            status: request.accessToken ? "READY" : "BLOCKED",
            detail: request.accessToken
              ? "Gmail API reads and approved sends are enabled."
              : "OAuth access token is required for live Gmail access.",
          }
        : {
            provider: "GMAIL",
            mode: "SYNTHETIC",
            status: "READY",
            detail: "Synthetic mailbox fixtures are explicit and never claim delivery.",
          };
  }

  async listThreads(
    query = "",
    pageToken?: string,
  ): Promise<{ threads: Array<{ id: string; snippet: string }>; nextPageToken?: string }> {
    if (this.request.mode === "SYNTHETIC")
      return {
        threads: [
          {
            id: "synthetic-thread-northstar",
            snippet: "Synthetic candidate reply; live delivery is disabled.",
          },
        ],
      };
    const { fetcher, token } = liveAccess(this.request, "GMAIL");
    const params = [
      query ? `q=${encodeURIComponent(query)}` : "",
      pageToken ? `pageToken=${encodeURIComponent(pageToken)}` : "",
    ]
      .filter(Boolean)
      .join("&");
    const response = await fetcher(
      `https://gmail.googleapis.com/gmail/v1/users/me/threads${params ? `?${params}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error(`GMAIL_LIST_FAILED:${response.status}`);
    return response.json() as Promise<{
      threads: Array<{ id: string; snippet: string }>;
      nextPageToken?: string;
    }>;
  }

  async sendApprovedMessage(input: {
    to: string;
    subject: string;
    body: string;
    idempotencyKey: string;
    approvedActionKey?: string;
    threadId?: string;
  }): Promise<IntegrationWriteResult> {
    assertApprovedWrite(input.approvedActionKey, input.idempotencyKey);
    if (this.request.mode === "SYNTHETIC")
      return {
        provider: "GMAIL",
        mode: "SYNTHETIC",
        delivered: false,
        synthetic: true,
        externalId: syntheticId("gmail-message", input.idempotencyKey),
        idempotencyKey: input.idempotencyKey,
        detail: "Synthetic send intent recorded; no message was delivered.",
      };
    const { fetcher, token } = liveAccess(this.request, "GMAIL");
    const raw = [
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      input.body,
    ].join("\r\n");
    const response = await fetcher("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-RecruiterPal-Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        raw: base64Url(raw),
        ...(input.threadId ? { threadId: input.threadId } : {}),
      }),
    });
    if (!response.ok) throw new Error(`GMAIL_SEND_FAILED:${response.status}`);
    const payload = (await response.json()) as { id?: string };
    return {
      provider: "GMAIL",
      mode: "LIVE",
      delivered: true,
      synthetic: false,
      externalId: payload.id ?? null,
      idempotencyKey: input.idempotencyKey,
      detail: "Gmail accepted the approved message.",
    };
  }
}

export class GoogleCalendarAdapter {
  readonly health: IntegrationHealth;
  private readonly request: IntegrationRequest;

  constructor(request: IntegrationRequest) {
    this.request = request;
    this.health =
      request.mode === "LIVE"
        ? {
            provider: "GOOGLE_CALENDAR",
            mode: "LIVE",
            status: request.accessToken ? "READY" : "BLOCKED",
            detail: request.accessToken
              ? "Calendar free/busy and approved event writes are enabled."
              : "OAuth access token is required for live Calendar access.",
          }
        : {
            provider: "GOOGLE_CALENDAR",
            mode: "SYNTHETIC",
            status: "READY",
            detail: "Synthetic availability is explicit and no calendar event is created.",
          };
  }

  async freeBusy(input: {
    timeMin: Date;
    timeMax: Date;
    calendarIds: string[];
  }): Promise<Record<string, Array<{ startUtc: Date; endUtc: Date }>>> {
    if (this.request.mode === "SYNTHETIC")
      return Object.fromEntries(input.calendarIds.map((calendarId) => [calendarId, []]));
    const { fetcher, token } = liveAccess(this.request, "GOOGLE_CALENDAR");
    const response = await fetcher("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        timeMin: input.timeMin.toISOString(),
        timeMax: input.timeMax.toISOString(),
        items: input.calendarIds.map((id) => ({ id })),
      }),
    });
    if (!response.ok) throw new Error(`CALENDAR_FREE_BUSY_FAILED:${response.status}`);
    const payload = (await response.json()) as {
      calendars?: Record<string, { busy?: Array<{ start: string; end: string }> }>;
    };
    return Object.fromEntries(
      Object.entries(payload.calendars ?? {}).map(([calendarId, calendar]) => [
        calendarId,
        (calendar.busy ?? []).map((slot) => ({
          startUtc: new Date(slot.start),
          endUtc: new Date(slot.end),
        })),
      ]),
    );
  }

  async createApprovedEvent(input: {
    summary: string;
    startUtc: Date;
    endUtc: Date;
    attendeeEmails: string[];
    idempotencyKey: string;
    approvedActionKey?: string;
  }): Promise<IntegrationWriteResult> {
    assertApprovedWrite(input.approvedActionKey, input.idempotencyKey);
    if (this.request.mode === "SYNTHETIC")
      return {
        provider: "GOOGLE_CALENDAR",
        mode: "SYNTHETIC",
        delivered: false,
        synthetic: true,
        externalId: syntheticId("calendar-event", input.idempotencyKey),
        idempotencyKey: input.idempotencyKey,
        detail: "Synthetic booking intent recorded; no calendar event was created.",
      };
    const { fetcher, token } = liveAccess(this.request, "GOOGLE_CALENDAR");
    const response = await fetcher(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-RecruiterPal-Idempotency-Key": input.idempotencyKey,
        },
        body: JSON.stringify({
          summary: input.summary,
          start: { dateTime: input.startUtc.toISOString() },
          end: { dateTime: input.endUtc.toISOString() },
          attendees: input.attendeeEmails.map((email) => ({ email })),
        }),
      },
    );
    if (!response.ok) throw new Error(`CALENDAR_CREATE_FAILED:${response.status}`);
    const payload = (await response.json()) as { id?: string };
    return {
      provider: "GOOGLE_CALENDAR",
      mode: "LIVE",
      delivered: true,
      synthetic: false,
      externalId: payload.id ?? null,
      idempotencyKey: input.idempotencyKey,
      detail: "Google Calendar accepted the approved event.",
    };
  }
}

export function normalizeGmailMessage(input: {
  id: string;
  threadId: string;
  subject?: string;
  body: string;
  direction?: "INBOUND" | "OUTBOUND";
  sentAt: string;
}): NormalizedMessage {
  return {
    provider: "GMAIL",
    externalMessageId: input.id,
    externalThreadId: input.threadId,
    direction: input.direction ?? "INBOUND",
    fromParty: input.direction === "OUTBOUND" ? "RECRUITER" : "CANDIDATE",
    subject: input.subject ?? null,
    body: input.body,
    sentAt: new Date(input.sentAt),
  };
}

export function normalizeCalendarEvent(input: {
  id: string;
  start: string;
  end: string;
  status?: "BOOKED" | "CANCELLED" | "TENTATIVE";
  attendees?: string[];
}): NormalizedCalendarEvent {
  return {
    provider: "GOOGLE_CALENDAR",
    externalEventId: input.id,
    startUtc: new Date(input.start),
    endUtc: new Date(input.end),
    status: input.status ?? "BOOKED",
    attendeeEmails: [...(input.attendees ?? [])].sort(),
  };
}

export interface StageDurationInput {
  applicationId: string;
  stage: string;
  enteredAt: Date;
  exitedAt?: Date | null;
}
export function timeInStage(rows: readonly StageDurationInput[], now = new Date()) {
  return rows.map((row) => ({
    ...row,
    durationHours:
      Math.max(0, (row.exitedAt ?? now).getTime() - row.enteredAt.getTime()) / 3_600_000,
  }));
}
export function countSlaBreaches(
  rows: readonly { dueAt: Date; satisfiedAt?: Date | null }[],
  now = new Date(),
) {
  return rows.filter((row) => (row.satisfiedAt ?? now).getTime() > row.dueAt.getTime()).length;
}
export function stageConversion(rows: readonly { fromStage: string | null; toStage: string }[]) {
  const entered = new Map<string, number>();
  for (const row of rows) entered.set(row.toStage, (entered.get(row.toStage) ?? 0) + 1);
  return Object.fromEntries(
    [...entered.entries()].map(([stage, count]) => [
      stage,
      {
        entered: count,
        fromPriorStage: rows.filter((row) => row.toStage === stage && row.fromStage !== null)
          .length,
      },
    ]),
  );
}
export function evidenceCompleteness(
  requiredCompetencyIds: readonly string[],
  observedCompetencyIds: readonly string[],
) {
  const observed = new Set(observedCompetencyIds);
  const missing = requiredCompetencyIds.filter((id) => !observed.has(id));
  return {
    required: requiredCompetencyIds.length,
    complete: requiredCompetencyIds.length - missing.length,
    missing,
    ratio:
      requiredCompetencyIds.length === 0
        ? 1
        : (requiredCompetencyIds.length - missing.length) / requiredCompetencyIds.length,
  };
}
export function materialRatingDisagreements(
  rows: readonly { applicationId: string; competencyId: string; rating: number }[],
  threshold = 2,
) {
  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    const key = `${row.applicationId}:${row.competencyId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row.rating]);
  }
  return [...grouped.entries()].flatMap(([key, ratings]) => {
    const spread = Math.max(...ratings) - Math.min(...ratings);
    return spread >= threshold ? [{ key, ratings, spread }] : [];
  });
}
export function pipelineRisk(input: {
  criticalExceptions: number;
  overdueObligations: number;
  incompleteReadiness: number;
  unverifiedDeadlines: number;
}) {
  const signals: string[] = [];
  if (input.criticalExceptions > 0) signals.push("critical exception");
  if (input.overdueObligations > 0) signals.push("overdue obligation");
  if (input.incompleteReadiness > 0) signals.push("incomplete readiness");
  if (input.unverifiedDeadlines > 0) signals.push("unverified candidate deadline");
  return {
    level: signals.length === 0 ? "CLEAR" : signals.length >= 2 ? "ELEVATED" : "WATCH",
    signals,
  };
}
export function interviewCapacity(input: {
  availabilityWindows: readonly { startUtc: Date; endUtc: Date }[];
  interviewDurationMinutes: number;
  minimumLeadTimeMinutes: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const minimumStart = new Date(now.getTime() + input.minimumLeadTimeMinutes * 60_000);
  const feasible = input.availabilityWindows.filter(
    (window) =>
      window.startUtc >= minimumStart &&
      window.endUtc.getTime() - window.startUtc.getTime() >=
        input.interviewDurationMinutes * 60_000,
  );
  return {
    availableWindows: input.availabilityWindows.length,
    feasibleWindows: feasible.length,
    nextFeasibleStart: feasible[0]?.startUtc ?? null,
  };
}
