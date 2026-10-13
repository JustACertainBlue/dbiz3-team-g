import { describe, expect, it } from 'vitest';
import { buildExplorePage } from '../../src/lib/explore/catalog';
import { loadExploreSeed } from '../../src/lib/explore/seed-repository';

describe('EXP US-1 canonical seed integration', () => {
  it('loads real Session 5 seed and excludes archived/ineligible Experiences', () => {
    const seed = loadExploreSeed();
    const result = buildExplorePage(seed, { viewer: { kind: 'guest' } });
    const ids = result.experience_cards.map(card => card.id);
    expect(ids).toContain('b70bd0fa-6a81-5aec-9ff6-5303210b2fad');
    expect(ids).not.toContain('800b5192-03c7-5953-849b-32a321e12a47');
    expect(result.pagination.total_count).toBe(5);
    expect(result.experience_cards.some(card => card.images.length > 0)).toBe(true);
    expect(result.experience_cards.every(card => card.price === null)).toBe(true);
  });
});
