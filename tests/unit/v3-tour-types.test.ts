/**
 * One list of tour types for screen 17 (register) and screen 28 edit (PRF021). The source is what the server accepts:
 * TOUR_TYPES of src/lib/auth/registration-validation.ts (the registration schema). The PRF edit API takes any strings and the database
 * has no CHECK on the values. Every value that can be registered must also show and save on the edit page.
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
;(globalThis as { React?: typeof React }).React = React
import { PATCH as patchAgency, GET as getAgency } from '@/app/api/prf/agency/[agencyId]/route'
import { TOUR_TYPES, COMPANY_TYPES, registrationFields } from '@/lib/auth/registration-validation'
import { TOUR_LABELS } from '@/app/auth-v3/labels'
import CompanyEditView from '@/app/auth-v3/CompanyEditView'
import { agencyOwnerSession, demoCookie, SEED_IDS } from '../prf/helpers/mockSession'

const form = (tour_types: string[]) => ({ company_name: 'X', tax_id: '0107000002', company_type: 'Travel Agency', street: '', ward: '', district: '', city_province: '', description: '', team_size: 1, contact_person_name: 'A', phone_number: '0900000000', business_email: 'a@example.invalid', tour_types })
const edit = (tour_types: string[]) => renderToStaticMarkup(React.createElement(CompanyEditView, { form: form(tour_types), setForm: () => {}, saving: false, hydrated: true, message: null, onSubmit: () => {}, agencyId: 'a' }))

describe('tour types: one list', () => {
  it('the registration schema accepts every value of the constant', () => {
    const shape = (registrationFields as any).shape?.tour_types ?? (registrationFields as any)._def?.schema?.shape?.tour_types
    for (const type of TOUR_TYPES) expect(shape.safeParse([type]).success, type).toBe(true)
    expect(shape.safeParse(['Not a tour type']).success).toBe(false)
  })
  it('every registrable value shows on the edit page, with its Vietnamese label', () => {
    const html = edit([])
    for (const type of TOUR_TYPES) expect(html, type).toContain(TOUR_LABELS[type])
  })
  it('the edit page offers no value the registration would refuse', () => {
    const html = edit([])
    const boxes = html.match(/<input type="checkbox"/g) ?? []
    expect(boxes.length).toBe(TOUR_TYPES.length)
  })
  it('a value already stored but not in the list is kept visible and checked, not dropped', () => {
    const html = edit(['Eco-Tourism & Rural Gastronomy'])
    expect(html).toContain('Eco-Tourism &amp; Rural Gastronomy')
  })
  it('every registrable value saves through the edit API and reads back', async () => {
    const id = SEED_IDS.agency1
    const session = agencyOwnerSession(id)
    const request = (method: string, body?: unknown) => new Request(`http://localhost:3000/api/prf/agency/${id}`, { method, headers: { cookie: demoCookie(session), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    const saved = await patchAgency(request('PATCH', { tour_types: [...TOUR_TYPES] }), { params: { agencyId: id } })
    expect(saved.status).toBe(200)
    const read = await (await getAgency(request('GET'), { params: { agencyId: id } })).json()
    expect([...read.tour_types].sort()).toEqual([...TOUR_TYPES].sort())
  })
  it('company types on the edit page are the three the database accepts (no DMC)', () => {
    const html = edit([])
    for (const type of COMPANY_TYPES) expect(html).toContain(`value="${type}"`)
    expect(html).not.toContain('DMC')
  })
})
