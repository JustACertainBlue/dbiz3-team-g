'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDetailExitReporter } from '../../lib/explore/detail-visit';

type Action = 'click_card' | 'expand_preview' | 'view_detail' | 'apply_filter' | 'scroll';

export default function ExploreTracker({ demoAgencyId, detailExperienceId }: { demoAgencyId?: string; detailExperienceId?: string }) {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  const enteredAt = useRef(Date.now());

  useEffect(() => { setConsent(localStorage.getItem('explore_analytics_consent') === 'yes'); }, []);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    let alive = true;
    fetch('/api/explore/session', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ demo_agency_id: demoAgencyId, analytics_consent: consent }) })
      .then(response => { if (!response.ok) throw new Error('Session unavailable'); return response.json(); })
      .then(() => { if (alive) { setReady(true); router.refresh(); } })
      .catch(() => { if (alive) setReady(false); });
    return () => { alive = false; };
  }, [demoAgencyId, consent, router]);

  useEffect(() => {
    if (!ready || process.env.NODE_ENV === 'production') return;
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
        .then(result => { if (result?.results_refreshed_indicator) router.refresh(); })
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
  }, [ready, router, detailExperienceId]);

  if (demoAgencyId) return null;
  return <aside className="consent-panel" aria-label="Tùy chọn phân tích">
    <label><input type="checkbox" checked={consent} onChange={event => {
      const value = event.target.checked; setConsent(value); localStorage.setItem('explore_analytics_consent', value ? 'yes' : 'no');
    }} /> Cho phép phân tích lượt xem ẩn danh để cải thiện danh mục</label>
  </aside>;
}
