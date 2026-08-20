from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta


@dataclass
class TimelinePhaseInput:
    hours: float
    bufferPercent: float


@dataclass
class TimelinePhaseResult:
    effectiveHours: float
    durationDays: int
    startDate: str
    endDate: str


def _parse_date(value: str) -> date:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def _is_working_day(d: date, working_days: list[int]) -> bool:
    # Python's date.weekday(): Monday=0..Sunday=6. The app's convention is
    # Sunday=0..Saturday=6 (matches JS Date#getDay), so convert.
    dow = (d.weekday() + 1) % 7
    return dow in working_days


def _next_working_day(d: date, working_days: list[int]) -> date:
    while not _is_working_day(d, working_days):
        d += timedelta(days=1)
    return d


def _advance_working_days(start: date, duration_days: int, working_days: list[int]) -> date:
    d = start
    remaining = duration_days - 1
    while remaining > 0:
        d += timedelta(days=1)
        if _is_working_day(d, working_days):
            remaining -= 1
    return d


def calculate_timeline(
    phases: list[TimelinePhaseInput],
    dev_start_date: str,
    hours_per_day: float,
    working_days: list[int],
) -> list[TimelinePhaseResult]:
    results: list[TimelinePhaseResult] = []
    cursor = _next_working_day(_parse_date(dev_start_date), working_days)

    for phase in phases:
        effective_hours = phase.hours * (1 + phase.bufferPercent / 100)
        duration_days = max(1, -(-effective_hours // hours_per_day))  # ceil division
        duration_days = int(duration_days)
        start = cursor
        end = _advance_working_days(start, duration_days, working_days)

        results.append(
            TimelinePhaseResult(
                effectiveHours=effective_hours,
                durationDays=duration_days,
                startDate=start.isoformat(),
                endDate=end.isoformat(),
            )
        )
        cursor = _next_working_day(end + timedelta(days=1), working_days)

    return results
