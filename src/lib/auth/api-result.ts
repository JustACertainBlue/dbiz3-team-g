import { NextResponse } from 'next/server'
import { AuthError } from './lifecycle'
export async function authResult(work: () => unknown | Promise<unknown>) {
  try { return NextResponse.json(await work(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch (error) { return NextResponse.json({ error_message: error instanceof AuthError ? error.message : 'Không thể hoàn tất yêu cầu.', error: error instanceof AuthError ? error.message : 'Không thể hoàn tất yêu cầu.' }, { status: error instanceof AuthError ? error.status : 400 }) }
}
