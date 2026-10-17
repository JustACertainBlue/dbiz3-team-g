import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { demoRuntime } from '../../../../lib/explore/demo-runtime';
import { loadExploreSeed } from '../../../../lib/explore/seed-repository';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Persistent EXP tracking integration is not configured' }, { status: 503 });
  let input: { demo_agency_id?: string; analytics_consent?: boolean };
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!input || typeof input !== 'object') return NextResponse.json({ error: 'Invalid session request' }, { status: 400 });
  const seed = loadExploreSeed();
  const viewer = resolveViewer(seed, input.demo_agency_id, true);
  const consent = input.analytics_consent === true;
  const engine = demoRuntime();
  const previous = engine.sessionFor(request.cookies.get('explore_session')?.value ?? '');
  const session = previous && previous.agency_id === (viewer.kind === 'agency' ? viewer.agencyId : null) &&
    (viewer.kind === 'agency' || previous.analytics_consent === consent) ? previous : engine.startSession(viewer, consent);
  const response = NextResponse.json({ session_id: session.session_id, tracking_scope: session.tracking_scope,
    ranking_version_id: session.ranking_version_id, results: engine.resultsFor(session.session_id) });
  response.cookies.set('explore_session', session.session_id, { httpOnly: true, sameSite: 'lax', path: '/', secure: false });
  return response;
}
