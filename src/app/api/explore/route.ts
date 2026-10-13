import { NextRequest, NextResponse } from 'next/server';
import { buildExplorePage, resolveViewer } from '../../../lib/explore/catalog';
import { loadExploreSeed } from '../../../lib/explore/seed-repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function numericQuery(value: string | null, fallback: number): number {
  return value === null ? fallback : Number(value);
}

export async function GET(request: NextRequest) {
  const page = numericQuery(request.nextUrl.searchParams.get('page'), 1);
  const pageSize = numericQuery(request.nextUrl.searchParams.get('page_size'), 12);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
    return NextResponse.json({ error: 'Invalid page or page_size (1–50)' }, { status: 400 });
  }
  const seed = loadExploreSeed();
  const viewer = resolveViewer(seed, request.headers.get('x-demo-agency-id'), process.env.NODE_ENV !== 'production');
  return NextResponse.json(buildExplorePage(seed, { page, pageSize, viewer }));
}
