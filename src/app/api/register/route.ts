import { NextResponse } from 'next/server'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { registrationDelivery } from '@/lib/auth/registration-delivery'
import { RegistrationError, submitRegistration } from '@/lib/auth/registration-service'
import { registrationSchema } from '@/lib/auth/registration-validation'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const deliver = registrationDelivery()
    const form = await request.formData()
    const string = (name: string) => String(form.get(name) ?? '')
    const files = form.getAll('registration_documents').filter((item): item is File => typeof item !== 'string')
    if (!files.length || files.length > 5 || files.some(file => file.size > 5 * 1024 * 1024 || !file.size)) throw new RegistrationError('Upload 1–5 documents, up to 5 MB each.')
    const input = { full_name: string('full_name'), email: string('email'), password: string('password'), confirm_password: string('confirm_password'), company_name: string('company_name'), company_type: string('company_type'), tax_id: string('tax_id'), team_size: Number(string('team_size')), location: { street: string('location[street]'), ward: string('location[ward]'), district: string('location[district]'), city_province: string('location[city_province]') }, contact_information: { contact_person_name: string('contact_information[contact_person_name]'), phone_number: string('contact_information[phone_number]'), ...(string('contact_information[business_email]') ? { business_email: string('contact_information[business_email]') } : {}) }, tour_types: form.getAll('tour_types[]').map(String), registration_documents: files }
    const parsed = registrationSchema.safeParse(input)
    if (!parsed.success) return NextResponse.json({ is_valid: false, validation_errors: parsed.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 422 })
    const buffers = await Promise.all(files.map(async file => {
      const bytes = Buffer.from(await file.arrayBuffer())
      const pdf = bytes.subarray(0, 5).toString() === '%PDF-'
      const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      if (!(pdf || png || jpeg)) throw new RegistrationError('Documents must be PDF, JPEG or PNG.')
      return { bytes, name: file.name, type: pdf ? 'application/pdf' : png ? 'image/png' : 'image/jpeg' }
    }))
    const directory = join(process.cwd(), '.demo-data', 'registration-documents')
    mkdirSync(directory, { recursive: true })
    const metadata = buffers.map(file => {
      const id = randomUUID(), key = `registration-documents/${id}`
      writeFileSync(join(directory, id), file.bytes, { mode: 0o600 })
      return { file_id: id, storage_key: key, file_name: file.name, media_type: file.type, file_size_bytes: String(file.bytes.length), width_px: '', height_px: '', uploaded_by: '', created_at: new Date().toISOString() }
    })
    return NextResponse.json(await submitRegistration(parsed.data, metadata, deliver), { status: 201 })
  } catch (error) {
    return NextResponse.json({ is_valid: false, message: error instanceof RegistrationError ? error.message : 'Registration could not be completed.' }, { status: error instanceof RegistrationError ? error.status : 500 })
  }
}
