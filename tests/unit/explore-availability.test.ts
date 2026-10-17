import { describe, expect, it } from 'vitest';
import { calculateAvailability } from '../../src/lib/explore/availability';

describe('EXP public availability from F-SCHED-09', () => {
  const hours = [{ provider_id: 'provider-1', weekday: '1', local_start: '08:00:00', local_end: '12:00:00' }];
  const period = { from: '2026-10-19', to: '2026-10-19' };

  it('subtracts every active Provider booking, including another Experience', () => {
    const result = calculateAvailability('provider-1', hours, [
      { provider_id: 'provider-1', experience_id: 'other', status: 'On hold', start_at: '2026-10-19T09:00:00+07:00', end_at: '2026-10-19T10:00:00+07:00' },
      { provider_id: 'provider-1', experience_id: 'selected', status: 'Booked', start_at: '2026-10-19T11:00:00+07:00', end_at: '2026-10-19T11:30:00+07:00' }
    ], period);
    expect(result.available_slots).toEqual([
      { start_at: '2026-10-19T08:00:00+07:00', end_at: '2026-10-19T09:00:00+07:00' },
      { start_at: '2026-10-19T10:00:00+07:00', end_at: '2026-10-19T11:00:00+07:00' },
      { start_at: '2026-10-19T11:30:00+07:00', end_at: '2026-10-19T12:00:00+07:00' }
    ]);
    expect(result.blocked_slots).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain('other');
  });

  it('ignores Cancelled/Completed bookings and has no availability without operating hours', () => {
    const old = [{ provider_id: 'provider-1', status: 'Cancelled', start_at: '2026-10-19T09:00:00+07:00', end_at: '2026-10-19T10:00:00+07:00' }];
    expect(calculateAvailability('provider-1', hours, old, period).available_slots).toEqual([
      { start_at: '2026-10-19T08:00:00+07:00', end_at: '2026-10-19T12:00:00+07:00' }
    ]);
    expect(calculateAvailability('provider-1', [], old, period).available_slots).toEqual([]);
  });
});
