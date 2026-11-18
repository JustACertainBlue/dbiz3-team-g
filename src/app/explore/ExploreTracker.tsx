'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDetailExitReporter } from '../../lib/explore/detail-visit';
import RefreshedNotice from './RefreshedNotice';

type Action = 'click_card' | 'expand_preview' | 'view_detail' | 'apply_filter' | 'scroll';

// UI v3 Đợt 1 (human decision 2026-11-18 #10.1, docs/build/ui-v3-spec-deviations.md #6): no consent box. A Guest
// session runs with tracking_scope "No Non-essential Tracking" and the page sends no non-essential events; the
// Tour Agency keeps personalisation (F-EXPLORE-05).
export default function ExploreTracker({ demoAgencyId, detailExperienceId }: { demoAgencyId?: string; detailExperienceId?: string }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [refreshed, setRefreshed] = useState(false); // FR-010 indicator (#204)
  const enteredAt = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    fetch('/api/explore/session', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ analytics_consent: false }) })
      .then(response => { if (!response.ok) throw new Error('Session unavailable'); return response.json(); })
      .then(() => { if (alive) { setReady(true); router.refresh(); } })
      .catch(() => { if (alive) setReady(false); });
    return () => { alive = false; };
  }, [demoAgencyId, router]);

  useEffect(() => {
    if (!ready || !demoAgencyId) return;
    const reportDetail = detailExperienceId ? createDetailExitReporter(detailExperienceId, enteredAt.current, payload => {
      fetch('/api/explore/events', { method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ event_id: crypto.randomUUID(), ...payload }) }).catch(() => {});
    }) : undefined;
    const send = (action_type: Action, element?: Element) => {
      const experience_id = element?.getAttribute('data-exp-id') ?? undefined;
      const provider_id = element?.getAttribute('data-provider-id') ?? undefined;
      const category = element?.getAttribute('data-category') ?? undefined;
      fetch('/api/explore/events', { method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ event_id: crypto.randomUUID(), action_type, experience_id, provider_id,
          filter_values: category ? { category } : undefined,
          duration_on_previous_screen: Math.max(0, Math.floor((Date.now() - enteredAt.current) / 1000)) }) })
        .then(response => response.ok ? response.json() : null)
        .then(result => { if (result?.results_refreshed_indicator) { setRefreshed(true); router.refresh(); } })
        .catch(() => {});
    };
    const onClick = (event: MouseEvent) => {
      const element = (event.target as Element).closest('[data-exp-action]');
      const action = element?.getAttribute('data-exp-action') as Action | null;
      if (action && action !== 'expand_preview' && action !== 'scroll') send(action, element ?? undefined);
      const link = (event.target as Element).closest('a[href]') as HTMLAnchorElement | null;
      if (link && reportDetail && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        const target = new URL(link.href);
        if (target.href !== window.location.href) reportDetail();
      }
    };
    const onToggle = (event: Event) => {
      const element = event.target as HTMLDetailsElement;
      if (element.matches('details[data-exp-action="expand_preview"]') && element.open) send('expand_preview', element);
    };
    let lastScroll = 0;
    const onScroll = () => { const now = Date.now(); if (now - lastScroll > 5000) { lastScroll = now; send('scroll'); } };
    const onPageExit = () => { reportDetail?.(); };
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') reportDetail?.(); };
    document.addEventListener('click', onClick, true);
    document.addEventListener('toggle', onToggle, true);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onPageExit);
    window.addEventListener('popstate', onPageExit);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('toggle', onToggle, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onPageExit);
      window.removeEventListener('popstate', onPageExit);
    };
  }, [ready, router, detailExperienceId, demoAgencyId]);

  return <RefreshedNotice show={refreshed} />;
}
