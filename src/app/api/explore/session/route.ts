import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '../../../../lib/explore/catalog';
import { demoRuntime } from '../../../../lib/explore/demo-runtime';
import { loadExploreRuntime } from '../../../../lib/explore/seed-repository';
import { sessionContextFromRequest } from '../../../../lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let input: { analytics_consent?: boolean };
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!input || typeof input !== 'object') return NextResponse.json({ error: 'Invalid session request' }, { status: 400 });
  const seed = (await loadExploreRuntime());
  const account = (await sessionContextFromRequest(request));
  const viewer = resolveViewer(seed, account.role === 'Tour_Agency' ? account.agencyId : null, true);
  const consent = input.analytics_consent === true;
  const engine = (await demoRuntime());
  const previous = (await engine.sessionFor(request.cookies.get('explore_session')?.value ?? ''));
  const session = previous && previous.agency_id === (viewer.kind === 'agency' ? viewer.agencyId : null) &&
    (viewer.kind === 'agency' || previous.analytics_consent === consent) ? previous : (await engine.startSession(viewer, consent));
  const response = NextResponse.json({ session_id: session.session_id, tracking_scope: session.tracking_scope,
    ranking_version_id: session.ranking_version_id, results: (await engine.resultsFor(session.session_id)) });
  response.cookies.set('explore_session', session.session_id, { httpOnly: true, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' });
  return response;
}
