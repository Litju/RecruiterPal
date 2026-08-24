import { describe, expect, it } from "vitest";
import {
  GmailAdapter,
  GoogleCalendarAdapter,
  countSlaBreaches,
  evidenceCompleteness,
  interviewCapacity,
  materialRatingDisagreements,
  normalizeCalendarEvent,
  normalizeGmailMessage,
  pipelineRisk,
  stageConversion,
  timeInStage,
} from "./index";

describe("integration boundaries", () => {
  it("keeps synthetic Gmail sends explicit and approval-gated", async () => {
    const adapter = new GmailAdapter({ mode: "SYNTHETIC" });
    await expect(
      adapter.sendApprovedMessage({
        to: "candidate@example.com",
        subject: "Next step",
        body: "Hello",
        idempotencyKey: "message-1",
      }),
    ).rejects.toThrow("APPROVAL_REQUIRED");
    const result = await adapter.sendApprovedMessage({
      to: "candidate@example.com",
      subject: "Next step",
      body: "Hello",
      idempotencyKey: "message-1",
      approvedActionKey: "approval-1",
    });
    expect(result).toMatchObject({ mode: "SYNTHETIC", delivered: false, synthetic: true });
  });

  it("rejects blank idempotency keys even when the write is approved", async () => {
    const gmail = new GmailAdapter({ mode: "SYNTHETIC" });
    await expect(
      gmail.sendApprovedMessage({
        to: "candidate@example.com",
        subject: "Next step",
        body: "Hello",
        idempotencyKey: "   ",
        approvedActionKey: "approval-blank-key",
      }),
    ).rejects.toThrow("IDEMPOTENCY_KEY_REQUIRED");

    const calendar = new GoogleCalendarAdapter({ mode: "SYNTHETIC" });
    await expect(
      calendar.createApprovedEvent({
        summary: "Interview",
        startUtc: new Date("2026-09-01T10:00:00Z"),
        endUtc: new Date("2026-09-01T11:00:00Z"),
        attendeeEmails: [],
        idempotencyKey: "",
        approvedActionKey: "approval-blank-key",
      }),
    ).rejects.toThrow("IDEMPOTENCY_KEY_REQUIRED");
  });

  it("never presents synthetic Calendar booking as an external write", async () => {
    const adapter = new GoogleCalendarAdapter({ mode: "SYNTHETIC" });
    const result = await adapter.createApprovedEvent({
      summary: "Interview",
      startUtc: new Date("2026-09-01T10:00:00Z"),
      endUtc: new Date("2026-09-01T11:00:00Z"),
      attendeeEmails: [],
      idempotencyKey: "event-1",
      approvedActionKey: "approval-2",
    });
    expect(result).toMatchObject({ mode: "SYNTHETIC", delivered: false, synthetic: true });
    expect(
      (
        await adapter.freeBusy({
          timeMin: new Date("2026-09-01T00:00:00Z"),
          timeMax: new Date("2026-09-02T00:00:00Z"),
          calendarIds: ["primary"],
        })
      ).primary,
    ).toEqual([]);
  });

  it("requires live credentials and normalizes provider payloads", () => {
    expect(new GmailAdapter({ mode: "LIVE" }).health.status).toBe("BLOCKED");
    expect(new GoogleCalendarAdapter({ mode: "LIVE" }).health.status).toBe("BLOCKED");
    expect(
      normalizeGmailMessage({
        id: "m1",
        threadId: "t1",
        body: "reply",
        sentAt: "2026-09-01T10:00:00Z",
      }).fromParty,
    ).toBe("CANDIDATE");
    expect(
      normalizeCalendarEvent({
        id: "e1",
        start: "2026-09-01T10:00:00Z",
        end: "2026-09-01T11:00:00Z",
        attendees: ["b@example.com", "a@example.com"],
      }).attendeeEmails,
    ).toEqual(["a@example.com", "b@example.com"]);
  });

  it("keeps live provider calls behind the adapter and idempotency headers", async () => {
    const requests: Array<{
      input: string;
      init?: { method?: string; headers?: Record<string, string>; body?: string };
    }> = [];
    const fetcher = async (
      input: string,
      init?: { method?: string; headers?: Record<string, string>; body?: string },
    ) => {
      requests.push({ input, init });
      return {
        ok: true,
        status: 200,
        json: async () =>
          input.includes("freeBusy")
            ? { calendars: { primary: { busy: [] } } }
            : { id: "provider-1", threads: [] },
      };
    };
    const gmail = new GmailAdapter({ mode: "LIVE", accessToken: "token", fetcher });
    await gmail.listThreads("from:candidate@example.com");
    await gmail.sendApprovedMessage({
      to: "candidate@example.com",
      subject: "Next",
      body: "Hello",
      idempotencyKey: "message-2",
      approvedActionKey: "approval-3",
    });
    const calendar = new GoogleCalendarAdapter({ mode: "LIVE", accessToken: "token", fetcher });
    await calendar.freeBusy({
      timeMin: new Date("2026-09-01T00:00:00Z"),
      timeMax: new Date("2026-09-02T00:00:00Z"),
      calendarIds: ["primary"],
    });
    expect(requests).toHaveLength(3);
    expect(requests[1]?.init?.headers?.["X-RecruiterPal-Idempotency-Key"]).toBe("message-2");
    expect(requests[2]?.init?.method).toBe("POST");
  });
});

describe("deterministic recruiting signals", () => {
  const now = new Date("2026-09-01T12:00:00Z");

  it("calculates stage time and SLA breaches without inference", () => {
    expect(
      timeInStage(
        [{ applicationId: "a1", stage: "SCREEN", enteredAt: new Date("2026-09-01T08:00:00Z") }],
        now,
      )[0]?.durationHours,
    ).toBe(4);
    expect(countSlaBreaches([{ dueAt: new Date("2026-09-01T10:00:00Z") }], now)).toBe(1);
    expect(
      stageConversion([
        { fromStage: null, toStage: "APPLIED" },
        { fromStage: "APPLIED", toStage: "SCREEN" },
      ]),
    ).toEqual({
      APPLIED: { entered: 1, fromPriorStage: 0 },
      SCREEN: { entered: 1, fromPriorStage: 1 },
    });
  });

  it("surfaces evidence, conflict, risk, and capacity signals", () => {
    expect(evidenceCompleteness(["c1", "c2"], ["c1"])).toMatchObject({
      complete: 1,
      missing: ["c2"],
      ratio: 0.5,
    });
    expect(
      materialRatingDisagreements([
        { applicationId: "a1", competencyId: "c1", rating: 2 },
        { applicationId: "a1", competencyId: "c1", rating: 4 },
      ]),
    ).toHaveLength(1);
    expect(
      pipelineRisk({
        criticalExceptions: 1,
        overdueObligations: 1,
        incompleteReadiness: 0,
        unverifiedDeadlines: 0,
      }),
    ).toMatchObject({ level: "ELEVATED" });
    expect(
      interviewCapacity({
        availabilityWindows: [
          { startUtc: new Date("2026-09-01T14:00:00Z"), endUtc: new Date("2026-09-01T15:00:00Z") },
        ],
        interviewDurationMinutes: 45,
        minimumLeadTimeMinutes: 30,
        now,
      }),
    ).toMatchObject({ feasibleWindows: 1 });
  });
});
