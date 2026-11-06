import { authResult } from '@/lib/auth/api-result'
import { readResubmission, resubmitRegistration, AuthError } from '@/lib/auth/lifecycle'
import { saveRegistrationFiles } from '@/lib/auth/registration-files'
import { RegistrationError } from '@/lib/auth/registration-service'
export function GET(request: Request) { return authResult(() => readResubmission(new URL(request.url).searchParams.get('token') || '')) }
export function POST(request: Request) { return authResult(async () => {
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    const form = await request.formData(), token = String(form.get('token') || '')
    readResubmission(token)
    const data = JSON.parse(String(form.get('data') || '{}'))
    const files = form.getAll('registration_documents').filter((item): item is File => typeof item !== 'string')
    try { return resubmitRegistration(token, data, files.length ? await saveRegistrationFiles(files) : []) }
    catch (error) { if (error instanceof RegistrationError) throw new AuthError(error.message, error.status); throw error }
  }
  const body = await request.json(); return resubmitRegistration(String(body.token || ''), body.data)
}) }
