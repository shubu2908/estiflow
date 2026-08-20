export interface TimelinePhaseInput {
  hours: number;
  bufferPercent: number;
}

export interface TimelinePhaseResult {
  effectiveHours: number;
  durationDays: number;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
}

function isWorkingDay(date: Date, workingDays: number[]): boolean {
  return workingDays.includes(date.getUTCDay());
}

function toUtcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Returns the first working day on/after `date`. */
function nextWorkingDay(date: Date, workingDays: number[]): Date {
  let d = toUtcMidnight(date);
  while (!isWorkingDay(d, workingDays)) {
    d = addDays(d, 1);
  }
  return d;
}

/** Advances `durationDays` working days from `start` (inclusive), returning the last working day. */
function advanceWorkingDays(start: Date, durationDays: number, workingDays: number[]): Date {
  let d = toUtcMidnight(start);
  let remaining = durationDays - 1;
  while (remaining > 0) {
    d = addDays(d, 1);
    if (isWorkingDay(d, workingDays)) remaining -= 1;
  }
  return d;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Sequentially lays out phases starting from devStartDate, applying each phase's
 * buffer% to its hours, converting to working days via hoursPerDay, and walking
 * calendar dates while skipping non-working days.
 */
export function calculateTimeline(
  phases: TimelinePhaseInput[],
  devStartDate: string,
  hoursPerDay: number,
  workingDays: number[]
): TimelinePhaseResult[] {
  const results: TimelinePhaseResult[] = [];
  let cursor = nextWorkingDay(new Date(devStartDate), workingDays);

  for (const phase of phases) {
    const effectiveHours = phase.hours * (1 + phase.bufferPercent / 100);
    const durationDays = Math.max(1, Math.ceil(effectiveHours / hoursPerDay));
    const startDate = cursor;
    const endDate = advanceWorkingDays(startDate, durationDays, workingDays);

    results.push({
      effectiveHours,
      durationDays,
      startDate: toIsoDate(startDate),
      endDate: toIsoDate(endDate),
    });

    cursor = nextWorkingDay(addDays(endDate, 1), workingDays);
  }

  return results;
}
