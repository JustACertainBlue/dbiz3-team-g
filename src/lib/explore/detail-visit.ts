export type DetailExitEvent = {
  action_type: 'view_detail';
  experience_id: string;
  duration_on_previous_screen: number;
};

/** Emit one completed detail visit, even if navigation and pagehide both fire. */
export function createDetailExitReporter(
  experienceId: string,
  enteredAt: number,
  send: (event: DetailExitEvent) => void,
  now: () => number = Date.now
) {
  let reported = false;
  return () => {
    if (reported) return false;
    reported = true;
    send({
      action_type: 'view_detail',
      experience_id: experienceId,
      duration_on_previous_screen: Math.max(0, Math.floor((now() - enteredAt) / 1000))
    });
    return true;
  };
}
