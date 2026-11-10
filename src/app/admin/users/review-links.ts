// screen-spec-ADM095 §3 #7 / §5 #3 (#184): "Review submission → VER146", subtype and village checks. The targets are the
// review queues of the admin navigation (nav-model.ts): HDT reviews Agencies and views the Provider profile queue
// (UBND decides, PRF BR-005); UBND reviews the Provider profiles of its village. The queues check scope again.
export function reviewSubmissionLinks(adminType: string | null | undefined): Array<{ href: string; label: string }> {
  if (adminType === 'HDT') return [
    { href: '/admin/agencies', label: 'Duyệt Agency' },
    { href: '/admin/providers', label: 'Hồ sơ chờ thẩm định' },
  ]
  if (adminType === 'UBND') return [{ href: '/admin/providers', label: 'Duyệt hồ sơ' }]
  return []
}
