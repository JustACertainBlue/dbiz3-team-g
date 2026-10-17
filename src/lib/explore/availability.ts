import type { CsvRow } from './catalog';

type Interval = { start_at: string; end_at: string };
type PublicBlock = Interval & { status: string };
const DAY = 86_400_000;
const VIETNAM_OFFSET = 7 * 3_600_000;

function localDate(timestamp: number): string {
  return new Date(timestamp + VIETNAM_OFFSET).toISOString().slice(0, 10);
}

function localTimestamp(timestamp: number): string {
  return new Date(timestamp + VIETNAM_OFFSET).toISOString().slice(0, 19) + '+07:00';
}

function minutes(value: string): number {
  const [hour, minute, second] = value.split(':').map(Number);
  return hour * 60 + minute + (second || 0) / 60;
}

export function calculateAvailability(
  providerId: string,
  operatingHours: CsvRow[],
  bookings: CsvRow[],
  period: { from: string; to: string }
): { operating_hours: Array<{ weekday: number; local_start: string; local_end: string }>; available_slots: Interval[]; blocked_slots: PublicBlock[] } {
  const first = Date.parse(`${period.from}T00:00:00+07:00`);
  const last = Date.parse(`${period.to}T00:00:00+07:00`);
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first || last - first >= DAY * 31) {
    throw new RangeError('Invalid availability date range (maximum 31 days)');
  }
  const hours = operatingHours.filter(row => row.provider_id === providerId)
    .map(row => ({ weekday: Number(row.weekday), local_start: row.local_start, local_end: row.local_end }));
  const blocks = bookings.filter(row => row.provider_id === providerId && ['On hold', 'Booked'].includes(row.status))
    .map(row => ({ from: Date.parse(row.start_at), to: Date.parse(row.end_at), status: row.status }))
    .filter(block => Number.isFinite(block.from) && Number.isFinite(block.to) && block.to > first && block.from < last + DAY)
    .sort((a, b) => a.from - b.from);
  const available: Interval[] = [];
  for (let day = first; day <= last; day += DAY) {
    const weekday = (new Date(day + VIETNAM_OFFSET).getUTCDay() + 6) % 7 + 1;
    for (const hoursRow of hours.filter(row => row.weekday === weekday)) {
      const begin = day + minutes(hoursRow.local_start) * 60_000;
      const end = day + minutes(hoursRow.local_end) * 60_000;
      let cursor = begin;
      for (const block of blocks) {
        if (block.to <= cursor || block.from >= end) continue;
        if (block.from > cursor) available.push({ start_at: localTimestamp(cursor), end_at: localTimestamp(Math.min(block.from, end)) });
        cursor = Math.max(cursor, Math.min(block.to, end));
        if (cursor >= end) break;
      }
      if (cursor < end) available.push({ start_at: localTimestamp(cursor), end_at: localTimestamp(end) });
    }
  }
  return {
    operating_hours: hours,
    available_slots: available,
    blocked_slots: blocks.map(block => ({ start_at: localTimestamp(block.from), end_at: localTimestamp(block.to), status: block.status }))
  };
}

export function defaultAvailabilityPeriod(now = new Date()): { from: string; to: string } {
  const first = localDate(now.getTime());
  const last = localDate(now.getTime() + DAY * 29);
  return { from: first, to: last };
}
