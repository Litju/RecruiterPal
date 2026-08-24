/**
 * Deterministic scheduling feasibility. Pal may explain tradeoffs, but slot
 * validation always happens here.
 */

export interface AvailabilityWindow {
  readonly personId: string;
  readonly startUtc: Date;
  readonly endUtc: Date;
}

export interface SchedulingConstraints {
  readonly durationMinutes: number;
  /** Minimum minutes between now and the earliest bookable start. */
  readonly minLeadTimeMinutes: number;
  /** Minutes of buffer required around each participant's other events. */
  readonly bufferMinutes: number;
  readonly workingHoursUtc: { readonly startHour: number; readonly endHour: number };
  readonly workingDaysUtc: readonly number[]; // 0=Sun..6=Sat
}

export const DEFAULT_SCHEDULING_CONSTRAINTS: SchedulingConstraints = {
  durationMinutes: 60,
  minLeadTimeMinutes: 24 * 60,
  bufferMinutes: 15,
  workingHoursUtc: { startHour: 13, endHour: 22 },
  workingDaysUtc: [1, 2, 3, 4, 5],
};

export interface FeasibleSlot {
  readonly startUtc: Date;
  readonly endUtc: Date;
  readonly participantIds: readonly string[];
}

function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
  bufferMs = 0,
): boolean {
  return aStart.getTime() < bEnd.getTime() + bufferMs && bStart.getTime() - bufferMs < aEnd.getTime();
}

/**
 * Compute feasible interview slots where every required participant is
 * available simultaneously. Pure and deterministic; identical inputs produce
 * identical outputs.
 */
export function computeFeasibleSlots(params: {
  participantIds: readonly string[];
  busyWindows: Readonly<Record<string, readonly AvailabilityWindow[]>>;
  availability: Readonly<Record<string, readonly AvailabilityWindow[]>>;
  searchFrom: Date;
  searchUntil: Date;
  constraints?: SchedulingConstraints;
  stepMinutes?: number;
}): FeasibleSlot[] {
  const c = params.constraints ?? DEFAULT_SCHEDULING_CONSTRAINTS;
  const stepMs = (params.stepMinutes ?? 30) * 60_000;
  const slots: FeasibleSlot[] = [];
  const now = new Date(Math.min(params.searchFrom.getTime(), params.searchUntil.getTime()));
  const earliest = new Date(now.getTime() + c.minLeadTimeMinutes * 60_000);

  for (
    let t = Math.ceil(earliest.getTime() / stepMs) * stepMs;
    t + c.durationMinutes * 60_000 <= params.searchUntil.getTime();
    t += stepMs
  ) {
    const start = new Date(t);
    const end = new Date(t + c.durationMinutes * 60_000);
    if (!isWithinWorkingHours(start, end, c)) continue;

    const allAvailable = params.participantIds.every((pid) => {
      const windows = params.availability[pid] ?? [];
      const busy = params.busyWindows[pid] ?? [];
      const inWindow = windows.some((w) => w.startUtc <= start && w.endUtc >= end);
      if (windows.length > 0 && !inWindow) return false;
      return !busy.some((b) => overlaps(b.startUtc, b.endUtc, start, end, c.bufferMinutes * 60_000));
    });
    if (allAvailable) {
      slots.push({ startUtc: start, endUtc: end, participantIds: [...params.participantIds] });
      if (slots.length >= 20) break; // bounded output
    }
  }
  return slots;
}

function isWithinWorkingHours(start: Date, end: Date, c: SchedulingConstraints): boolean {
  const dayOk = c.workingDaysUtc.includes(start.getUTCDay());
  if (!dayOk) return false;
  const startH = start.getUTCHours() + start.getUTCMinutes() / 60;
  const endH = end.getUTCHours() + end.getUTCMinutes() / 60;
  return startH >= c.workingHoursUtc.startHour && endH <= c.workingHoursUtc.endHour;
}
