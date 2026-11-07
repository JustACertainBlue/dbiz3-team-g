export function providerCompletion(version: Record<string, unknown> | undefined, hasCertificate: boolean) {
  let contact:Record<string,unknown>={}
  try { contact=typeof version?.contact_information==='string'?JSON.parse(version.contact_information):{} }catch{}
  const checks: Array<[string,boolean]>=[['Tên xưởng',Boolean(version?.business_name)],['Nhóm nghề',Boolean(version?.craft_type)],['Số đăng ký kinh doanh',Boolean(version?.business_registration_number)],['Địa chỉ',Boolean(version?.location_address)],['Điện thoại',Boolean(contact.phone_number)],['Email liên hệ',Boolean(contact.business_email)],['Giấy đăng ký kinh doanh',hasCertificate]]
  const missing=checks.filter(([,complete])=>!complete).map(([label])=>label)
  return {percentage:Math.round(100*(checks.length-missing.length)/checks.length),missing,complete:missing.length===0}
}
