import React from 'react'
// ADM117 form fields (F-AUTH-19 HDT → UBND, F-AUTH-20 UBND → Provider), moved out of page.tsx so they
// can be render-tested. #161: every Required field (screen-spec-ADM117 Required = Yes) shows a visible
// "*" (hidden from screen readers) and aria-required; a legend explains it. Names, `required`,
// patterns and limits are unchanged.
//
// Village field (UBND form): a free-text input for the new village name. UBND ↔ Village is 1-to-1, so
// HDT types the village name and the backend creates the village record and the assignment atomically.
// First-login profile completion by the UBND user (personal info + village detail) is out of MVP scope;
// the village row is created with minimal required fields and is_active=false until a future step
// activates it. This gap is intentional — no UI or backend endpoint for UBND first-login onboarding
// exists in this sprint. Rule: the system must never expose an is_active=false village in public-facing
// pages (explore, provider list); the admin dashboard shows it scoped to the assigned UBND only.
export type CreateAccountOptions = { kind: string; villages: { village_id: string; name: string }[] }

const Mark = () => <span className="req-mark" aria-hidden="true"> *</span>

export default function CreateAccountFields({ options }: { options: CreateAccountOptions }) {
  return <>
    <p className="req-legend">* bắt buộc</p>
    <label><span>{options.kind === 'ubnd' ? 'Họ tên' : 'Tên hộ kinh doanh'}<Mark /></span><input name="name" required aria-required="true" maxLength={100}/></label>
    <label><span>Email<Mark /></span><input name="email" type="email" required aria-required="true"/></label>
    <label><span>Điện thoại<Mark /></span><input name="phone" required aria-required="true" pattern="\+?[0-9]{10,15}"/></label>
    {options.kind === 'ubnd'
      ? <label><span>Tên làng nghề<Mark /></span><input name="village_name" required aria-required="true" maxLength={255} placeholder="Nhập tên làng nghề mới"/><small>Hệ thống sẽ tạo mới hồ sơ làng. UBND tự bổ sung thông tin chi tiết sau khi đăng nhập lần đầu.</small></label>
      : <label><span>Làng nghề<Mark /></span><select name="village_id" required aria-required="true"><option value="">Chọn làng nghề</option>{options.villages.map(item => <option key={item.village_id} value={item.village_id}>{item.name}</option>)}</select></label>
    }
    {options.kind === 'provider' && <label><span>Địa chỉ<Mark /></span><input name="address" required aria-required="true" maxLength={500}/></label>}
    {/* #170: Contact (F-AUTH-20 element #10), Provider form only */}
    {options.kind === 'provider' && <label><span>Người liên hệ<Mark /></span><input name="contact_person_name" required aria-required="true" maxLength={100}/></label>}
    {options.kind === 'provider' && <label><span>Điện thoại liên hệ<Mark /></span><input name="contact_phone_number" required aria-required="true" pattern="\+?[0-9]{10,15}"/></label>}
  </>
}
