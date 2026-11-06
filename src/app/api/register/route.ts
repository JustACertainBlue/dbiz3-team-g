import { NextResponse } from 'next/server'
import { saveRegistrationFiles } from '@/lib/auth/registration-files'
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
    if (!files.length || files.length > 5 || files.some(file => file.size > 10 * 1024 * 1024 || !file.size)) throw new RegistrationError('Upload 1–5 documents, up to 10 MB each.')
    const input = { full_name: string('full_name'), email: string('email'), password: string('password'), confirm_password: string('confirm_password'), company_name: string('company_name'), company_type: string('company_type'), tax_id: string('tax_id'), team_size: Number(string('team_size')), location: { street: string('location[street]'), ward: string('location[ward]'), district: string('location[district]'), city_province: string('location[city_province]') }, contact_information: { contact_person_name: string('contact_information[contact_person_name]'), phone_number: string('contact_information[phone_number]'), ...(string('contact_information[business_email]') ? { business_email: string('contact_information[business_email]') } : {}) }, tour_types: form.getAll('tour_types[]').map(String), registration_documents: files }
    const parsed = registrationSchema.safeParse(input)
    if (!parsed.success) return NextResponse.json({ is_valid: false, validation_errors: parsed.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) }, { status: 422 })
    const metadata = await saveRegistrationFiles(files)
    return NextResponse.json(await submitRegistration(parsed.data, metadata, deliver), { status: 201 })
  } catch (error) {
    return NextResponse.json({ is_valid: false, message: error instanceof RegistrationError ? error.message : 'Registration could not be completed.' }, { status: error instanceof RegistrationError ? error.status : 500 })
  }
}
