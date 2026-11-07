import { NextRequest, NextResponse } from 'next/server';
import { demoRuntime } from '../../../../lib/explore/demo-runtime';
import type { ExploreAction } from '../../../../lib/explore/learning';
import { sessionContextFromRequest } from '../../../../lib/auth/session';

export const runtime = 'nodejs';
const publicActions = new Set<ExploreAction>(['click_card', 'expand_preview', 'view_detail', 'apply_filter', 'scroll']);

export async function POST(request: NextRequest) {
  const sessionId = request.cookies.get('explore_session')?.value;
  if (!sessionId) return NextResponse.json({ error: 'Explore session is required' }, { status: 401 });
  let input: { event_id?: string; action_type?: ExploreAction; experience_id?: string; provider_id?: string;
    filter_values?: Record<string, string>; duration_on_previous_screen?: number };
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!input || typeof input !== 'object') return NextResponse.json({ error: 'Invalid interaction' }, { status: 400 });
  if (!input.event_id || typeof input.event_id !== 'string' || input.event_id.length>128 || !input.action_type || !publicActions.has(input.action_type)) {
    return NextResponse.json({ error: 'Unsupported Explore interaction' }, { status: 400 });
  }
  try {
    const engine = (await demoRuntime());
    const tracked=await engine.sessionFor(sessionId);
    const actor=await sessionContextFromRequest(request);
    if(tracked?.agency_id && (actor.role!=='Tour_Agency'||actor.agencyId!==tracked.agency_id))return NextResponse.json({error:'Explore session access denied'},{status:403});
    const result = (await engine.recordEvent(sessionId, { ...input, event_id: input.event_id, action_type: input.action_type }));
    return NextResponse.json({ ...result, results: result.results_refreshed_indicator ? (await engine.resultsFor(sessionId)) : undefined });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Explore interaction failed' }, { status: 400 });
  }
}
