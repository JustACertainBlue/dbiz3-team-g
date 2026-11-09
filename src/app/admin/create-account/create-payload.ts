// ADM117 request body (F-AUTH-19 / F-AUTH-20). #170: the Provider form's "Người liên hệ" and
// "Điện thoại liên hệ" are sent as contact { contact_person_name, phone_number } (F-AUTH-20 contract).
export function createAccountPayload(entries: Record<string, unknown>, kind: string | undefined): Record<string, unknown> {
  const { contact_person_name, contact_phone_number, ...rest } = entries
  if (contact_person_name === undefined && contact_phone_number === undefined) return { ...rest, kind }
  return { ...rest, kind, contact: { contact_person_name, phone_number: contact_phone_number } }
}
