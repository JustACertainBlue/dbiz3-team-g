import { describe, expect, it, vi } from 'vitest';
import { createDetailExitReporter } from '../../src/lib/explore/detail-visit';

describe('FR-006 detail visit timing', () => {
  it('reports one completed visit with the elapsed seconds when the page is left', () => {
    const send = vi.fn();
    const finish = createDetailExitReporter('experience-1', 1000, send, () => 61_000);

    expect(finish()).toBe(true);
    expect(finish()).toBe(false);
    expect(send).toHaveBeenCalledOnce();
    expect(send).toHaveBeenCalledWith({
      action_type: 'view_detail', experience_id: 'experience-1', duration_on_previous_screen: 60
    });
  });

  it('clamps an invalid negative elapsed time to zero', () => {
    const send = vi.fn();
    createDetailExitReporter('experience-1', 2000, send, () => 1000)();
    expect(send).toHaveBeenCalledWith({
      action_type: 'view_detail', experience_id: 'experience-1', duration_on_previous_screen: 0
    });
  });
});
