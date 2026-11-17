import { describe, expect, it } from 'vitest';
import { applyHardFilters } from '@/lib/ait/constraints';

describe('Booking status mapping in applyHardFilters', () => {
  const candidate = {
    id: 'exp-1',
    provider_id: 'provider-1',
    verification_status: 'verified' as const,
    published: true,
    max_participants: 20,
    price_per_person: 200000,
    notice_period_hours: 24,
    tags: [],
  };

  const profile = {
    hard_constraints: {
      group_size: 10,
      max_budget_per_person: 300000,
      target_date_or_range: { start_date: '2026-11-25' },
    },
    matching_attributes: [],
  };

  const now = Date.parse('2026-11-20T00:00:00+07:00');

  it('Case 1: Booking with status "On hold" occupies schedule and causes date_conflict', () => {
    const bookings = [
      {
        experience_id: 'exp-1',
        start_at: '2026-11-25T09:00:00+07:00',
        end_at: '2026-11-25T11:00:00+07:00',
        status: 'On hold',
      },
    ];

    const result = applyHardFilters({
      candidates: [candidate],
      profile,
      bookings,
      now,
    });

    expect(result.passed).toHaveLength(0);
    expect(result.rejected).toEqual([{ id: 'exp-1', reason: 'date_conflict' }]);
  });

  it('Case 2: Booking with status "Booked" occupies schedule and causes date_conflict', () => {
    const bookings = [
      {
        experience_id: 'exp-1',
        start_at: '2026-11-25T14:00:00+07:00',
        end_at: '2026-11-25T16:00:00+07:00',
        status: 'Booked',
      },
    ];

    const result = applyHardFilters({
      candidates: [candidate],
      profile,
      bookings,
      now,
    });

    expect(result.passed).toHaveLength(0);
    expect(result.rejected).toEqual([{ id: 'exp-1', reason: 'date_conflict' }]);
  });

  it('Case 3: Booking with status "Completed" occupies schedule for evaluated time slot', () => {
    const bookings = [
      {
        experience_id: 'exp-1',
        start_at: '2026-11-25T10:00:00+07:00',
        end_at: '2026-11-25T12:00:00+07:00',
        status: 'Completed',
      },
    ];

    const result = applyHardFilters({
      candidates: [candidate],
      profile,
      bookings,
      now,
    });

    expect(result.passed).toHaveLength(0);
    expect(result.rejected).toEqual([{ id: 'exp-1', reason: 'date_conflict' }]);
  });

  it('Case 4: Booking with status "Cancelled" DOES NOT occupy schedule and does not cause date_conflict', () => {
    const bookings = [
      {
        experience_id: 'exp-1',
        start_at: '2026-11-25T09:00:00+07:00',
        end_at: '2026-11-25T11:00:00+07:00',
        status: 'Cancelled',
      },
    ];

    const result = applyHardFilters({
      candidates: [candidate],
      profile,
      bookings,
      now,
    });

    expect(result.rejected).toHaveLength(0);
    expect(result.passed.map((p) => p.id)).toEqual(['exp-1']);
  });

  it('Case 5: Cancelled booking in lowercase ("cancelled") does not occupy schedule', () => {
    const bookings = [
      {
        experience_id: 'exp-1',
        start_at: '2026-11-25T09:00:00+07:00',
        end_at: '2026-11-25T11:00:00+07:00',
        status: 'cancelled',
      },
    ];

    const result = applyHardFilters({
      candidates: [candidate],
      profile,
      bookings,
      now,
    });

    expect(result.rejected).toHaveLength(0);
    expect(result.passed.map((p) => p.id)).toEqual(['exp-1']);
  });

  it('rejects a candidate with no operating-hours row for the requested weekday', () => {
    const result = applyHardFilters({
      candidates: [candidate],
      profile,
      bookings: [],
      operatingHours: [
        { provider_id: 'provider-1', weekday: 1, local_start: '08:00:00', local_end: '17:00:00' },
      ],
      now,
    });

    expect(result.passed).toHaveLength(0);
    expect(result.rejected).toEqual([{ id: 'exp-1', reason: 'operating_hours' }]);
  });
});
